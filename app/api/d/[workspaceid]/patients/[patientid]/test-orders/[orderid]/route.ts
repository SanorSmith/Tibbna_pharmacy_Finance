import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  updateOpenEHRComposition,
  deleteOpenEHRComposition,
} from "@/lib/openehr/openehr";
import { TEST_PACKAGES, INDIVIDUAL_TESTS, LABORATORIES } from "@/lib/test-catalog";

/**
 * GET - Fetch full order details from OpenEHR with reverse-matched catalog IDs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string; orderid: string }> }
) {
  try {
    const { workspaceid, patientid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get EHR ID from patient record
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { getOpenEHRComposition, getOpenEHREHRBySubjectId } = await import("@/lib/openehr/openehr");

    // Try ehrid first, then fall back to lookup by nationalid / patientid
    let ehrId = patient.ehrid || null;
    if (!ehrId && patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }
    if (!ehrId) {
      return NextResponse.json({ error: "No EHR found for this patient" }, { status: 404 });
    }

    // Fetch full composition from OpenEHR
    const composition = await getOpenEHRComposition(ehrId, orderid) as Record<string, unknown>;

    // Extract fields from composition
    const serviceName = (composition["template_clinical_encounter_v1/service_request/request/service_name|other"] as string) || "";
    const description = (composition["template_clinical_encounter_v1/service_request/request/description"] as string) || "";
    const clinicalIndication = (composition["template_clinical_encounter_v1/service_request/request/clinical_indication"] as string) || "";
    const requestingProvider = (composition["template_clinical_encounter_v1/service_request/request/requesting_provider"] as string) || "";
    const receivingProvider = (composition["template_clinical_encounter_v1/service_request/request/receiving_provider"] as string) || "";
    const narrative = (composition["template_clinical_encounter_v1/service_request/narrative"] as string) || "";

    // Parse the description to extract structured info
    // Format: "Status: REQUESTED | Test Group: CBC | Category: Hematology | Laboratory: Hematology | Selected Tests (8): RBC, WBC, ... | Urgency: routine"
    // Strip "Status: REQUESTED | " prefix if present
    const cleanDescription = description.replace(/^Status:\s*\w+\s*\|\s*/, "");
    const parsed: Record<string, string> = {};
    cleanDescription.split("|").forEach((part: string) => {
      const trimmed = part.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        parsed[key] = value;
      }
    });

    const categoryFromDesc = parsed["Category"] || "";
    const labNameFromDesc = parsed["Laboratory"] || receivingProvider || "";
    // The key is "Selected Tests (N)" so find by prefix
    let testNamesFromDesc = "";
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("Selected Tests")) {
        testNamesFromDesc = value;
        break;
      }
    }
    const urgencyFromDesc = parsed["Urgency"] || "routine";

    // Reverse-match to find lab ID
    let matchedLabId = "";
    for (const [labId, lab] of Object.entries(LABORATORIES)) {
      if (lab.name === labNameFromDesc || lab.name === categoryFromDesc) {
        matchedLabId = labId;
        break;
      }
    }

    // Reverse-match to find package IDs from service_name
    const matchedPackageIds: string[] = [];
    const packageNamesInOrder = serviceName.split(",").map(n => n.trim());
    for (const [pkgId, pkg] of Object.entries(TEST_PACKAGES)) {
      if (packageNamesInOrder.some(name => pkg.name === name)) {
        matchedPackageIds.push(pkgId);
      }
    }

    // Reverse-match test IDs from test names in description
    const matchedTestIds: string[] = [];
    if (testNamesFromDesc) {
      const testNamesArr = testNamesFromDesc.split(",").map(n => n.trim());
      for (const [testId, test] of Object.entries(INDIVIDUAL_TESTS)) {
        if (testNamesArr.some(name => test.name === name)) {
          matchedTestIds.push(testId);
        }
      }
    }

    // If no tests matched from description, try to get them from matched packages
    if (matchedTestIds.length === 0 && matchedPackageIds.length > 0) {
      for (const pkgId of matchedPackageIds) {
        const pkg = TEST_PACKAGES[pkgId];
        if (pkg) {
          matchedTestIds.push(...pkg.tests);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        composition_uid: orderid,
        service_name: serviceName,
        description,
        clinical_indication: clinicalIndication,
        requesting_provider: requestingProvider,
        receiving_provider: receivingProvider,
        narrative,
        urgency: urgencyFromDesc,
        // Reverse-matched catalog data
        matched_lab_id: matchedLabId,
        matched_package_ids: matchedPackageIds,
        matched_test_ids: [...new Set(matchedTestIds)],
        // Raw parsed fields
        category: categoryFromDesc,
        lab_name: labNameFromDesc,
      },
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch order details" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update an existing test order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string; orderid: string }> }
) {
  try {
    const { workspaceid, patientid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can update test orders
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can update test orders" }, { status: 403 });
    }

    const body = await request.json();
    const { testOrder } = body;

    if (!testOrder) {
      return NextResponse.json({ error: "Test order data is required" }, { status: 400 });
    }

    // Get EHR ID from patient record (with fallback lookup)
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);
    
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    
    const { getOpenEHRComposition, getOpenEHREHRBySubjectId } = await import("@/lib/openehr/openehr");

    let ehrId = patient.ehrid || null;
    if (!ehrId && patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }
    if (!ehrId) {
      return NextResponse.json({ error: "No EHR found for this patient" }, { status: 404 });
    }

    const compositionId = orderid;
    
    console.log(`Updating order - EHR ID: ${ehrId}, Composition ID: ${compositionId}`);
    
    // Fetch the existing composition to get all fields
    const existingComposition = await getOpenEHRComposition(ehrId, compositionId) as Record<string, unknown>;

    // Update the composition fields with new data
    if (testOrder.clinical_indication) {
      existingComposition["template_clinical_encounter_v1/service_request/request/clinical_indication"] = testOrder.clinical_indication;
    }
    if (testOrder.service_name) {
      existingComposition["template_clinical_encounter_v1/service_request/request/service_name|other"] = testOrder.service_name;
    }
    if (testOrder.description) {
      existingComposition["template_clinical_encounter_v1/service_request/request/description"] = testOrder.description;
    }
    if (testOrder.requesting_provider) {
      existingComposition["template_clinical_encounter_v1/service_request/request/requesting_provider"] = testOrder.requesting_provider;
    }
    if (testOrder.receiving_provider) {
      existingComposition["template_clinical_encounter_v1/service_request/request/receiving_provider"] = testOrder.receiving_provider;
    }
    if (testOrder.narrative) {
      existingComposition["template_clinical_encounter_v1/service_request/narrative"] = testOrder.narrative;
    }

    const templateId = "template_clinical_encounter_v1";
    const result = await updateOpenEHRComposition(ehrId, compositionId, templateId, existingComposition);

    return NextResponse.json({
      success: true,
      message: "Test order updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating test order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update test order" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel a test order
 * Note: This doesn't actually delete the composition, but updates it with CANCELLED status
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string; orderid: string }> }
) {
  try {
    const { workspaceid, patientid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can cancel test orders
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can cancel test orders" }, { status: 403 });
    }

    // Get cancellation reason from request body
    const body = await request.json().catch(() => ({}));
    const cancellationReason = body.reason || "No reason provided";

    // Extract EHR ID and composition UUID from the orderid
    // Format: ehrId::compositionUuid::domain::version or just compositionUuid::domain::version
    const parts = orderid.split("::");
    
    // Determine if first part is EHR ID or composition UUID
    // If orderid has 4 parts, format is: ehrId::compositionUuid::domain::version
    // If orderid has 3 parts, format is: compositionUuid::domain::version
    let ehrId: string;
    let compositionUuid: string;
    
    if (parts.length >= 4) {
      ehrId = parts[0];
      compositionUuid = parts[1];
    } else if (parts.length === 3) {
      // The composition UID is the full versioned UID, extract EHR from patient
      compositionUuid = parts[0];
      // Get EHR ID from patient record
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.patientid, patientid))
        .limit(1);
      
      if (!patient.length || !patient[0].ehrid) {
        return NextResponse.json({ error: "Patient EHR not found" }, { status: 404 });
      }
      ehrId = patient[0].ehrid;
    } else {
      return NextResponse.json({ error: "Invalid order ID format" }, { status: 400 });
    }

    console.log(`Cancelling order - EHR ID: ${ehrId}, Composition UUID: ${compositionUuid}, Full Order ID: ${orderid}`);

    // Fetch the existing composition to get all fields
    const { getOpenEHRComposition } = await import("@/lib/openehr/openehr");
    const existingComposition = await getOpenEHRComposition(ehrId, orderid) as Record<string, unknown>;

    // Server-side authorization: only the ordering provider can cancel
    // Check both composer|name (set server-side from DB) and requesting_provider (set client-side from session)
    const composerName = (existingComposition["template_clinical_encounter_v1/composer|name"] as string) || "";
    const requestingProvider = (existingComposition["template_clinical_encounter_v1/service_request/request/requesting_provider"] as string) || "";
    const currentUserName = (user.name || user.email || "").toLowerCase().trim();

    const isComposer = composerName && composerName.toLowerCase().trim() === currentUserName;
    const isRequester = requestingProvider && requestingProvider.toLowerCase().trim() === currentUserName;
    const displayCreator = requestingProvider || composerName || "another provider";

    if (!isComposer && !isRequester && (composerName || requestingProvider)) {
      return NextResponse.json(
        { error: `Cancellation not permitted. This order was created by ${displayCreator}. Only the ordering provider can cancel.` },
        { status: 403 }
      );
    }

    // Update the narrative field with cancellation information
    const cancellationNarrative = `[CANCELLED] Reason: ${cancellationReason} | Cancelled by: ${user.name || user.email || "Unknown"} | Cancelled at: ${new Date().toISOString()}`;
    
    // Modify the existing composition with the new narrative
    existingComposition["template_clinical_encounter_v1/service_request/narrative"] = cancellationNarrative;

    const templateId = "template_clinical_encounter_v1";
    // Use the full versioned UID for the update with complete composition data
    await updateOpenEHRComposition(ehrId, orderid, templateId, existingComposition);

    return NextResponse.json({
      success: true,
      message: "Test order cancelled successfully",
      cancellationReason,
    });
  } catch (error) {
    console.error("Error cancelling test order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel test order" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import {
  getOpenEHREHRBySubjectId,
  createOpenEHRComposition,
  getOpenEHRTestOrdersWithCancelled,
} from "@/lib/openehr/openehr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination parameters from query string
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view test orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Use optimized AQL query to fetch test orders directly (including cancelled for doctors)
    const validTestOrders = await getOpenEHRTestOrdersWithCancelled(ehrId);

    // Apply pagination
    const totalFilteredCount = validTestOrders.length;
    const hasMore = offset + limit < totalFilteredCount;
    const paginatedTestOrders = validTestOrders.slice(offset, offset + limit);

    return NextResponse.json({ testOrders: paginatedTestOrders, hasMore });
  } catch (error) {
    console.error("Error fetching test orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch test orders" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
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

    // Only doctors and nurses can create test orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      service_name,
      description,
      clinical_indication,
      urgency,
      requesting_provider,
      receiving_provider,
      narrative,
      is_package,
      target_lab,
    } = body.testOrder;

    console.log("DEBUG: Received testOrder data:", body.testOrder);
    console.log("DEBUG: urgency value:", urgency);
    console.log("DEBUG: requesting_provider value:", requesting_provider);

    // Validate required fields
    if (!service_name || !clinical_indication) {
      return NextResponse.json(
        {
          error: "Service name and clinical indication are required",
        },
        { status: 400 }
      );
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Create composition data in FLAT format using template_clinical_encounter_v1
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v1/context/start_time":
        new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Add test order to composition using exact template paths
    const eventTime = new Date().toISOString();

    // Enhanced Service Request Details
    compositionData[
      "template_clinical_encounter_v1/service_request/request/service_name|other"
    ] = service_name;
    compositionData[
      "template_clinical_encounter_v1/service_request/request/description"
    ] = `Status: REQUESTED | ${description || ""}`;
    compositionData[
      "template_clinical_encounter_v1/service_request/request/clinical_indication"
    ] = clinical_indication;
    compositionData[
      "template_clinical_encounter_v1/service_request/request/requested_date"
    ] = eventTime;
    compositionData[
      "template_clinical_encounter_v1/service_request/request/requesting_provider"
    ] = requesting_provider || "Dr. Unknown";
    compositionData[
      "template_clinical_encounter_v1/service_request/request/receiving_provider"
    ] = receiving_provider || "Clinical Laboratory";

    // Store test order marker in the request_id - this is already working and supported
    compositionData[
      "template_clinical_encounter_v1/service_request/request/timing"
    ] = eventTime;
    compositionData[
      "template_clinical_encounter_v1/service_request/request_id"
    ] = `OrderId-${Date.now()}`;

    // Enhanced narrative with package/individual test info and target lab
    const enhancedNarrative =
      narrative ||
      `${
        is_package ? "Package" : "Individual"
      } test order: ${service_name} to ${target_lab || receiving_provider} (${
        urgency || "routine"
      }) ordered due to ${clinical_indication}` +
        (description ? `\n\nTest Details: ${description}` : "");
    compositionData[
      "template_clinical_encounter_v1/service_request/narrative"
    ] = enhancedNarrative;
    compositionData[
      "template_clinical_encounter_v1/service_request/language|code"
    ] = "en";
    compositionData[
      "template_clinical_encounter_v1/service_request/language|terminology"
    ] = "ISO_639-1";
    compositionData[
      "template_clinical_encounter_v1/service_request/encoding|code"
    ] = "UTF-8";
    compositionData[
      "template_clinical_encounter_v1/service_request/encoding|terminology"
    ] = "IANA_character-sets";

    console.log(
      "Creating test order composition with data:",
      JSON.stringify(compositionData, null, 2)
    );

    // Create the composition in OpenEHR using v1 template
    const compositionId = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    console.log(`Created test order composition: ${compositionId}`);

    return NextResponse.json({
      success: true,
      compositionId,
      message: "Test order created successfully",
    });
  } catch (error) {
    console.error("Error creating test order:", error);
    return NextResponse.json(
      { error: "Failed to create test order" },
      { status: 500 }
    );
  }
}

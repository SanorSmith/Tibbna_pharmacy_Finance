import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateOpenEHRComposition } from "@/lib/openehr/openehr";
import { ensurePatientEHR } from "@/lib/openehr/ensure-ehr";

/**
 * PATCH /api/d/[workspaceid]/patients/[patientid]/prescriptions/[compositionuid]
 * Update an existing prescription/medication order in OpenEHR
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string; compositionuid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid, compositionuid } = await params;

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can update prescriptions
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can update prescriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prescription } = body;

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription data is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (
      !prescription.medicationItem ||
      !prescription.route ||
      !prescription.doseAmount ||
      !prescription.doseUnit ||
      !prescription.timingDirections
    ) {
      return NextResponse.json(
        {
          error:
            "Prescription must have: medication item, route, dose amount, dose unit and timing directions",
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

    // Ensure patient has an EHR
    const ehrId = await ensurePatientEHR(patientid);

    // Get the original composition to preserve the start_time
    const { getOpenEHRComposition } = await import("@/lib/openehr/openehr");
    let originalStartTime = new Date().toISOString();
    try {
      const originalComposition: any = await getOpenEHRComposition(ehrId, compositionuid);
      // Extract start_time from the original composition
      if (originalComposition?.content?.["template_clinical_encounter_v1/context/start_time"]) {
        originalStartTime = originalComposition.content["template_clinical_encounter_v1/context/start_time"];
      } else if (originalComposition?.["template_clinical_encounter_v1/context/start_time"]) {
        originalStartTime = originalComposition["template_clinical_encounter_v1/context/start_time"];
      }
    } catch (error) {
      console.error("Could not fetch original composition, using current time:", error);
    }

    // Build FLAT composition data for medication_order section using v1 template
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/context/start_time":
        originalStartTime, // Use preserved timestamp
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/composer|name":
        user.name || user.email || "Unknown",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Core medication order fields
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/medication_item"
    ] = prescription.medicationItem;
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/route:0"
    ] = prescription.route;
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/timing"
    ] = prescription.timingDirections;

    // Overall directions (narrative dosage)
    const overallDirectionsParts: string[] = [];
    if (prescription.doseAmount && prescription.doseUnit) {
      overallDirectionsParts.push(
        `${prescription.doseAmount} ${prescription.doseUnit}`
      );
    }
    if (prescription.route) {
      overallDirectionsParts.push(prescription.route);
    }
    if (prescription.timingDirections) {
      overallDirectionsParts.push(prescription.timingDirections);
    }
    if (prescription.directionDuration) {
      overallDirectionsParts.push(`for ${prescription.directionDuration}`);
    }

    const overallDirections = overallDirectionsParts.join(", ");

    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/overall_directions_description"
    ] = overallDirections;

    if (prescription.additionalInstruction) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/additional_instruction:0"
      ] = prescription.additionalInstruction;
    }

    if (prescription.clinicalIndication) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/clinical_indication:0"
      ] = prescription.clinicalIndication;
    }

    if (prescription.maximumDoseAmount) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|magnitude"
      ] = Number(prescription.maximumDoseAmount);
    }
    if (prescription.maximumDoseUnit) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|unit"
      ] = prescription.maximumDoseUnit;
    }

    if (prescription.dispenseInstruction) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/dispense_directions/dispense_instruction:0"
      ] = prescription.dispenseInstruction;
    }

    // Encode extended metadata into a structured comment (same format as POST endpoint)
    const commentParts: string[] = [];
    if (prescription.productName) {
      commentParts.push(`Product name: ${prescription.productName}`);
    }
    if (prescription.activeIngredient) {
      commentParts.push(`Active ingredient: ${prescription.activeIngredient}`);
    }
    if (prescription.usage) {
      commentParts.push(`Usage: ${prescription.usage}`);
    }
    if (prescription.validUntil) {
      commentParts.push(`Valid until: ${prescription.validUntil}`);
    }
    if (prescription.additionalInstruction) {
      commentParts.push(`Instructions: ${prescription.additionalInstruction}`);
    }
    if (prescription.comment) {
      commentParts.push(prescription.comment);
    }
    if (commentParts.length > 0) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/comment"
      ] = commentParts.join(" | ");
    }

    // Narrative field
    compositionData[
      "template_clinical_encounter_v1/medication_order/narrative"
    ] =
      prescription.comment ||
      overallDirections ||
      `Prescription for ${prescription.medicationItem}`;

    // Update the composition in OpenEHR
    const updatedCompositionUid = await updateOpenEHRComposition(
      ehrId,
      compositionuid,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json(
      {
        message: "Prescription updated successfully in OpenEHR",
        composition_uid: updatedCompositionUid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /prescriptions/[compositionuid]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update prescription in OpenEHR" },
      { status: 500 }
    );
  }
}

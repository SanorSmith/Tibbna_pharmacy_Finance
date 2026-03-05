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
  getOpenEHRPrescriptions,
} from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Retrieve prescription/medication orders for a patient from OpenEHR via AQL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and pharmacists can view prescriptions
    if (membership.role !== "doctor" && membership.role !== "pharmacist" && membership.role !== "administrator") {
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
      return NextResponse.json({ prescriptions: [] }, { status: 200 });
    }

    const prescriptions = await getOpenEHRPrescriptions(ehrId);
  

    return NextResponse.json({ prescriptions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Create a new prescription/medication order in OpenEHR (clinical encounter template)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can create prescriptions
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can create prescriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prescription } = body as {
      // align with MedsTab form shape
      prescription: {
        medicationItem: string;
        medicationItemCode?: string;
        productName?: string;
        activeIngredient?: string;
        usage?: string;
        validUntil?: string;
        doseAmount: string;
        doseUnit: string;
        route: string;
        timingDirections: string;
        directionDuration?: string;
        asRequired?: boolean;
        asRequiredCriterion?: string;
        additionalInstruction?: string;
        clinicalIndication?: string;
        maximumDoseAmount?: string;
        maximumDoseUnit?: string;
        dispenseInstruction?: string;
        comment?: string;
      };
    };

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription data is required" },
        { status: 400 }
      );
    }

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
            "Medication item, route, dose amount, dose unit and timing directions are required",
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

    // Build FLAT composition data for medication_order section using v1 template
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name":
        user.name || user.email || "Unknown",
      "template_clinical_encounter_v1/context/start_time":
        new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
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
    if (prescription.directionDuration) {
      overallDirectionsParts.push(`for ${prescription.directionDuration}`);
    }
    if (prescription.asRequired) {
      overallDirectionsParts.push(
        `PRN${
          prescription.asRequiredCriterion
            ? ` ${prescription.asRequiredCriterion}`
            : ""
        }`
      );
    }

    const overallDirections = overallDirectionsParts.join(", ");

    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/overall_directions_description"
    ] = overallDirections;

    // NOTE: The current clinical encounter template in EHRbase does not
    // accept explicit FLAT paths for `as_required` or `direction_duration`
    // on medication_order. We encode those semantics only into the
    // overall_directions_description/narrative instead of sending the
    // dedicated fields, to avoid 400 "Could not consume Parts" errors.

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

    // Encode extended metadata into a structured comment so that
    // getOpenEHRPrescriptions can parse it back out and the UI can
    // show a rich details view.
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
    if (membership.workspace?.name) {
      commentParts.push(`Issued from: ${membership.workspace.name}`);
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
      "Prescription created from clinical encounter";

    const compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json(
      {
        message: "Prescription created successfully in OpenEHR",
        composition_uid: compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { error: "Failed to create prescription" },
      { status: 500 }
    );
  }
}

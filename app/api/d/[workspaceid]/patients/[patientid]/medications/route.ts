import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import { queryOpenEHR } from "@/lib/openehr/openehr";

interface MedicationEvent {
  time: string;
  medication_item: string;
  action_state: string;
  route: string;
  quantity: number;
  unit: string;
  batch_number: string;
  expiry_date: string;
  substitution_performed: string;
  comment: string;
  composer: string;
  composition_uid: string;
}

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/medications
 * Retrieve complete medication history for a patient from OpenEHR
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

    // Fetch patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!patient.nationalid) {
      return NextResponse.json({ error: "Patient has no national ID" }, { status: 400 });
    }

    // Query OpenEHR for medication events
    const aqlQuery = `
      SELECT
        a/time/value as time,
        a/description[at0017]/items[at0020]/value/value as medication_item,
        a/ism_transition/current_state/value as action_state,
        a/description[at0017]/items[at0021]/value/value as route,
        a/description[at0017]/items[at0131]/items[at0134]/value/magnitude as quantity,
        a/description[at0017]/items[at0131]/items[at0134]/value/units as unit,
        a/description[at0017]/items[at0104]/items[at0135]/value/value as batch_number,
        a/description[at0017]/items[at0104]/items[at0136]/value/value as expiry_date,
        a/description[at0017]/items[at0132]/items[at0133]/value/value as substitution_performed,
        a/description[at0017]/items[at0024]/value/value as comment,
        c/composer/name as composer,
        c/uid/value as composition_uid
      FROM EHR e[ehr_id/value='${patient.nationalid}']
      CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.medication_dispense.v1]
      CONTAINS ACTION a[openEHR-EHR-ACTION.medication.v1]
      ORDER BY a/time/value DESC
    `;

    const medicationEvents = await queryOpenEHR<MedicationEvent>(aqlQuery);

    // Group events by medication
    const medicationTimeline = medicationEvents.reduce((acc, event) => {
      const medName = event.medication_item || "Unknown Medication";
      if (!acc[medName]) {
        acc[medName] = [];
      }
      acc[medName].push({
        time: event.time,
        actionState: event.action_state,
        route: event.route,
        quantity: event.quantity,
        unit: event.unit,
        batchNumber: event.batch_number,
        expiryDate: event.expiry_date,
        substitutionPerformed: event.substitution_performed,
        comment: event.comment,
        composer: event.composer,
        compositionUid: event.composition_uid,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Get current active medications
    const activeMedications = medicationEvents.filter(
      (event) => event.action_state === "Prescription dispensed" || event.action_state === "Medication course commenced"
    );

    return NextResponse.json({
      patientId: patientid,
      patientName: `${patient.firstname} ${patient.lastname}`,
      nationalId: patient.nationalid,
      totalEvents: medicationEvents.length,
      activeMedications: activeMedications.length,
      timeline: medicationTimeline,
      events: medicationEvents,
    });

  } catch (error) {
    console.error("Error fetching medication history:", error);
    return NextResponse.json(
      { error: "Failed to fetch medication history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

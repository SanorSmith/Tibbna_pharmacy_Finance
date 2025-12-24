import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients, staff } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { 
  getOpenEHREHRBySubjectId,
  getOpenEHRCompositions,
  getOpenEHRComposition
} from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/doctor/referrals
 * Retrieve incoming and outgoing referrals for the current doctor
 * Uses the same approach as patient referrals endpoint (which works in ~3 seconds)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    console.log("[Doctor Referrals] API called for workspace:", workspaceid, "limit:", limit, "offset:", offset);
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[Doctor Referrals] User:", user.email);

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden - Doctor access only" }, { status: 403 });
    }

    // Get doctor's name from staff record
    let doctorRecord = await db
      .select()
      .from(staff)
      .where(eq(staff.email, user.email))
      .limit(1);

    if (doctorRecord.length === 0) {
      doctorRecord = await db
        .select()
        .from(staff)
        .where(and(eq(staff.workspaceid, workspaceid), eq(staff.role, "doctor")))
        .limit(1);
    }

    const doctorFullName = doctorRecord.length > 0
      ? `${doctorRecord[0].firstname} ${doctorRecord[0].lastname}`
      : user.name || user.email;
    
    console.log("[Doctor Referrals] Doctor name:", doctorFullName);

    // Get patients with pagination support
    const recentPatients = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
      })
      .from(patients)
      .where(eq(patients.workspaceid, workspaceid))
      .limit(limit)
      .offset(offset);

    console.log("[Doctor Referrals] Checking", recentPatients.length, "patients (limit:", limit, "offset:", offset, ")");

    const incomingReferrals: Array<{
      composition_uid: string;
      recorded_time: string;
      physician_department: string;
      receiving_physician: string;
      clinical_indication: string;
      urgency: string;
      comment: string;
      referred_by: string;
      status: string;
      patientid: string;
      patientName: string;
      patientNationalId: string;
    }> = [];
    const outgoingReferrals: Array<{
      composition_uid: string;
      recorded_time: string;
      physician_department: string;
      receiving_physician: string;
      clinical_indication: string;
      urgency: string;
      comment: string;
      referred_by: string;
      status: string;
      patientid: string;
      patientName: string;
      patientNationalId: string;
    }> = [];

    // Process each patient (limited to 10 for speed)
    for (const patient of recentPatients) {
      try {
        // Get EHR ID
        let ehrId = patient.nationalid 
          ? await getOpenEHREHRBySubjectId(patient.nationalid)
          : null;
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patient.patientid);
        }
        if (!ehrId) continue;

        // Get compositions for this patient
        const compositions = await getOpenEHRCompositions(ehrId);
        
        // Check each composition for referrals
        for (const comp of compositions.slice(0, 5)) { // Limit to 5 most recent
          try {
            const details = await getOpenEHRComposition(ehrId, comp.composition_uid) as Record<string, unknown>;
            
            // Check if it's a referral (v1 template)
            const problemDiagnosis = details["template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"] as string || "";
            if (!problemDiagnosis.startsWith("REFERRAL:")) continue;

            const clinicalDescription = details["template_clinical_encounter_v1/problem_diagnosis/clinical_description"] as string || "";
            const [department, receivingPhysician] = clinicalDescription.split(" | ");
            const composer = details["template_clinical_encounter_v1/composer|name"] as string || "Unknown";
            
            const referral = {
              composition_uid: comp.composition_uid,
              recorded_time: comp.start_time,
              physician_department: department || "",
              receiving_physician: receivingPhysician || "",
              clinical_indication: problemDiagnosis.replace("REFERRAL: ", ""),
              urgency: (details["template_clinical_encounter_v1/problem_diagnosis/variant:0"] as string || "routine").toLowerCase(),
              comment: details["template_clinical_encounter_v1/problem_diagnosis/comment"] as string || "",
              referred_by: composer,
              status: details["template_clinical_encounter_v1/problem_diagnosis/body_site:0"] as string || "pending",
              patientid: patient.patientid,
              patientName: `${patient.firstname} ${patient.lastname}`,
              patientNationalId: patient.nationalid || patient.patientid,
            };

            // Categorize as incoming or outgoing
            if (receivingPhysician && receivingPhysician.includes(doctorFullName)) {
              incomingReferrals.push(referral);
            } else if (composer.includes(doctorFullName)) {
              outgoingReferrals.push(referral);
            }
          } catch {
            // Skip failed compositions
            continue;
          }
        }
      } catch {
        // Skip patients with EHR errors
        continue;
      }
    }

    console.log("[Doctor Referrals] Found", incomingReferrals.length, "incoming,", outgoingReferrals.length, "outgoing");

    // Get total patient count for pagination
    const totalPatientsResult = await db
      .select({ count: patients.patientid })
      .from(patients)
      .where(eq(patients.workspaceid, workspaceid));
    
    const totalPatients = totalPatientsResult.length;
    const hasMore = offset + limit < totalPatients;

    return NextResponse.json({ 
      incomingReferrals, 
      outgoingReferrals,
      pagination: {
        limit,
        offset,
        hasMore,
        totalPatients
      }
    }, { status: 200 });
  } catch (error) {
    console.error("[Doctor Referrals] Error:", error);
    return NextResponse.json({ 
      incomingReferrals: [], 
      outgoingReferrals: [],
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 200 });
  }
}

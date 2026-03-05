import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, getOpenEHRReferrals } from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/referrals
 * Retrieve referral records for all patients in a workspace from OpenEHR
 * This eliminates N+1 queries when fetching referrals for notifications
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view referrals
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all patients in the workspace
    const allPatients = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
      })
      .from(patients)
      .where(eq(patients.workspaceid, workspaceid));

    if (allPatients.length === 0) {
      return NextResponse.json({ referrals: [] }, { status: 200 });
    }

    // Fetch referrals for all patients in parallel
    const referralPromises = allPatients.map(async (patient) => {
      try {
        // Find EHR by National ID or patient UUID
        let ehrId: string | null = null;
        if (patient.nationalid) {
          ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
        }
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patient.patientid);
        }

        if (!ehrId) {
          return []; // No EHR found for this patient
        }

        const referrals = await getOpenEHRReferrals(ehrId);
        
        // Add patient info to each referral
        return referrals.map(referral => ({
          ...referral,
          patientid: patient.patientid,
          patientName: `${patient.firstname} ${patient.lastname}`,
          patientNationalId: patient.nationalid || patient.patientid,
        }));
      } catch (error) {
        console.error(`Error fetching referrals for patient ${patient.patientid}:`, error);
        return []; // Return empty array for this patient on error
      }
    });

    // Wait for all referral requests to complete
    const allReferralResults = await Promise.all(referralPromises);
    
    // Flatten all referral arrays into a single array
    const allReferrals = allReferralResults.flat();

    return NextResponse.json({ referrals: allReferrals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bulk referrals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

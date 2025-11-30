import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, getOpenEHRCompositions, getOpenEHRComposition } from "@/lib/openehr/openehr";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  const { workspaceid, patientid } = await params;
  
  // Require authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has access to this workspace
  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    // Fetch patient from database
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Try to find EHR by National ID first, then by patient UUID
    let ehrId: string | null = null;
    
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ 
        encounters: [],
        message: "No EHR found for this patient"
      });
    }

    // Fetch all compositions (encounters) for this EHR
    const compositions = await getOpenEHRCompositions(ehrId);

    // Fetch full details for each composition to get vitals data
    const encountersWithDetails = await Promise.all(
      compositions.map(async (comp) => {
        try {
          const fullComposition = await getOpenEHRComposition(ehrId, comp.composition_uid);
          return {
            ...comp,
            details: fullComposition,
          };
        } catch (error) {
          console.error(`Failed to fetch composition ${comp.composition_uid}:`, error);
          return {
            ...comp,
            details: null,
          };
        }
      })
    );

    return NextResponse.json({
      ehrId,
      encounters: encountersWithDetails,
    });
  } catch (error) {
    console.error("Error fetching patient encounters:", error);
    return NextResponse.json(
      { error: "Failed to fetch encounters" },
      { status: 500 }
    );
  }
}

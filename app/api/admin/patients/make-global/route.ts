/**
 * API: /api/admin/patients/make-global
 * - POST: Convert existing workspace patients to global patients
 * - GET: List patients that can be made global
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, workspaces } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : 
                          (typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : []);
    
    const isAdmin = userPermissions.includes('admin');
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get patients that are currently workspace-specific
    const workspacePatients = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
        workspaceid: patients.workspaceid,
        workspaceName: workspaces.name,
        createdat: patients.createdat,
      })
      .from(patients)
      .leftJoin(workspaces, eq(patients.workspaceid, workspaces.workspaceid))
      .where(and(
        eq(patients.workspaceid, patients.workspaceid), // Not null
        isNull(patients.workspaceid).not() // Explicitly not null
      ))
      .orderBy(patients.createdat);

    // Group by workspace for better organization
    const patientsByWorkspace = workspacePatients.reduce((acc, patient) => {
      const workspaceName = patient.workspaceName || "Unknown Workspace";
      if (!acc[workspaceName]) {
        acc[workspaceName] = [];
      }
      acc[workspaceName].push(patient);
      return acc;
    }, {} as Record<string, typeof workspacePatients>);

    return NextResponse.json({
      totalWorkspacePatients: workspacePatients.length,
      patientsByWorkspace,
      summary: {
        totalWorkspaces: Object.keys(patientsByWorkspace).length,
        patientsPerWorkspace: Object.fromEntries(
          Object.entries(patientsByWorkspace).map(([name, patients]) => [name, patients.length])
        )
      }
    });
  } catch (e: any) {
    console.error("[make-global-patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : 
                          (typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : []);
    
    const isAdmin = userPermissions.includes('admin');
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { patientIds, workspaceId, makeAllGlobal = false } = body;

    let updatedPatients = [];

    if (makeAllGlobal) {
      // Make ALL patients global
      const [result] = await db
        .update(patients)
        .set({ workspaceid: null })
        .where(and(
          eq(patients.workspaceid, patients.workspaceid), // Not null
          isNull(patients.workspaceid).not() // Explicitly not null
        ))
        .returning();

      updatedPatients = result;
    } else if (patientIds && Array.isArray(patientIds)) {
      // Make specific patients global
      for (const patientId of patientIds) {
        const [updated] = await db
          .update(patients)
          .set({ workspaceid: null })
          .where(eq(patients.patientid, patientId))
          .returning();
        
        if (updated) {
          updatedPatients.push(updated);
        }
      }
    } else if (workspaceId) {
      // Make all patients in a specific workspace global
      const [result] = await db
        .update(patients)
        .set({ workspaceid: null })
        .where(eq(patients.workspaceid, workspaceId))
        .returning();

      updatedPatients = result;
    } else {
      return NextResponse.json(
        { error: "Must provide patientIds, workspaceId, or makeAllGlobal=true" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Successfully made ${updatedPatients.length} patients global`,
      updatedCount: updatedPatients.length,
      updatedPatients: updatedPatients.slice(0, 10), // Return first 10 for preview
    });
  } catch (e: any) {
    console.error("[make-global-patients][POST] error:", e);
    return NextResponse.json({ error: "Failed to make patients global" }, { status: 500 });
  }
}

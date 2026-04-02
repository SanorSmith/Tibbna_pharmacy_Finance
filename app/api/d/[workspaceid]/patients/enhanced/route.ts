/**
 * Enhanced Workspace Patient API: /api/d/[workspaceid]/patients/enhanced
 * - GET: List patients (workspace-specific + global patients)
 * - POST: Create patient (workspace-specific or global)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, workspaces } from "@/lib/db/schema";
import { eq, ilike, or, and, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search");
    const includeGlobal = searchParams.get("includeGlobal") === "true";

    // Build query conditions
    const conditions = [
      // Always include workspace-specific patients
      eq(patients.workspaceid, workspaceid)
    ];
    
    // Add global patients if requested
    if (includeGlobal) {
      conditions.push(isNull(patients.workspaceid));
    }

    // Add search filter if provided
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchPattern = `%${searchTerm.trim()}%`;
      const searchCondition = or(
        ilike(patients.firstname, searchPattern),
        ilike(patients.lastname, searchPattern),
        ilike(patients.nationalid, searchPattern)
      )!;
      
      // Apply search to all patient types
      const finalConditions = includeGlobal 
        ? [and(or(...conditions), searchCondition)]
        : [and(eq(patients.workspaceid, workspaceid), searchCondition)];
      
      conditions.splice(0, conditions.length, ...finalConditions);
    }

    // Fetch patients with workspace info
    const rows = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        middlename: patients.middlename,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
        bloodgroup: patients.bloodgroup,
        phone: patients.phone,
        email: patients.email,
        address: patients.address,
        ehrid: patients.ehrid,
        medicalhistory: patients.medicalhistory,
        createdat: patients.createdat,
        updatedat: patients.updatedat,
        workspaceid: patients.workspaceid,
        workspaceName: workspaces.name,
        isGlobal: isNull(patients.workspaceid),
      })
      .from(patients)
      .leftJoin(workspaces, eq(patients.workspaceid, workspaces.workspaceid))
      .where(and(...conditions))
      .orderBy(patients.createdat);
    
    // Separate workspace and global patients for clarity
    const workspacePatients = rows.filter(p => !p.isGlobal);
    const globalPatients = rows.filter(p => p.isGlobal);

    return NextResponse.json({ 
      patients: rows,
      summary: {
        total: rows.length,
        workspaceSpecific: workspacePatients.length,
        global: globalPatients.length,
        includeGlobal,
      }
    });
  } catch (e) {
    console.error("[enhanced-patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const body = await req.json();
    const { 
      firstname, 
      middlename, 
      lastname, 
      nationalid, 
      dateofbirth, 
      gender, 
      bloodgroup, 
      phone, 
      email, 
      address, 
      medicalhistory,
      isGlobal = false // New field to create global patients
    } = body;

    // Validate required fields
    if (!firstname || !lastname) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate national ID across ALL patients
    if (nationalid) {
      const [existing] = await db
        .select()
        .from(patients)
        .where(eq(patients.nationalid, nationalid))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "A patient with this National ID already exists" },
          { status: 409 }
        );
      }
    }

    // Create patient (global or workspace-specific)
    const newPatientId = crypto.randomUUID();
    const values = {
      patientid: newPatientId,
      workspaceid: isGlobal ? null : workspaceid, // NULL for global patients
      firstname,
      middlename,
      lastname,
      nationalid,
      dateofbirth,
      gender,
      bloodgroup,
      phone,
      email,
      address,
      medicalhistory: medicalhistory || {},
    } as const;

    const [inserted] = await db.insert(patients).values(values).returning();

    return NextResponse.json({ 
      patient: inserted,
      message: isGlobal 
        ? "Global patient created successfully" 
        : "Workspace-specific patient created successfully"
    }, { status: 201 });
  } catch (e) {
    console.error("[enhanced-patients][POST] error:", e);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}

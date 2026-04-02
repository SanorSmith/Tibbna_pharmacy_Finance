/**
 * API: /api/patients (Global - no workspace restriction)
 * - GET: List all patients across all workspaces
 * - POST: Create patient (no workspace assignment)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, workspaces } from "@/lib/db/schema";
import { eq, ilike, or, count } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query conditions (NO workspace filter)
    const conditions = [];
    
    // Add search filter if provided
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchPattern = `%${searchTerm.trim()}%`;
      conditions.push(
        or(
          ilike(patients.firstname, searchPattern),
          ilike(patients.lastname, searchPattern),
          ilike(patients.nationalid, searchPattern)
        )!
      );
    }

    // Get total count for pagination
    const totalCountQuery = db
      .select({ count: count() })
      .from(patients);
    
    const totalCountResult = conditions.length > 0 
      ? await totalCountQuery.where(and(...conditions))
      : await totalCountQuery;
    
    const totalPatients = totalCountResult[0].count;

    // Fetch patients with workspace info
    const query = db
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
      })
      .from(patients)
      .leftJoin(workspaces, eq(patients.workspaceid, workspaces.workspaceid));

    // Apply conditions and pagination
    const finalQuery = conditions.length > 0 
      ? query.where(and(...conditions))
      : query;

    const rows = await finalQuery
      .orderBy(patients.createdat)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      patients: rows,
      pagination: {
        page,
        limit,
        total: totalPatients,
        totalPages: Math.ceil(totalPatients / limit),
      }
    });
  } catch (e) {
    console.error("[global-patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      workspaceid // Optional - if provided, assign to specific workspace
    } = body;

    // Validate required fields
    if (!firstname || !lastname) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate national ID across ALL workspaces
    if (nationalid) {
      const [existing] = await db
        .select()
        .from(patients)
        .where(eq(patients.nationalid, nationalid))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "A patient with this National ID already exists in the system" },
          { status: 409 }
        );
      }
    }

    // Create patient (workspace is optional)
    const newPatientId = crypto.randomUUID();
    const values = {
      patientid: newPatientId,
      workspaceid: workspaceid || null, // Allow null for global patients
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

    return NextResponse.json({ patient: inserted }, { status: 201 });
  } catch (e) {
    console.error("[global-patients][POST] error:", e);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}

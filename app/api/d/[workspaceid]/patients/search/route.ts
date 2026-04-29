/**
 * API: /api/d/[workspaceid]/patients/search
 * - GET: Search patients by Patient ID, National ID, or Phone Number
 * - Enhanced search for the comprehensive patient management interface
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq, ilike, or, and, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  
  // Ensure only authenticated users can search
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get search query from URL
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const searchPattern = `%${query.trim()}%`;
    
    // Search by Patient ID, National ID, or Phone Number
    // Include both workspace-specific and global patients
    const searchCondition = or(
      ilike(patients.patientid, searchPattern),
      ilike(patients.nationalid, searchPattern),
      ilike(patients.phone, searchPattern)
    )!;

    const baseCondition = or(
      eq(patients.workspaceid, workspaceid),
      isNull(patients.workspaceid)
    )!;

    const finalCondition = and(baseCondition, searchCondition);

    // Fetch patient with all enhanced fields
    const rows = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        firstnameAr: patients.firstnameAr,
        middlename: patients.middlename,
        middlenameAr: patients.middlenameAr,
        lastname: patients.lastname,
        lastnameAr: patients.lastnameAr,
        nationalid: patients.nationalid,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
        bloodgroup: patients.bloodgroup,
        phone: patients.phone,
        email: patients.email,
        governorate: patients.governorate,
        address: patients.address,
        emergencyContactName: patients.emergencyContactName,
        emergencyContactPhone: patients.emergencyContactPhone,
        insuranceCompany: patients.insuranceCompany,
        insuranceNumber: patients.insuranceNumber,
        insuranceStatus: patients.insuranceStatus,
        allergies: patients.allergies,
        chronicDiseases: patients.chronicDiseases,
        currentMedications: patients.currentMedications,
        medicalHistory: patients.medicalHistory,
        ehrid: patients.ehrid,
        medicalhistory: patients.medicalhistory,
        createdat: patients.createdat,
        updatedat: patients.updatedat,
        workspaceid: patients.workspaceid,
      })
      .from(patients)
      .where(finalCondition)
      .limit(1); // Return single best match

    if (rows.length === 0) {
      return NextResponse.json({ 
        patient: null,
        message: "No patient found matching the search criteria"
      }, { status: 404 });
    }

    // Return the first (best) match
    return NextResponse.json({ 
      patient: rows[0],
      message: "Patient found successfully"
    });

  } catch (e) {
    console.error("[patients][search][GET] error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

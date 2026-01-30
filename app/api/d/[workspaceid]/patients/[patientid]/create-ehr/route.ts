/**
 * API Endpoint: Create EHR ID for Patient
 * POST /api/d/[workspaceid]/patients/[patientid]/create-ehr
 * 
 * Creates an OpenEHR EHR ID for a patient who doesn't have one
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createOpenEHREHR, getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";

interface RouteParams {
  params: {
    workspaceid: string;
    patientid: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Fetch patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient already has EHR ID
    if (patient.ehrid) {
      return NextResponse.json({
        success: true,
        ehrid: patient.ehrid,
        message: "Patient already has an EHR ID",
      });
    }

    // Create EHR ID using national ID or patient ID as subject
    const subjectId = patient.nationalid || patientid;
    console.log(`[Create EHR] Creating EHR for patient ${patientid}, subject: ${subjectId}`);

    let ehrId: string | null = null;

    try {
      // Check if EHR already exists
      ehrId = await getOpenEHREHRBySubjectId(subjectId);
      
      if (!ehrId) {
        // Create new EHR
        ehrId = await createOpenEHREHR(subjectId);
        console.log(`[Create EHR] Successfully created EHR: ${ehrId}`);
      } else {
        console.log(`[Create EHR] Found existing EHR: ${ehrId}`);
      }
    } catch (error) {
      console.error("[Create EHR] Failed to create EHR:", error);
      return NextResponse.json(
        { 
          error: "Failed to create EHR ID",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "Failed to create or retrieve EHR ID" },
        { status: 500 }
      );
    }

    // Update patient with EHR ID
    await db
      .update(patients)
      .set({ ehrid: ehrId })
      .where(eq(patients.patientid, patientid));

    console.log(`[Create EHR] Updated patient ${patientid} with EHR ID: ${ehrId}`);

    return NextResponse.json({
      success: true,
      ehrid: ehrId,
      message: "EHR ID created and assigned to patient successfully",
    });

  } catch (error) {
    console.error("Error creating EHR ID:", error);
    return NextResponse.json(
      { 
        error: "Failed to create EHR ID",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

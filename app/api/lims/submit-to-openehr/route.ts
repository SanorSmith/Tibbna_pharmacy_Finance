/**
 * API Endpoint: Submit LIMS Validated Results to OpenEHR
 * POST /api/lims/submit-to-openehr
 * 
 * Takes validated test results from LIMS and creates a laboratory report
 * composition in OpenEHR using the laboratory_report_v1 template
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLaboratoryReport, buildLaboratoryReport, LaboratoryReportData, LabTestResult } from "@/lib/openehr/laboratory";

interface SubmitToOpenEHRRequest {
  sampleId: string;
  workspaceId: string;
  results: Array<{
    testCode: string;
    testName: string;
    resultValue: string | number;
    unit?: string;
    referenceMin?: number;
    referenceMax?: number;
    referenceRange?: string;
    flag?: string;
    isAbnormal?: boolean;
    isCritical?: boolean;
  }>;
  overallStatus?: "preliminary" | "final" | "amended";
  conclusion?: string;
  composerName: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SubmitToOpenEHRRequest = await request.json();
    const { sampleId, workspaceId, results, overallStatus, conclusion, composerName } = body;

    // Validate required fields
    if (!sampleId || !workspaceId || !results || results.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: sampleId, workspaceId, results" },
        { status: 400 }
      );
    }

    // Fetch sample details from database
    const [sample] = await db
      .select()
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleId))
      .limit(1);

    if (!sample) {
      return NextResponse.json(
        { error: "Sample not found" },
        { status: 404 }
      );
    }

    // Fetch patient details
    if (!sample.patientid) {
      return NextResponse.json(
        { error: "Sample has no associated patient" },
        { status: 400 }
      );
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, sample.patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient has EHR ID
    if (!patient.ehrid) {
      return NextResponse.json(
        { error: "Patient does not have an OpenEHR EHR ID. Please create an EHR for this patient first." },
        { status: 400 }
      );
    }

    // Determine test category from sample
    const testCategory = sample.labcategory || "General Laboratory";

    // Map LIMS results to OpenEHR V2 format
    const mappedResults: LabTestResult[] = results.map(result => {
      // Determine interpretation based on flags
      let interpretation: { code: string; value: string; terminology: string } | undefined;
      
      if (result.isCritical || result.flag === "HH" || result.flag === "LL") {
        interpretation = { code: "at0020", value: "Critical", terminology: "local" };
      } else if (result.flag === "H") {
        interpretation = { code: "at0018", value: "High", terminology: "local" };
      } else if (result.flag === "L") {
        interpretation = { code: "at0019", value: "Low", terminology: "local" };
      } else if (result.flag === "N") {
        interpretation = { code: "at0017", value: "Normal", terminology: "local" };
      } else if (result.isAbnormal) {
        interpretation = { code: "at0020", value: "Abnormal", terminology: "local" };
      }

      // Parse result value - could be string or number
      const numericValue = typeof result.resultValue === 'number' 
        ? result.resultValue 
        : parseFloat(String(result.resultValue));
      
      return {
        resultName: result.testName,
        resultValue: !isNaN(numericValue)
          ? { magnitude: numericValue, unit: result.unit || "" }
          : undefined,
        referenceRange: result.referenceRange || 
          (result.referenceMin !== undefined && result.referenceMax !== undefined 
            ? `${result.referenceMin}-${result.referenceMax}${result.unit ? ' ' + result.unit : ''}`
            : undefined),
        interpretation,
        comment: undefined,
      };
    });

    // Build laboratory report data for V2 template
    const reportData: LaboratoryReportData = {
      // Report metadata
      reportId: sample.samplenumber,
      status: overallStatus || "Final",
      startTime: new Date().toISOString(),
      
      // Test events
      testEvents: [{
        testName: testCategory,
        testStatus: { 
          code: overallStatus === "preliminary" ? "at0008" : "at0009", 
          value: overallStatus === "preliminary" ? "Preliminary" : "Final", 
          terminology: "local" 
        },
        testResults: mappedResults,
        overallInterpretation: conclusion,
        clinicalInformation: "Laboratory test results from LIMS",
        time: new Date().toISOString(),
      }],
      
      // Test details
      testMethod: "Automated analysis",
      laboratory: "LIMS Laboratory",
      specimenType: sample.sampletype,
      
      // Metadata
      composerName: composerName || user.name || "Lab Technician",
    };

    // Submit to OpenEHR using V2 template
    const compositionUid = await createLaboratoryReport(patient.ehrid, reportData);

    // Update sample record with OpenEHR composition UID
    await db
      .update(accessionSamples)
      .set({
        openehrcompositionuid: compositionUid,
        updatedat: new Date(),
      })
      .where(eq(accessionSamples.sampleid, sampleId));

    return NextResponse.json({
      success: true,
      compositionUid,
      message: "Laboratory report successfully submitted to OpenEHR",
      ehrId: patient.ehrid,
      sampleNumber: sample.samplenumber,
    });

  } catch (error) {
    console.error("Error submitting to OpenEHR:", error);
    
    // Provide detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to submit laboratory report to OpenEHR",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

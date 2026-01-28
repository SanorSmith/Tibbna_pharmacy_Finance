/**
 * API Endpoint: Fetch OpenEHR Laboratory Results for Patient
 * GET /api/d/[workspaceid]/patients/[patientid]/openehr-lab-results
 * 
 * Fetches laboratory report compositions from OpenEHR for a specific patient
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listLaboratoryReports } from "@/lib/openehr/laboratory";
import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

interface RouteParams {
  params: {
    workspaceid: string;
    patientid: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Fetch patient to get EHR ID
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

    // Check if patient has EHR ID
    if (!patient.ehrid) {
      return NextResponse.json({
        labResults: [],
        message: "Patient does not have an OpenEHR EHR ID",
      });
    }

    // Fetch laboratory reports from OpenEHR
    const reports = await listLaboratoryReports(patient.ehrid);

    // Fetch full composition data for each report
    const detailedReports = await Promise.all(
      reports.map(async (report) => {
        try {
          const compositionUrl = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${patient.ehrid}/composition/${report.composition_uid}?format=FLAT`;
          
          const response = await axios.get(compositionUrl, {
            headers: {
              "X-API-Key": process.env.EHRBASE_API_KEY!,
              Authorization: `Basic ${basicAuth}`,
              Accept: "application/json",
            },
          });

          const composition = response.data;
          
          // Parse the FLAT composition to extract test results
          return parseLabReportComposition(composition, report.composition_uid);
        } catch (error) {
          console.error(`Error fetching composition ${report.composition_uid}:`, error);
          return null;
        }
      })
    );

    // Filter out failed fetches and sort by date
    const validReports = detailedReports
      .filter(report => report !== null)
      .sort((a, b) => new Date(b!.report_date).getTime() - new Date(a!.report_date).getTime());

    return NextResponse.json({
      labResults: validReports,
      count: validReports.length,
    });

  } catch (error) {
    console.error("Error fetching OpenEHR lab results:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch laboratory results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Parse FLAT format laboratory report composition
 */
function parseLabReportComposition(composition: Record<string, any>, compositionUid: string) {
  const prefix = "template_laboratory_report_v2";
  
  // Extract basic report information
  const reportId = composition[`${prefix}/context/report_id`];
  const startTime = composition[`${prefix}/context/start_time`];
  const status = composition[`${prefix}/context/status`];
  const laboratory = composition[`${prefix}/laboratory_test_result/laboratory`];
  const specimenType = composition[`${prefix}/laboratory_test_result/specimen_type`];
  const testMethod = composition[`${prefix}/laboratory_test_result/test_method`];

  // Extract test events (usually just one event:0)
  const eventPrefix = `${prefix}/laboratory_test_result/any_event:0`;
  const testName = composition[`${eventPrefix}/test_name`];
  const testStatus = composition[`${eventPrefix}/test_status|value`];
  const clinicalInfo = composition[`${eventPrefix}/clinical_information`];
  const overallInterpretation = composition[`${eventPrefix}/overall_interpretation`];
  const eventTime = composition[`${eventPrefix}/time`];

  // Extract test results (analytes)
  const testResults = [];
  let resultIndex = 0;
  
  // Debug: Log all composition keys to see the actual structure
  console.log("=== OpenEHR Composition Keys ===");
  console.log("Sample keys:", Object.keys(composition).filter(k => k.includes('test_result')).slice(0, 10));
  
  while (true) {
    const resultPrefix = `${eventPrefix}/test_result:${resultIndex}`;
    const resultName = composition[`${resultPrefix}/result_name`];
    
    if (!resultName) break;
    
    // Try to get result value - check multiple possible keys
    let resultValue = composition[`${resultPrefix}/result_value/quantity_value|magnitude`];
    let resultUnit = composition[`${resultPrefix}/result_value/quantity_value|unit`];
    
    // Fallback 1: check if it's stored as text value
    if (resultValue === undefined || resultValue === null) {
      resultValue = composition[`${resultPrefix}/result_value`];
    }
    
    // Fallback 2: check for magnitude without the |magnitude suffix
    if (resultValue === undefined || resultValue === null) {
      resultValue = composition[`${resultPrefix}/result_value/quantity_value`];
    }
    
    // Fallback 3: check for direct magnitude
    if (resultValue === undefined || resultValue === null) {
      resultValue = composition[`${resultPrefix}/magnitude`];
    }
    
    // Fallback 4: check for any key containing 'value' or 'magnitude'
    if (resultValue === undefined || resultValue === null) {
      const allKeys = Object.keys(composition).filter(k => k.includes(`test_result:${resultIndex}`));
      const valueKey = allKeys.find(k => k.includes('value') || k.includes('magnitude'));
      if (valueKey) {
        resultValue = composition[valueKey];
      }
    }
    
    // Try to get unit from multiple possible keys
    if (resultUnit === undefined || resultUnit === null) {
      resultUnit = composition[`${resultPrefix}/result_value/quantity_value|unit`];
    }
    if (resultUnit === undefined || resultUnit === null) {
      resultUnit = composition[`${resultPrefix}/unit`];
    }
    if (resultUnit === undefined || resultUnit === null) {
      // Look for any key containing 'unit' for this result
      const allKeys = Object.keys(composition).filter(k => k.includes(`test_result:${resultIndex}`));
      const unitKey = allKeys.find(k => k.includes('unit'));
      if (unitKey) {
        resultUnit = composition[unitKey];
      }
    }
    
    const referenceRange = composition[`${resultPrefix}/reference_range`];
    const interpretation = composition[`${resultPrefix}/interpretation|value`];
    const comment = composition[`${resultPrefix}/comment`];

    console.log(`Result ${resultIndex}:`, {
      name: resultName,
      value: resultValue,
      unit: resultUnit,
      range: referenceRange,
      interpretation,
      allKeys: Object.keys(composition).filter(k => k.includes(`test_result:${resultIndex}`)),
    });

    testResults.push({
      analyte_name: resultName,
      result_value: resultValue,
      result_unit: resultUnit,
      reference_range: referenceRange,
      result_status: interpretation || "Normal",
      result_flag: getResultFlag(interpretation),
      comment: comment,
    });

    resultIndex++;
  }
  
  console.log(`Total results parsed: ${testResults.length}`);

  return {
    composition_uid: compositionUid,
    recorded_time: startTime,
    test_name: testName || "Laboratory Test",
    protocol: reportId || compositionUid,
    specimen_type: specimenType,
    specimen_collection_time: eventTime,
    overall_test_status: testStatus || status || "final",
    clinical_information_provided: clinicalInfo,
    test_results: testResults,
    conclusion: overallInterpretation,
    laboratory_name: laboratory || "LIMS Laboratory",
    report_date: startTime,
    source: "openEHR" as const,
  };
}

/**
 * Map interpretation to result flag
 */
function getResultFlag(interpretation?: string): string {
  if (!interpretation) return "N";
  
  const interp = interpretation.toLowerCase();
  if (interp.includes("high") || interp.includes("elevated")) return "H";
  if (interp.includes("low") || interp.includes("decreased")) return "L";
  if (interp.includes("critical")) return "HH";
  if (interp.includes("normal")) return "N";
  
  return "N";
}

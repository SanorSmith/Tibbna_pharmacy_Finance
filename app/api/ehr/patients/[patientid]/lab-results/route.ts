import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { testResults, accessionSamples, users, workspaces } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// In-memory storage for lab results (dummy data)
// In production, this would be stored in EHRbase or a database
interface LabTestAnalyte {
  analyte_name: string;
  analyte_code?: string;
  result_value: string | number;
  result_unit?: string;
  reference_range?: string;
  result_status: string; // normal, high, low, critical
  result_flag?: string; // H, L, HH, LL
}

interface LabTestResult {
  composition_uid: string;
  recorded_time: string;
  
  // Test identification (openEHR: Test name)
  test_name: string;
  test_name_code?: string;
  protocol: string; // Laboratory internal identifier
  
  // Specimen details (openEHR: Specimen)
  specimen_type?: string;
  specimen_collection_time?: string;
  specimen_received_time?: string;
  specimen_id?: string;
  
  // Overall test status (openEHR: Overall test status)
  overall_test_status: string; // registered, partial, preliminary, final, amended, cancelled
  
  // Clinical information (openEHR: Clinical information provided)
  clinical_information_provided?: string;
  
  // Test results (openEHR: Test result - analytes)
  test_results: LabTestAnalyte[];
  
  // Interpretation (openEHR: Conclusion)
  conclusion?: string;
  
  // Test diagnosis (openEHR: Test diagnosis)
  test_diagnosis?: string;
  
  // Metadata
  laboratory_name: string;
  reported_by?: string;
  verified_by?: string;
  report_date: string;
}

// Initialize with dummy data for demonstration
const labResultsStore: Record<string, LabTestResult[]> = {
  // Sample patient ID with dummy lab results
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "lab-result-1731847200000-cbc001",
      recorded_time: "2024-11-15T09:30:00.000Z",
      test_name: "Complete Blood Count (CBC)",
      test_name_code: "58410-2",
      protocol: "LAB-2024-001234",
      specimen_type: "Blood (EDTA tube)",
      specimen_collection_time: "2024-11-15T08:00:00.000Z",
      specimen_received_time: "2024-11-15T08:30:00.000Z",
      specimen_id: "SPEC-2024-001234",
      overall_test_status: "final",
      clinical_information_provided: "Routine annual physical examination. Patient reports feeling well with no specific complaints.",
      test_results: [
        {
          analyte_name: "Hemoglobin",
          analyte_code: "718-7",
          result_value: 14.5,
          result_unit: "g/dL",
          reference_range: "13.0 - 17.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "White Blood Cell Count",
          analyte_code: "6690-2",
          result_value: 7.2,
          result_unit: "×10³/μL",
          reference_range: "4.0 - 11.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Platelet Count",
          analyte_code: "777-3",
          result_value: 250,
          result_unit: "×10³/μL",
          reference_range: "150 - 400",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Hematocrit",
          analyte_code: "4544-3",
          result_value: 42.5,
          result_unit: "%",
          reference_range: "38.0 - 50.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "MCV (Mean Corpuscular Volume)",
          analyte_code: "787-2",
          result_value: 88,
          result_unit: "fL",
          reference_range: "80 - 100",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "All CBC parameters within normal limits. No evidence of anemia, infection, or clotting disorders.",
      test_diagnosis: "Normal complete blood count",
      laboratory_name: "Central Haematology Laboratory",
      reported_by: "Dr. Sarah Johnson, MD",
      verified_by: "Dr. Michael Chen, MD",
      report_date: "2024-11-15T10:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731760800000-lipid001",
      recorded_time: "2024-11-14T14:20:00.000Z",
      test_name: "Lipid Panel",
      test_name_code: "24331-1",
      protocol: "LAB-2024-001198",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-14T07:30:00.000Z",
      specimen_received_time: "2024-11-14T08:00:00.000Z",
      specimen_id: "SPEC-2024-001198",
      overall_test_status: "final",
      clinical_information_provided: "Cardiovascular risk assessment. Patient has family history of heart disease. Fasting for 12 hours confirmed.",
      test_results: [
        {
          analyte_name: "Total Cholesterol",
          analyte_code: "2093-3",
          result_value: 220,
          result_unit: "mg/dL",
          reference_range: "< 200",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "HDL Cholesterol",
          analyte_code: "2085-9",
          result_value: 55,
          result_unit: "mg/dL",
          reference_range: "> 40",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "LDL Cholesterol",
          analyte_code: "18262-6",
          result_value: 145,
          result_unit: "mg/dL",
          reference_range: "< 100",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "Triglycerides",
          analyte_code: "2571-8",
          result_value: 180,
          result_unit: "mg/dL",
          reference_range: "< 150",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "VLDL Cholesterol",
          analyte_code: "13458-5",
          result_value: 36,
          result_unit: "mg/dL",
          reference_range: "5 - 40",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "Elevated total cholesterol, LDL cholesterol, and triglycerides. HDL cholesterol is adequate. Increased cardiovascular risk.",
      test_diagnosis: "Hyperlipidemia - recommend lifestyle modifications and consider statin therapy. Follow-up lipid panel in 3 months.",
      laboratory_name: "Lipid & Metabolic Laboratory",
      reported_by: "Dr. Emily Rodriguez, PhD",
      verified_by: "Dr. James Wilson, MD",
      report_date: "2024-11-14T15:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731674400000-glucose001",
      recorded_time: "2024-11-13T11:45:00.000Z",
      test_name: "Fasting Blood Glucose",
      test_name_code: "1558-6",
      protocol: "LAB-2024-001165",
      specimen_type: "Blood (Plasma)",
      specimen_collection_time: "2024-11-13T07:00:00.000Z",
      specimen_received_time: "2024-11-13T07:30:00.000Z",
      specimen_id: "SPEC-2024-001165",
      overall_test_status: "final",
      clinical_information_provided: "Diabetes screening. Patient reports increased thirst and frequent urination. Fasting for 10 hours confirmed.",
      test_results: [
        {
          analyte_name: "Glucose (Fasting)",
          analyte_code: "1558-6",
          result_value: 142,
          result_unit: "mg/dL",
          reference_range: "70 - 100",
          result_status: "critical",
          result_flag: "HH"
        }
      ],
      conclusion: "Significantly elevated fasting blood glucose level, consistent with diabetes mellitus.",
      test_diagnosis: "Hyperglycemia - Diabetes mellitus suspected. Recommend HbA1c test for confirmation and endocrinology referral. Immediate lifestyle counseling and possible pharmacotherapy indicated.",
      laboratory_name: "Clinical Chemistry Laboratory",
      reported_by: "Dr. Patricia Lee, MD",
      verified_by: "Dr. Robert Kumar, MD",
      report_date: "2024-11-13T12:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731588000000-thyroid001",
      recorded_time: "2024-11-12T16:30:00.000Z",
      test_name: "Thyroid Function Panel",
      test_name_code: "24348-5",
      protocol: "LAB-2024-001132",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-12T09:00:00.000Z",
      specimen_received_time: "2024-11-12T09:30:00.000Z",
      specimen_id: "SPEC-2024-001132",
      overall_test_status: "final",
      clinical_information_provided: "Patient presents with fatigue, weight gain, and cold intolerance. Suspected hypothyroidism.",
      test_results: [
        {
          analyte_name: "TSH (Thyroid Stimulating Hormone)",
          analyte_code: "3016-3",
          result_value: 8.5,
          result_unit: "mIU/L",
          reference_range: "0.4 - 4.0",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "Free T4 (Thyroxine)",
          analyte_code: "3024-7",
          result_value: 0.7,
          result_unit: "ng/dL",
          reference_range: "0.8 - 1.8",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "Free T3 (Triiodothyronine)",
          analyte_code: "3051-0",
          result_value: 2.1,
          result_unit: "pg/mL",
          reference_range: "2.3 - 4.2",
          result_status: "low",
          result_flag: "L"
        }
      ],
      conclusion: "Elevated TSH with decreased free T4 and T3 levels, consistent with primary hypothyroidism.",
      test_diagnosis: "Primary hypothyroidism - recommend levothyroxine therapy. Start with 50 mcg daily and recheck thyroid function in 6 weeks.",
      laboratory_name: "Endocrine Laboratory",
      reported_by: "Dr. Amanda Foster, MD",
      verified_by: "Dr. David Martinez, MD",
      report_date: "2024-11-12T17:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731501600000-renal001",
      recorded_time: "2024-11-11T13:15:00.000Z",
      test_name: "Renal Function Panel",
      test_name_code: "24362-6",
      protocol: "LAB-2024-001089",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-11T08:30:00.000Z",
      specimen_received_time: "2024-11-11T09:00:00.000Z",
      specimen_id: "SPEC-2024-001089",
      overall_test_status: "final",
      clinical_information_provided: "Routine monitoring for patient with hypertension on ACE inhibitor therapy.",
      test_results: [
        {
          analyte_name: "Creatinine",
          analyte_code: "2160-0",
          result_value: 1.1,
          result_unit: "mg/dL",
          reference_range: "0.7 - 1.3",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "BUN (Blood Urea Nitrogen)",
          analyte_code: "3094-0",
          result_value: 18,
          result_unit: "mg/dL",
          reference_range: "7 - 20",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "eGFR (Estimated Glomerular Filtration Rate)",
          analyte_code: "33914-3",
          result_value: 85,
          result_unit: "mL/min/1.73m²",
          reference_range: "> 60",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Sodium",
          analyte_code: "2951-2",
          result_value: 140,
          result_unit: "mmol/L",
          reference_range: "136 - 145",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Potassium",
          analyte_code: "2823-3",
          result_value: 4.2,
          result_unit: "mmol/L",
          reference_range: "3.5 - 5.0",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "All renal function parameters within normal limits. Kidney function is adequate.",
      test_diagnosis: "Normal renal function - continue current medication regimen. Repeat in 6 months.",
      laboratory_name: "Clinical Chemistry Laboratory",
      reported_by: "Dr. Lisa Thompson, MD",
      verified_by: "Dr. Mark Anderson, MD",
      report_date: "2024-11-11T14:00:00.000Z"
    }
  ]
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/lab-results
 * Retrieve lab results for a patient (from dummy data)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const userWorkspaces = await getUserWorkspaces(user.userid);
    const membership = userWorkspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view lab results
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get lab results from in-memory store (dummy data)
    const patientLabResults = labResultsStore[patientid] || [];

    // Also fetch real LIMS results from the database
    const limsResults = await db
      .select({
        resultid: testResults.resultid,
        sampleid: testResults.sampleid,
        testcode: testResults.testcode,
        testname: testResults.testname,
        resultvalue: testResults.resultvalue,
        unit: testResults.unit,
        referencemin: testResults.referencemin,
        referencemax: testResults.referencemax,
        referencerange: testResults.referencerange,
        flag: testResults.flag,
        isabormal: testResults.isabormal,
        iscritical: testResults.iscritical,
        interpretation: testResults.interpretation,
        status: testResults.status,
        comment: testResults.comment,
        analyzeddate: testResults.analyzeddate,
        releaseddate: testResults.releaseddate,
        samplenumber: accessionSamples.samplenumber,
        sampletype: accessionSamples.sampletype,
        collectiondate: accessionSamples.collectiondate,
        labcategory: accessionSamples.labcategory,
        barcode: accessionSamples.barcode,
      })
      .from(testResults)
      .innerJoin(accessionSamples, eq(testResults.sampleid, accessionSamples.sampleid))
      .where(
        and(
          eq(accessionSamples.patientid, patientid),
          eq(testResults.workspaceid, workspaceid)
        )
      )
      .orderBy(desc(testResults.analyzeddate));

    // Get facility name once
    const facilityName = membership.workspace.name || "Laboratory";

    // Group LIMS results by sample into LabTestResult format
    const sampleMap = new Map<string, any>();
    for (const r of limsResults) {
      if (!sampleMap.has(r.sampleid)) {
        sampleMap.set(r.sampleid, {
          composition_uid: `lims-${r.sampleid}`,
          recorded_time: r.analyzeddate?.toISOString() || new Date().toISOString(),
          test_name: r.labcategory || "Laboratory Tests",
          protocol: r.samplenumber,
          specimen_type: r.sampletype,
          specimen_collection_time: r.collectiondate?.toISOString(),
          specimen_id: r.samplenumber,
          overall_test_status: r.status === "released" ? "final" : r.status === "validated" ? "preliminary" : "registered",
          test_results: [] as LabTestAnalyte[],
          laboratory_name: facilityName,
          report_date: r.releaseddate?.toISOString() || r.analyzeddate?.toISOString() || new Date().toISOString(),
          source: "lims",
          sampleid: r.sampleid,
        });
      }

      const refRange =
        r.referencemin !== null && r.referencemax !== null
          ? `${r.referencemin} - ${r.referencemax}`
          : r.referencerange || undefined;

      const resultStatus = r.iscritical
        ? "critical"
        : r.isabormal
        ? "abnormal"
        : "normal";

      const resultFlag = r.iscritical
        ? "HH"
        : r.flag === "high" || r.flag === "H"
        ? "H"
        : r.flag === "low" || r.flag === "L"
        ? "L"
        : "N";

      sampleMap.get(r.sampleid).test_results.push({
        analyte_name: r.testname,
        analyte_code: r.testcode,
        result_value: r.resultvalue || "-",
        result_unit: r.unit || undefined,
        reference_range: refRange,
        result_status: resultStatus,
        result_flag: resultFlag,
      });
    }

    const limsLabResults = Array.from(sampleMap.values());

    // Merge: LIMS results first (real data), then dummy data
    const allResults = [...limsLabResults, ...patientLabResults];

    return NextResponse.json({ labResults: allResults });
  } catch (error) {
    console.error("Error fetching lab results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/lab-results
 * Create a new lab result (dummy data storage)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const userWorkspaces2 = await getUserWorkspaces(user.userid);
    const membership2 = userWorkspaces2.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and lab technicians can create lab results
    if (membership2.role !== "doctor" && membership2.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { labResult } = body;

    // Create lab result record following openEHR structure
    const labResultRecord: LabTestResult = {
      composition_uid: `lab-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      
      // Test identification
      test_name: labResult.testName,
      test_name_code: labResult.testNameCode,
      protocol: labResult.protocol || `LAB-${Date.now()}`,
      
      // Specimen details
      specimen_type: labResult.specimenType,
      specimen_collection_time: labResult.specimenCollectionTime,
      specimen_received_time: labResult.specimenReceivedTime,
      specimen_id: labResult.specimenId,
      
      // Overall test status
      overall_test_status: labResult.overallTestStatus || "final",
      
      // Clinical information
      clinical_information_provided: labResult.clinicalInformation,
      
      // Test results (analytes)
      test_results: labResult.testResults || [],
      
      // Interpretation
      conclusion: labResult.conclusion,
      test_diagnosis: labResult.testDiagnosis,
      
      // Metadata
      laboratory_name: labResult.laboratoryName,
      reported_by: labResult.reportedBy || user.name || user.email,
      verified_by: labResult.verifiedBy,
      report_date: new Date().toISOString(),
    };

    // Store in memory (initialize array if doesn't exist)
    if (!labResultsStore[patientid]) {
      labResultsStore[patientid] = [];
    }
    labResultsStore[patientid].unshift(labResultRecord); // Add to beginning

    console.log("✅ Lab result created (dummy data):", labResultRecord);

    return NextResponse.json(
      { 
        success: true,
        message: "Lab result created successfully",
        record: labResultRecord
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lab result:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

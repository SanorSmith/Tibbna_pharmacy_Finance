import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

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

const labResultsStore: Record<string, LabTestResult[]> = {};

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
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view lab results
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get lab results from in-memory store
    const patientLabResults = labResultsStore[patientid] || [];

    return NextResponse.json({ labResults: patientLabResults });
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
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and lab technicians can create lab results
    if (membership.role !== "doctor" && membership.role !== "nurse") {
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

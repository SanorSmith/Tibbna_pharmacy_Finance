import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for prescriptions (dummy data)
// In production, this would be stored in EHRbase or a database
interface PrescriptionRecord {
  composition_uid: string;
  recorded_time: string;
  
  // Medication Item (openEHR: Medication item)
  medication_item: string;
  medication_item_code?: string;
  medication_item_terminology?: string; // SNOMED-CT, RxNorm, dm+d, etc.
  
  // Order Type
  order_type?: string; // dose-based or product-based
  
  // Dose Direction (openEHR: Dose direction description)
  dose_amount?: string;
  dose_unit?: string;
  dose_formula?: string;
  
  // Route (openEHR: Route)
  route: string;
  route_code?: string; // SNOMED CT code
  
  // Site (openEHR: Site)
  body_site?: string;
  body_site_code?: string; // SNOMED CT code
  
  // Administration Method (openEHR: Method)
  administration_method?: string;
  administration_method_code?: string;
  
  // Timing (openEHR: Timing - daily)
  timing_directions: string;
  frequency?: string;
  interval?: string;
  as_required?: boolean;
  as_required_criterion?: string;
  direction_duration?: string;
  
  // Medication Safety (openEHR: Medication safety)
  medication_safety?: string;
  maximum_dose_amount?: string;
  maximum_dose_unit?: string;
  maximum_dose_period?: string;
  
  // Instructions
  additional_instruction?: string;
  patient_instruction?: string;
  
  // Clinical Indication (openEHR: Clinical indication)
  clinical_indication?: string;
  clinical_indication_code?: string; // ICD-10 or SNOMED CT
  clinical_indication_terminology?: string; // ICD-10 or SNOMED-CT
  
  // Overall Description
  comment?: string;
  
  // Metadata
  prescribed_by: string;
  status: string;
}

const prescriptionStore: Record<string, PrescriptionRecord[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Retrieve prescription/medication orders for a patient (from dummy data)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can view prescriptions
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get prescriptions for this patient
    const prescriptions = prescriptionStore[patientid] || [];

    return NextResponse.json({ prescriptions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Create a new prescription/medication order (dummy data)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can create prescriptions
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can create prescriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prescription } = body;

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription data is required" },
        { status: 400 }
      );
    }

    // Create new prescription record (openEHR compliant)
    const newPrescription: PrescriptionRecord = {
      composition_uid: `prescription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      
      // Medication Item (openEHR: Medication item)
      medication_item: prescription.medicationItem,
      medication_item_code: prescription.medicationItemCode,
      medication_item_terminology: prescription.medicationItemTerminology,
      
      // Order Type
      order_type: prescription.orderType,
      
      // Dose Direction (openEHR: Dose direction description)
      dose_amount: prescription.doseAmount,
      dose_unit: prescription.doseUnit,
      dose_formula: prescription.doseFormula,
      
      // Route (openEHR: Route)
      route: prescription.route,
      route_code: prescription.routeCode,
      
      // Site (openEHR: Site)
      body_site: prescription.bodySite,
      body_site_code: prescription.bodySiteCode,
      
      // Administration Method (openEHR: Method)
      administration_method: prescription.administrationMethod,
      administration_method_code: prescription.administrationMethodCode,
      
      // Timing (openEHR: Timing - daily)
      timing_directions: prescription.timingDirections,
      frequency: prescription.frequency,
      interval: prescription.interval,
      as_required: prescription.asRequired,
      as_required_criterion: prescription.asRequiredCriterion,
      direction_duration: prescription.directionDuration,
      
      // Medication Safety (openEHR: Medication safety)
      medication_safety: prescription.medicationSafety,
      maximum_dose_amount: prescription.maximumDoseAmount,
      maximum_dose_unit: prescription.maximumDoseUnit,
      maximum_dose_period: prescription.maximumDosePeriod,
      
      // Instructions
      additional_instruction: prescription.additionalInstruction,
      patient_instruction: prescription.patientInstruction,
      
      // Clinical Indication (openEHR: Clinical indication)
      clinical_indication: prescription.clinicalIndication,
      clinical_indication_code: prescription.clinicalIndicationCode,
      clinical_indication_terminology: prescription.clinicalIndicationTerminology,
      
      // Overall Description
      comment: prescription.comment,
      
      // Metadata
      prescribed_by: user.name || user.email,
      status: "active",
    };

    // Store the prescription
    if (!prescriptionStore[patientid]) {
      prescriptionStore[patientid] = [];
    }
    prescriptionStore[patientid].push(newPrescription);

    return NextResponse.json(
      { message: "Prescription created successfully", prescription: newPrescription },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { error: "Failed to create prescription" },
      { status: 500 }
    );
  }
}

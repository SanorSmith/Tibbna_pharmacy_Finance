import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for medical history (dummy data)
// In production, this would be stored in EHRbase or a database

// Medical History (openEHR: EVALUATION.problem_diagnosis or OBSERVATION.story_history)
interface MedicalHistoryRecord {
  composition_uid: string;
  recorded_time: string;
  
  // Symptom/Sign details (openEHR: Symptom/Sign name)
  symptom_sign_name: string;
  
  // Body site (openEHR: Body site)
  body_site?: string;
  
  // Description (openEHR: Description)
  description?: string;
  
  // Occurrence (openEHR: Occurrence)
  occurrence?: string; // first_occurrence, recurrence, ongoing
  
  // Date/Time (openEHR: Date/time of onset)
  date_time?: string;
  
  // Vaccine (if applicable)
  vaccine?: string;
  
  // Comment
  comment?: string;
  
  // Metadata
  recorded_by: string;
  status: string; // active, resolved, inactive
  category: string; // medical_condition, surgical_history, allergy, family_history, social_history, immunization
}

// Initialize with dummy data for demonstration
const medicalHistoryStore: Record<string, MedicalHistoryRecord[]> = {
  // Sample patient ID with dummy medical history
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    // Medical Conditions
    {
      composition_uid: "medical-history-1731847200000-dm001",
      recorded_time: "2020-03-15T10:00:00.000Z",
      symptom_sign_name: "Type 2 Diabetes Mellitus",
      body_site: "Pancreas",
      description: "Diagnosed with Type 2 Diabetes Mellitus. Patient presented with polyuria, polydipsia, and unexplained weight loss. HbA1c at diagnosis: 8.5%. Currently managed with Metformin 1000mg twice daily and lifestyle modifications.",
      occurrence: "ongoing",
      date_time: "2020-03-15T00:00:00.000Z",
      vaccine: "",
      comment: "Regular monitoring required. Last HbA1c: 6.8% (Nov 2024). Good glycemic control achieved.",
      recorded_by: "Dr. Sarah Mitchell, MD",
      status: "active",
      category: "medical_condition"
    },
    {
      composition_uid: "medical-history-1731760800000-htn001",
      recorded_time: "2018-07-22T14:30:00.000Z",
      symptom_sign_name: "Essential Hypertension",
      body_site: "Cardiovascular system",
      description: "Diagnosed with essential hypertension. Blood pressure at diagnosis: 165/98 mmHg. Currently managed with Lisinopril 10mg daily. Patient advised on DASH diet and regular exercise.",
      occurrence: "ongoing",
      date_time: "2018-07-22T00:00:00.000Z",
      vaccine: "",
      comment: "Blood pressure well controlled. Last reading: 128/82 mmHg (Nov 2024). Continue current regimen.",
      recorded_by: "Dr. James Rodriguez, MD",
      status: "active",
      category: "medical_condition"
    },
    {
      composition_uid: "medical-history-1731674400000-asthma001",
      recorded_time: "2010-05-10T09:15:00.000Z",
      symptom_sign_name: "Asthma",
      body_site: "Respiratory system",
      description: "Childhood-onset asthma, mild intermittent. Triggered by exercise and cold air. Uses albuterol inhaler as needed. No recent exacerbations.",
      occurrence: "recurrence",
      date_time: "2010-05-10T00:00:00.000Z",
      vaccine: "",
      comment: "Well-controlled with PRN bronchodilator. Last exacerbation: 2 years ago. Spirometry normal.",
      recorded_by: "Dr. Emily Chen, MD",
      status: "active",
      category: "medical_condition"
    },
    
    // Surgical History
    {
      composition_uid: "medical-history-1731588000000-appy001",
      recorded_time: "2015-11-20T00:00:00.000Z",
      symptom_sign_name: "Appendectomy",
      body_site: "Appendix",
      description: "Emergency laparoscopic appendectomy for acute appendicitis. Uncomplicated postoperative course. Discharged on postoperative day 2.",
      occurrence: "first_occurrence",
      date_time: "2015-11-20T00:00:00.000Z",
      vaccine: "",
      comment: "No complications. Surgical site healed well. No residual symptoms.",
      recorded_by: "Dr. Patricia Williams, MD - Surgeon",
      status: "resolved",
      category: "surgical_history"
    },
    {
      composition_uid: "medical-history-1731501600000-knee001",
      recorded_time: "2019-08-15T00:00:00.000Z",
      symptom_sign_name: "Arthroscopic Knee Surgery",
      body_site: "Left knee",
      description: "Arthroscopic meniscectomy for torn medial meniscus. Sports injury sustained during basketball. Successful repair with good range of motion post-surgery.",
      occurrence: "first_occurrence",
      date_time: "2019-08-15T00:00:00.000Z",
      vaccine: "",
      comment: "Full recovery achieved. Returned to sports activities after 3 months of physical therapy.",
      recorded_by: "Dr. Michael Thompson, MD - Orthopedic Surgeon",
      status: "resolved",
      category: "surgical_history"
    },
    
    // Allergies
    {
      composition_uid: "medical-history-1731415200000-pcn001",
      recorded_time: "2005-03-10T00:00:00.000Z",
      symptom_sign_name: "Penicillin Allergy",
      body_site: "Systemic",
      description: "Documented penicillin allergy. Patient developed urticarial rash and mild angioedema after taking amoxicillin for strep throat. No anaphylaxis.",
      occurrence: "first_occurrence",
      date_time: "2005-03-10T00:00:00.000Z",
      vaccine: "",
      comment: "AVOID ALL PENICILLINS AND CEPHALOSPORINS. Use macrolides or fluoroquinolones as alternatives.",
      recorded_by: "Dr. Amanda Foster, MD",
      status: "active",
      category: "allergy"
    },
    {
      composition_uid: "medical-history-1731328800000-latex001",
      recorded_time: "2012-06-18T00:00:00.000Z",
      symptom_sign_name: "Latex Allergy",
      body_site: "Skin",
      description: "Contact dermatitis to latex gloves. Developed itchy rash on hands after wearing latex gloves during work. Confirmed by patch testing.",
      occurrence: "recurrence",
      date_time: "2012-06-18T00:00:00.000Z",
      vaccine: "",
      comment: "Use non-latex gloves for all procedures. Inform surgical team before any procedures.",
      recorded_by: "Dr. Lisa Thompson, MD - Allergist",
      status: "active",
      category: "allergy"
    },
    
    // Family History
    {
      composition_uid: "medical-history-1731242400000-fh001",
      recorded_time: "2024-01-15T00:00:00.000Z",
      symptom_sign_name: "Family History of Coronary Artery Disease",
      body_site: "Cardiovascular system",
      description: "Father had myocardial infarction at age 58. Paternal grandfather died of heart attack at age 62. Increased cardiovascular risk.",
      occurrence: "ongoing",
      date_time: "2024-01-15T00:00:00.000Z",
      vaccine: "",
      comment: "Patient counseled on cardiovascular risk reduction. Regular lipid screening recommended.",
      recorded_by: "Dr. Robert Anderson, MD",
      status: "active",
      category: "family_history"
    },
    {
      composition_uid: "medical-history-1731156000000-fh002",
      recorded_time: "2024-01-15T00:00:00.000Z",
      symptom_sign_name: "Family History of Breast Cancer",
      body_site: "Breast",
      description: "Mother diagnosed with breast cancer at age 52. Maternal aunt also had breast cancer at age 48. BRCA testing offered but declined.",
      occurrence: "ongoing",
      date_time: "2024-01-15T00:00:00.000Z",
      vaccine: "",
      comment: "Enhanced breast cancer screening recommended. Annual mammography starting age 40.",
      recorded_by: "Dr. Susan Martinez, MD",
      status: "active",
      category: "family_history"
    },
    
    // Immunizations
    // Social History
    {
      composition_uid: "medical-history-1730810400000-smoking001",
      recorded_time: "2024-01-15T00:00:00.000Z",
      symptom_sign_name: "Former Smoker",
      body_site: "Respiratory system",
      description: "Former smoker with 10 pack-year history. Smoked 1 pack per day for 10 years (ages 20-30). Quit smoking 15 years ago.",
      occurrence: "resolved",
      date_time: "2009-01-01T00:00:00.000Z",
      vaccine: "",
      comment: "Successfully quit smoking. No current tobacco use. Counseled on continued abstinence.",
      recorded_by: "Dr. Kevin Park, MD",
      status: "resolved",
      category: "social_history"
    },
    {
      composition_uid: "medical-history-1730724000000-alcohol001",
      recorded_time: "2024-01-15T00:00:00.000Z",
      symptom_sign_name: "Alcohol Use - Moderate",
      body_site: "Systemic",
      description: "Social alcohol consumption. Reports 2-3 drinks per week, primarily wine with dinner. No history of alcohol abuse or dependence.",
      occurrence: "ongoing",
      date_time: "2024-01-15T00:00:00.000Z",
      vaccine: "",
      comment: "Within recommended limits. Counseled on safe drinking practices.",
      recorded_by: "Dr. Patricia Lee, MD",
      status: "active",
      category: "social_history"
    }
  ]
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/medical-history
 * Retrieve medical history for a patient
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

    // Only doctors and nurses can view medical history
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get medical history from in-memory store
    const patientMedicalHistory = medicalHistoryStore[patientid] || [];

    return NextResponse.json({ medicalHistory: patientMedicalHistory });
  } catch (error) {
    console.error("Error fetching medical history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/medical-history
 * Create a new medical history record
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

    // Only doctors can create medical history records
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { medicalHistory } = body;

    // Create medical history record following openEHR structure
    const medicalHistoryRecord: MedicalHistoryRecord = {
      composition_uid: `medical-history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      symptom_sign_name: medicalHistory.symptomSignName,
      body_site: medicalHistory.bodySite,
      description: medicalHistory.description,
      occurrence: medicalHistory.occurrence || "first_occurrence",
      date_time: medicalHistory.dateTime,
      vaccine: medicalHistory.vaccine,
      comment: medicalHistory.comment,
      recorded_by: user.name || user.email,
      status: medicalHistory.status || "active",
      category: medicalHistory.category || "medical_condition",
    };

    // Store in memory (initialize array if doesn't exist)
    if (!medicalHistoryStore[patientid]) {
      medicalHistoryStore[patientid] = [];
    }
    medicalHistoryStore[patientid].unshift(medicalHistoryRecord); // Add to beginning

    console.log("✅ Medical history record created:", medicalHistoryRecord);

    return NextResponse.json(
      { 
        success: true,
        message: "Medical history record created successfully",
        record: medicalHistoryRecord
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating medical history:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

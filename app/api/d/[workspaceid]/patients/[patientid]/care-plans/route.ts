import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  createCarePlan,
  listCarePlans,
  getCarePlan,
  type CarePlanComposition,
} from "@/lib/openehr";

// Care Plan interface for API responses
interface CarePlan {
  composition_uid: string;
  recorded_time: string;
  care_plan_name: string;
  
  // Care Plan Overview Fields
  care_plan_description?: string;
  care_plan_reason?: string;
  care_plan_schedule?: string;
  care_plan_expire?: string;
  care_plan_completed?: string;
  care_plan_comment?: string;
  
  // Problem/Diagnosis
  problem_diagnosis?: string;
  clinical_description?: string;
  body_site?: string;
  date_of_onset?: string;
  severity?: string;
  
  // Goal
  goal_name?: string;
  goal_description?: string;
  clinical_indication?: string;
  goal_start_date?: string;
  goal_end_date?: string;
  goal_outcome?: string;
  goal_comment?: string;
  
  // Service Request
  service_name?: string;
  service_description?: string;
  service_clinical_indication?: string;
  urgency?: string;
  requested_date?: string;
  request_status?: string;
  
  // Medication Order
  medication_item?: string;
  medication_route?: string;
  medication_directions?: string;
  clinical_indication_med?: string;
  
  // Metadata
  created_by: string;
  status: string;
}

// Helper function to parse care plan composition to our interface
function parseCarePlanComposition(comp: CarePlanComposition, compositionUid: string, startTime: string): CarePlan {
  // Extract care plan overview fields from context and composition
  const endTime = comp["template_care_plan_v1/context/_end_time"];
  
  // Extract completion date from goal outcome (stored as "Completed on MM/DD/YYYY")
  const goalOutcome = comp["template_care_plan_v1/goal/goal_outcome|other"];
  let completionDate: string | undefined;
  if (goalOutcome && goalOutcome.startsWith("Completed on ")) {
    const dateStr = goalOutcome.replace("Completed on ", "");
    completionDate = new Date(dateStr).toISOString();
  }
  
  // Determine status based on completion date - only mark as completed if date is in the past
  let status = "Active";
  if (completionDate) {
    const completionDateTime = new Date(completionDate);
    const now = new Date();
    if (completionDateTime <= now) {
      status = "Completed";
    }
  }
  
  return {
    composition_uid: compositionUid,
    recorded_time: startTime || new Date().toISOString(),
    
    // Use goal name as care plan name (this is where we store the actual care plan name)
    // Goal name is set to carePlanName in the composition
    care_plan_name: comp["template_care_plan_v1/goal/goal_name"] || 
                    comp["template_care_plan_v1/problem_diagnosis/problem_diagnosis_name"] || 
                    "Care Plan",
    
    // Care Plan Overview (extracted from various fields)
    care_plan_description: comp["template_care_plan_v1/goal/goal_description"] || 
                          comp["template_care_plan_v1/problem_diagnosis/clinical_description"],
    care_plan_reason: comp["template_care_plan_v1/goal/clinical_indication:0"] || 
                     comp["template_care_plan_v1/service_request/request/clinical_indication"],
    care_plan_schedule: comp["template_care_plan_v1/service_request/request/description"],
    care_plan_expire: endTime,
    care_plan_completed: completionDate,
    care_plan_comment: comp["template_care_plan_v1/goal/goal_comment"] || 
                      comp["template_care_plan_v1/problem_diagnosis/comment"],
    
    // Problem/Diagnosis
    problem_diagnosis: comp["template_care_plan_v1/problem_diagnosis/problem_diagnosis_name"],
    clinical_description: comp["template_care_plan_v1/problem_diagnosis/clinical_description"],
    body_site: comp["template_care_plan_v1/problem_diagnosis/body_site:0"],
    date_of_onset: comp["template_care_plan_v1/problem_diagnosis/date_time_of_onset"],
    severity: comp["template_care_plan_v1/problem_diagnosis/severity|value"],
    
    // Goal
    goal_name: comp["template_care_plan_v1/goal/goal_name"],
    goal_description: comp["template_care_plan_v1/goal/goal_description"],
    clinical_indication: comp["template_care_plan_v1/goal/clinical_indication:0"],
    goal_start_date: comp["template_care_plan_v1/goal/goal_start_date"],
    goal_end_date: comp["template_care_plan_v1/goal/goal_end_date"],
    goal_outcome: comp["template_care_plan_v1/goal/goal_outcome|other"],
    goal_comment: comp["template_care_plan_v1/goal/goal_comment"],
    
    // Service Request
    service_name: comp["template_care_plan_v1/service_request/request/service_name|other"],
    service_description: comp["template_care_plan_v1/service_request/request/description"],
    service_clinical_indication: comp["template_care_plan_v1/service_request/request/clinical_indication"],
    urgency: comp["template_care_plan_v1/service_request/request/urgency|value"],
    requested_date: comp["template_care_plan_v1/service_request/request/requested_date"],
    request_status: comp["template_care_plan_v1/service_request/request/request_status|value"],
    
    // Medication Order
    medication_item: comp["template_care_plan_v1/medication_order/order:0/medication_item"],
    medication_route: comp["template_care_plan_v1/medication_order/order:0/route:0"],
    medication_directions: comp["template_care_plan_v1/medication_order/order:0/overall_directions_description"],
    clinical_indication_med: comp["template_care_plan_v1/medication_order/order:0/clinical_indication:0"],
    
    created_by: comp["template_care_plan_v1/composer|name"] || "Unknown",
    status,
  };
}

// Dummy data for backward compatibility (will be removed once all patients have openEHR data)
const dummyCarePlansStore: Record<string, CarePlan[]> = {
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "care-plan-1731847200000-cvd001",
      recorded_time: "2024-11-01T10:00:00.000Z",
      care_plan_name: "Cardiovascular Risk Management",
      care_plan_description: "Comprehensive care plan to reduce cardiovascular risk factors including hypertension, hyperlipidemia, and diabetes management. Focus on lifestyle modifications, medication adherence, and regular monitoring.",
      care_plan_reason: "Patient has multiple cardiovascular risk factors: Type 2 Diabetes (HbA1c 6.8%), Hypertension (on Lisinopril), Hyperlipidemia (LDL 145 mg/dL), and family history of coronary artery disease.",
      care_plan_schedule: "Monthly follow-ups for first 3 months, then quarterly. Blood pressure checks weekly at home. Lab work (lipid panel, HbA1c) every 3 months.",
      care_plan_expire: "2025-11-01T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient motivated and engaged. Good adherence to medications. Needs continued support for dietary changes and exercise program.",
      created_by: "Dr. Sarah Mitchell, MD",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731760800000-dm001",
      recorded_time: "2024-10-15T14:30:00.000Z",
      care_plan_name: "Diabetes Management Plan",
      care_plan_description: "Structured diabetes management plan focusing on glycemic control, prevention of complications, and patient education. Includes medication management, dietary counseling, and regular monitoring of blood glucose levels.",
      care_plan_reason: "Type 2 Diabetes Mellitus diagnosed in 2020. Recent HbA1c of 6.8% indicates good control but requires ongoing management to prevent complications.",
      care_plan_schedule: "Bi-weekly appointments for first month, then monthly. Daily blood glucose monitoring (fasting and 2-hour post-prandial). HbA1c every 3 months. Annual comprehensive diabetes exam including foot exam, eye exam, and kidney function tests.",
      care_plan_expire: "2025-10-15T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient demonstrates good understanding of diabetes self-management. Continue current Metformin regimen. Reinforce importance of diet and exercise.",
      created_by: "Dr. James Rodriguez, MD - Endocrinologist",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731674400000-asthma001",
      recorded_time: "2024-09-20T09:15:00.000Z",
      care_plan_name: "Asthma Action Plan",
      care_plan_description: "Personalized asthma action plan to maintain control and prevent exacerbations. Includes trigger identification and avoidance, proper inhaler technique, and emergency response protocol.",
      care_plan_reason: "Mild intermittent asthma with exercise and cold air triggers. Last exacerbation was 2 years ago. Patient needs updated action plan for optimal control.",
      care_plan_schedule: "Follow-up every 6 months or as needed for exacerbations. Peak flow monitoring during symptomatic periods. Spirometry annually.",
      care_plan_expire: "2025-09-20T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient well-controlled on PRN albuterol. Educated on proper inhaler technique. Provided written asthma action plan with green/yellow/red zones.",
      created_by: "Dr. Emily Chen, MD - Pulmonologist",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731588000000-postop001",
      recorded_time: "2019-08-20T00:00:00.000Z",
      care_plan_name: "Post-Operative Knee Rehabilitation",
      care_plan_description: "Comprehensive rehabilitation plan following arthroscopic meniscectomy. Includes physical therapy, pain management, and gradual return to activities.",
      care_plan_reason: "Status post arthroscopic meniscectomy for torn medial meniscus. Patient requires structured rehabilitation to regain full range of motion and strength.",
      care_plan_schedule: "Physical therapy 3x/week for 6 weeks, then 2x/week for 6 weeks. Progressive weight-bearing as tolerated. Follow-up at 2 weeks, 6 weeks, and 3 months post-op.",
      care_plan_expire: "2020-02-20T00:00:00.000Z",
      care_plan_completed: "2019-11-20T00:00:00.000Z",
      care_plan_comment: "Patient completed rehabilitation successfully. Full range of motion achieved. Returned to basketball without restrictions. No residual pain or instability.",
      created_by: "Dr. Michael Thompson, MD - Orthopedic Surgeon",
      status: "completed"
    },
    {
      composition_uid: "care-plan-1731501600000-weight001",
      recorded_time: "2024-08-10T11:00:00.000Z",
      care_plan_name: "Weight Management Program",
      care_plan_description: "Medically supervised weight loss program targeting 10% body weight reduction over 6 months. Includes dietary counseling, exercise prescription, and behavioral modification.",
      care_plan_reason: "BMI 32 (obese). Weight loss recommended to improve cardiovascular risk factors and diabetes control. Patient motivated to lose weight.",
      care_plan_schedule: "Weekly weigh-ins and counseling sessions for first month, then bi-weekly. Monthly dietitian consultations. Exercise: 150 minutes moderate activity per week, gradually increasing.",
      care_plan_expire: "2025-02-10T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient has lost 8 lbs in first month. Good adherence to meal plan. Needs encouragement to increase physical activity. Consider group support program.",
      created_by: "Dr. Patricia Williams, MD",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731415200000-mental001",
      recorded_time: "2024-07-15T14:00:00.000Z",
      care_plan_name: "Anxiety Management Plan",
      care_plan_description: "Integrated care plan for generalized anxiety disorder including pharmacotherapy, cognitive behavioral therapy, and stress management techniques.",
      care_plan_reason: "Patient reports persistent worry, restlessness, and difficulty concentrating for past 6 months. GAD-7 score: 12 (moderate anxiety). Impacting work and relationships.",
      care_plan_schedule: "Weekly CBT sessions with therapist for 12 weeks. Psychiatry follow-up monthly for medication management. Practice relaxation techniques daily. Re-assess with GAD-7 at 6 weeks and 12 weeks.",
      care_plan_expire: "2025-01-15T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient started on Sertraline 50mg daily. Tolerating well. Engaged in therapy. Learning coping strategies. Encourage continued practice of mindfulness exercises.",
      created_by: "Dr. Amanda Foster, MD - Psychiatrist",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731328800000-smoking001",
      recorded_time: "2009-01-01T00:00:00.000Z",
      care_plan_name: "Smoking Cessation Program",
      care_plan_description: "Comprehensive smoking cessation program including nicotine replacement therapy, behavioral counseling, and relapse prevention strategies.",
      care_plan_reason: "Patient smoking 1 pack per day for 10 years (10 pack-year history). Motivated to quit due to health concerns and family pressure.",
      care_plan_schedule: "Weekly counseling sessions for 8 weeks. Nicotine patch therapy for 12 weeks with gradual taper. Follow-up at 1 month, 3 months, 6 months, and 1 year.",
      care_plan_expire: "2010-01-01T00:00:00.000Z",
      care_plan_completed: "2009-06-01T00:00:00.000Z",
      care_plan_comment: "Patient successfully quit smoking! Remained tobacco-free for 15 years. Excellent outcome. Patient credits combination of nicotine replacement and counseling support.",
      created_by: "Dr. Kevin Park, MD",
      status: "completed"
    },
    {
      composition_uid: "care-plan-1731242400000-pain001",
      recorded_time: "2024-06-01T10:30:00.000Z",
      care_plan_name: "Chronic Low Back Pain Management",
      care_plan_description: "Multimodal pain management plan for chronic low back pain including physical therapy, pain medication, and alternative therapies.",
      care_plan_reason: "Chronic low back pain for 2 years. MRI shows disc degeneration at L4-L5 without nerve compression. Pain interfering with daily activities and work.",
      care_plan_schedule: "Physical therapy 2x/week for 8 weeks focusing on core strengthening and flexibility. Pain management follow-up monthly. Trial of acupuncture weekly for 6 weeks. Re-evaluate at 3 months.",
      care_plan_expire: "2024-12-01T00:00:00.000Z",
      care_plan_completed: "",
      care_plan_comment: "Patient on scheduled acetaminophen and PRN ibuprofen. Avoiding opioids. Physical therapy showing good progress. Patient reports 30% improvement in pain and function.",
      created_by: "Dr. Lisa Thompson, MD - Pain Management",
      status: "active"
    },
    {
      composition_uid: "care-plan-1731156000000-prenatal001",
      recorded_time: "2023-03-01T00:00:00.000Z",
      care_plan_name: "Prenatal Care Plan",
      care_plan_description: "Standard prenatal care plan for low-risk pregnancy including regular check-ups, screening tests, and patient education.",
      care_plan_reason: "First pregnancy, 8 weeks gestation. Patient healthy with no significant medical history. Desires comprehensive prenatal care.",
      care_plan_schedule: "Monthly visits until 28 weeks, bi-weekly until 36 weeks, then weekly until delivery. First trimester screening at 11-13 weeks. Anatomy scan at 20 weeks. Glucose screening at 24-28 weeks. Group B strep screening at 36 weeks.",
      care_plan_expire: "2023-12-01T00:00:00.000Z",
      care_plan_completed: "2023-11-15T00:00:00.000Z",
      care_plan_comment: "Uncomplicated pregnancy. Delivered healthy baby girl at 39 weeks. Vaginal delivery without complications. Mother and baby doing well.",
      created_by: "Dr. Susan Martinez, MD - OB/GYN",
      status: "completed"
    },
    {
      composition_uid: "care-plan-1731069600000-ckd001",
      recorded_time: "2024-05-10T13:00:00.000Z",
      care_plan_name: "Chronic Kidney Disease Management",
      care_plan_description: "Care plan for early-stage chronic kidney disease focusing on slowing progression, managing complications, and preparing for potential future interventions.",
      care_plan_reason: "Stage 3a CKD (eGFR 52 mL/min/1.73m²) secondary to hypertension and diabetes. Requires close monitoring and management to prevent progression.",
      care_plan_schedule: "Nephrology follow-up every 3 months. Lab work (CMP, CBC, PTH, vitamin D) every 3 months. Blood pressure monitoring weekly at home. Annual kidney ultrasound. Dietitian consultation quarterly for renal diet education.",
      care_plan_expire: "",
      care_plan_completed: "",
      care_plan_comment: "Patient on ACE inhibitor for renoprotection. Strict blood pressure control essential. Educate on low-sodium, low-protein diet. Monitor for anemia and bone disease. Discuss advance care planning.",
      created_by: "Dr. Robert Anderson, MD - Nephrologist",
      status: "active"
    }
  ]
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/care-plans
 * Retrieve care plans for a patient from openEHR
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

    // Only doctors and nurses can view care plans
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch patient to get National ID for openEHR lookup
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get EHR ID from openEHR
    let ehrId: string | null;
    try {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid || patientid);
      if (!ehrId) {
        throw new Error("No EHR ID found");
      }
    } catch (error) {
      console.error("Error getting EHR ID:", error);
      // Return dummy data if openEHR is not available
      const dummyData = dummyCarePlansStore[patientid] || [];
      return NextResponse.json({ carePlans: dummyData });
    }

    if (!ehrId) {
      return NextResponse.json({ carePlans: [] });
    }

    // Get care plan list from openEHR with timeout protection
    let carePlansList;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching care plans list')), 30000)
      );
      carePlansList = await Promise.race([
        listCarePlans(ehrId),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Error or timeout fetching care plans list:", error);
      return NextResponse.json({
        carePlans: [],
        message: "EHRBase is slow or unavailable. Please try again later."
      }, { status: 200 });
    }

    // Fetch full details for each care plan with timeout protection
    const carePlans: CarePlan[] = [];
    for (const item of carePlansList) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        const fullComposition = await Promise.race([
          getCarePlan(ehrId, item.composition_uid),
          timeoutPromise
        ]);
        const parsed = parseCarePlanComposition(
          fullComposition,
          item.composition_uid,
          item.start_time
        );
        carePlans.push(parsed);
      } catch (error) {
        console.error(`Error or timeout fetching care plan ${item.composition_uid}:`, error);
        // Skip this care plan and continue with others
      }
    }

    return NextResponse.json({ carePlans });
  } catch (error) {
    console.error("Error fetching care plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/care-plans
 * Create a new care plan in openEHR
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

    // Only doctors can create care plans
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { carePlan } = body;

    // Fetch patient to get National ID for openEHR lookup
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get EHR ID from openEHR
    const ehrId = await getOpenEHREHRBySubjectId(patient.nationalid || patientid);

    if (!ehrId) {
      return NextResponse.json(
        { error: "EHR not found for patient" },
        { status: 404 }
      );
    }

    // Build openEHR composition in FLAT format
    // Map the 7 care plan fields to openEHR structure intelligently
    const composition: CarePlanComposition = {
      // Category (required) - using persistent category code
      "template_care_plan_v1/category|code": "431",
      "template_care_plan_v1/category|terminology": "openehr",
      "template_care_plan_v1/category|value": "persistent",

      // Context (required)
      "template_care_plan_v1/context/start_time": new Date().toISOString(),
      "template_care_plan_v1/context/setting|code": "238",
      "template_care_plan_v1/context/setting|value": "other care",
      "template_care_plan_v1/context/setting|terminology": "openehr",

      // Top-level metadata (required)
      "template_care_plan_v1/language|code": "en",
      "template_care_plan_v1/language|terminology": "ISO_639-1",
      "template_care_plan_v1/territory|code": "US",
      "template_care_plan_v1/territory|terminology": "ISO_3166-1",
      "template_care_plan_v1/composer|name": user.name || user.email,
    };

    // Map care plan expire to context end time
    if (carePlan.carePlanExpire) {
      composition["template_care_plan_v1/context/_end_time"] = new Date(carePlan.carePlanExpire).toISOString();
    }

    // Use a generic placeholder for Problem/Diagnosis (required by openEHR template)
    // This prevents care plans from appearing in diagnosis queries
    composition["template_care_plan_v1/problem_diagnosis/problem_diagnosis_name"] = "Care Plan - See Goal Section";
    composition["template_care_plan_v1/problem_diagnosis/language|code"] = "en";
    composition["template_care_plan_v1/problem_diagnosis/language|terminology"] = "ISO_639-1";
    composition["template_care_plan_v1/problem_diagnosis/encoding|code"] = "UTF-8";
    composition["template_care_plan_v1/problem_diagnosis/encoding|terminology"] = "IANA_character-sets";
    composition["template_care_plan_v1/problem_diagnosis/clinical_description"] = "This is a care plan composition. Actual care plan details are stored in the Goal and Service Request sections.";

    // Store actual Care Plan data in Goal section
    composition["template_care_plan_v1/goal/goal_name"] = carePlan.carePlanName;
    composition["template_care_plan_v1/goal/language|code"] = "en";
    composition["template_care_plan_v1/goal/language|terminology"] = "ISO_639-1";
    composition["template_care_plan_v1/goal/encoding|code"] = "UTF-8";
    composition["template_care_plan_v1/goal/encoding|terminology"] = "IANA_character-sets";
    
    // Map Description to goal description
    if (carePlan.carePlanDescription) {
      composition["template_care_plan_v1/goal/goal_description"] = carePlan.carePlanDescription;
    }
    
    // Map Reason to clinical indication
    if (carePlan.carePlanReason) {
      composition["template_care_plan_v1/goal/clinical_indication:0"] = carePlan.carePlanReason;
    }
    
    // Map Expire date to goal end date
    if (carePlan.carePlanExpire) {
      composition["template_care_plan_v1/goal/goal_end_date"] = carePlan.carePlanExpire;
    }
    
    // Map Comment to goal comment
    if (carePlan.carePlanComment) {
      composition["template_care_plan_v1/goal/goal_comment"] = carePlan.carePlanComment;
    }
    
    // Store completion date in goal section instead of problem diagnosis
    if (carePlan.carePlanCompleted) {
      // Use goal outcome to store completion information
      composition["template_care_plan_v1/goal/goal_outcome|other"] = `Completed on ${new Date(carePlan.carePlanCompleted).toLocaleDateString()}`;
    }

    // Map Care Plan Name to Service Request (required by openEHR template)
    composition["template_care_plan_v1/service_request/request/service_name|other"] = carePlan.carePlanName;
    composition["template_care_plan_v1/service_request/language|code"] = "en";
    composition["template_care_plan_v1/service_request/language|terminology"] = "ISO_639-1";
    composition["template_care_plan_v1/service_request/encoding|code"] = "UTF-8";
    composition["template_care_plan_v1/service_request/encoding|terminology"] = "IANA_character-sets";
    
    // Map Schedule to service description
    if (carePlan.carePlanSchedule) {
      composition["template_care_plan_v1/service_request/request/description"] = carePlan.carePlanSchedule;
    }
    
    // Map Reason to clinical indication
    if (carePlan.carePlanReason) {
      composition["template_care_plan_v1/service_request/request/clinical_indication"] = carePlan.carePlanReason;
    }

    // Create composition in openEHR
    const compositionUid = await createCarePlan(ehrId, composition);

    return NextResponse.json(
      {
        success: true,
        message: "Care plan created successfully in openEHR",
        compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating care plan:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

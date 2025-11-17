import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for referrals (dummy data)
// In production, this would be stored in EHRbase or a database
interface ReferralRecord {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  clinical_indication: string;
  urgency: string;
  comment?: string;
  referred_by: string;
  status: string;
}

// Initialize with dummy data for demonstration
const referralStore: Record<string, ReferralRecord[]> = {
  // Sample patient ID with dummy referrals
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "referral-1731847200000-001",
      recorded_time: "2024-11-15T10:30:00.000Z",
      physician_department: "Cardiology - Dr. Michael Chen, MD",
      clinical_indication: "Evaluation of chest pain and abnormal ECG findings. Patient reports intermittent chest discomfort on exertion. ECG shows ST-segment changes. Lipid panel shows elevated LDL (165 mg/dL).",
      urgency: "Routine",
      comment: "Patient has family history of coronary artery disease. Request stress test and echocardiogram. Please evaluate for possible coronary artery disease.",
      referred_by: "Dr. Sarah Mitchell, MD",
      status: "pending"
    },
    {
      composition_uid: "referral-1731674400000-002",
      recorded_time: "2024-11-10T14:15:00.000Z",
      physician_department: "Endocrinology - Dr. Patricia Williams, MD",
      clinical_indication: "Management of prediabetes and metabolic syndrome. Fasting glucose 110 mg/dL, HbA1c 6.2%. BMI 32. Patient struggling with weight management despite lifestyle modifications.",
      urgency: "Routine",
      comment: "Patient requires comprehensive diabetes prevention program. Please assess for insulin resistance and provide dietary counseling.",
      referred_by: "Dr. James Rodriguez, MD",
      status: "scheduled"
    },
    {
      composition_uid: "referral-1731501600000-003",
      recorded_time: "2024-11-05T09:00:00.000Z",
      physician_department: "Gastroenterology - Dr. Robert Taylor, MD",
      clinical_indication: "Chronic abdominal pain and altered bowel habits for 3 months. Patient reports alternating constipation and diarrhea. No red flag symptoms. Negative fecal occult blood test.",
      urgency: "Routine",
      comment: "Suspect irritable bowel syndrome. Please evaluate and recommend management plan. Consider colonoscopy if indicated.",
      referred_by: "Dr. Sarah Mitchell, MD",
      status: "completed"
    },
    {
      composition_uid: "referral-1730896800000-004",
      recorded_time: "2024-10-28T16:45:00.000Z",
      physician_department: "Orthopedics - Dr. David Anderson, MD",
      clinical_indication: "Chronic low back pain with radiculopathy. Pain radiating to left leg. MRI shows L4-L5 disc herniation with nerve root compression. Conservative management has failed.",
      urgency: "Urgent",
      comment: "Patient experiencing significant functional impairment. Failed 6 weeks of physical therapy and NSAIDs. Please evaluate for surgical intervention.",
      referred_by: "Dr. James Rodriguez, MD",
      status: "completed"
    },
    {
      composition_uid: "referral-1729687200000-005",
      recorded_time: "2024-10-15T11:20:00.000Z",
      physician_department: "Dermatology - Dr. Lisa Martinez, MD",
      clinical_indication: "Evaluation of suspicious skin lesion on upper back. Asymmetric pigmented lesion, 8mm diameter, irregular borders. Patient has history of significant sun exposure.",
      urgency: "Urgent",
      comment: "Concern for possible melanoma. Request urgent evaluation and biopsy if indicated. Patient anxious about findings.",
      referred_by: "Dr. Sarah Mitchell, MD",
      status: "completed"
    }
  ]
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/referrals
 * Retrieve referral records for a patient (from dummy data)
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

    // Only doctors and nurses can view referrals
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const records = referralStore[patientid] || [];

    return NextResponse.json({ referrals: records });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/referrals
 * Create a new referral record (dummy data storage)
 *
 * Follows openEHR Referral concepts:
 * - physician_department (referred to)
 * - clinical_indication (reason for referral)
 * - urgency (yes/no or priority level)
 * - comment (additional notes)
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

    // Only doctors can create referrals
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden - Only doctors can create referrals" }, { status: 403 });
    }

    const body = await request.json();
    const { referral } = body;

    const record = {
      composition_uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      physician_department: referral.physicianDepartment,
      clinical_indication: referral.clinicalIndication,
      urgency: referral.urgency, // "yes" or "no"
      comment: referral.comment,
      referred_by: user.name || user.email, // Track who made the referral
      status: "pending", // pending, accepted, completed, cancelled
    };

    if (!referralStore[patientid]) {
      referralStore[patientid] = [];
    }

    referralStore[patientid].unshift(record);

    console.log("✅ Referral recorded (dummy data):", record);

    return NextResponse.json(
      {
        success: true,
        message: "Referral created successfully",
        record,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating referral:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

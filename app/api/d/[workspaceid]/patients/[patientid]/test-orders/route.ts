import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for test orders (dummy data)
// In production, this would be stored in EHRbase or a database
interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  lab_type: string; // Clinic chemistry, Haematology, Microbiology, Immunology, X-Ray
  test_select: string; // Test name or Test package
  test_name?: string;
  test_package?: string;
  fasting_status: string; // Urgent or Routine
  order_type: string; // e.g., "Routine", "Urgent", "STAT"
  specimen_request?: string;
  clinical_indication?: string;
  billing_guidance?: string;
  comment?: string;
  ordered_by: string;
  status: string; // pending, in-progress, completed, cancelled
}

const testOrderStore: Record<string, TestOrderRecord[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/test-orders
 * Retrieve test orders for a patient (from dummy data)
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

    // Only doctors and nurses can view test orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get test orders from in-memory store
    const patientTestOrders = testOrderStore[patientid] || [];

    return NextResponse.json({ testOrders: patientTestOrders });
  } catch (error) {
    console.error("Error fetching test orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/test-orders
 * Create a new test order (dummy data storage)
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

    // Only doctors can create test orders
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { testOrder } = body;

    // Create test order record
    const testOrderRecord: TestOrderRecord = {
      composition_uid: `test-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      lab_type: testOrder.labType,
      test_select: testOrder.testSelect,
      test_name: testOrder.testName,
      test_package: testOrder.testPackage,
      fasting_status: testOrder.fastingStatus,
      order_type: testOrder.orderType,
      specimen_request: testOrder.specimenRequest,
      clinical_indication: testOrder.clinicalIndication,
      billing_guidance: testOrder.billingGuidance,
      comment: testOrder.comment,
      ordered_by: user.name || user.email,
      status: "pending",
    };

    // Store in memory (initialize array if doesn't exist)
    if (!testOrderStore[patientid]) {
      testOrderStore[patientid] = [];
    }
    testOrderStore[patientid].unshift(testOrderRecord); // Add to beginning

    console.log("✅ Test order created (dummy data):", testOrderRecord);

    return NextResponse.json(
      { 
        success: true,
        message: "Test order created successfully",
        record: testOrderRecord
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating test order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

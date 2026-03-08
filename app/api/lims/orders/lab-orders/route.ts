import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/tables/patient";
import { eq } from "drizzle-orm";
import { getOpenEHRTestOrders, TestOrderRecord, createOpenEHRComposition } from "@/lib/openehr/openehr";

interface EnrichedTestOrder extends TestOrderRecord {
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

    // Get all patients in this workspace
    const workspacePatients = await db
      .select()
      .from(patients)
      .where(eq(patients.workspaceid, workspaceid));

    console.log(`Found ${workspacePatients.length} patients in workspace ${workspaceid}`);
    console.log(`Patients with EHR IDs: ${workspacePatients.filter(p => p.ehrid).length}`);

    // Fetch test orders for all patients
    const allOrders = await Promise.all(
      workspacePatients.map(async (patient) => {
        if (!patient.ehrid) {
          console.log(`Patient ${patient.firstname} ${patient.lastname} has no EHR ID`);
          return [];
        }
        
        try {
          console.log(`Fetching orders for patient ${patient.firstname} ${patient.lastname} (EHR ID: ${patient.ehrid})`);
          const orders = await getOpenEHRTestOrders(patient.ehrid);
          console.log(`Found ${orders.length} orders for patient ${patient.firstname} ${patient.lastname}`);
          
          // Enrich orders with patient information
          return orders.map((order): EnrichedTestOrder => ({
            ...order,
            patient_id: patient.patientid,
            patient_name: `${patient.firstname} ${patient.lastname}`,
            patient_age: patient.dateofbirth 
              ? Math.floor((Date.now() - new Date(patient.dateofbirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null,
            patient_gender: patient.gender,
          }));
        } catch (error) {
          console.error(`Error fetching orders for patient ${patient.patientid}:`, error);
          return [];
        }
      })
    );

    // Flatten and sort by recorded_time
    const orders = allOrders
      .flat()
      .sort((a, b) => new Date(b.recorded_time).getTime() - new Date(a.recorded_time).getTime());

    console.log(`Total orders fetched: ${orders.length}`);
    console.log(`Order request IDs: ${orders.map(o => o.request_id).join(', ')}`);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching lab orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab orders" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.patientId || !body.orderType || !body.clinicalIndication) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, orderType, clinicalIndication" },
        { status: 400 }
      );
    }

    // Get patient information
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, body.patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!patient.ehrid) {
      return NextResponse.json(
        { error: "Patient has no EHR ID. Please update patient record first." },
        { status: 400 }
      );
    }

    // Create composition in openEHR
    const compositionData = {
      service_name: {
        "|archetype_node_id": "openEHR-EHR-ITEM_TREE.service_request.v1",
        "|name": "Service request",
        "items": [
          {
            "|archetype_node_id": "openEHR-EHR-ITEM_TREE.service_request.v1",
            "|name": "Service request",
            "items": [
              {
                "|archetype_node_id": "openEHR-EHR-ELEMENT.service_request_name.v1",
                "|name": "Service request name",
                "value": {
                  "|code": "snomed-ct::108252007::Laboratory procedure",
                  "|value": body.orderType,
                  "|terminology": "snomed-ct"
                }
              },
              {
                "|archetype_node_id": "openEHR-EHR-ELEMENT.clinical_indication.v1",
                "|name": "Clinical indication",
                "value": {
                  "|value": body.clinicalIndication
                }
              },
              {
                "|archetype_node_id": "openEHR-EHR-ELEMENT.timing_urgency.v1",
                "|name": "Timing urgency",
                "value": {
                  "|value": body.urgency || 'routine'
                }
              },
              {
                "|archetype_node_id": "openEHR-EHR-ELEMENT.narrative.v1",
                "|name": "Narrative",
                "value": {
                  "|value": body.comment || ''
                }
              },
              {
                "|archetype_node_id": "openEHR-EHR-ELEMENT.request_id.v1",
                "|name": "Request ID",
                "value": {
                  "|value": `OrderId-${Date.now()}`
                }
              }
            ]
          }
        ]
      }
    };

    const result = await createOpenEHRComposition(
      patient.ehrid,
      'template_clinical_encounter_v2.opt',
      compositionData
    );

    return NextResponse.json({
      success: true,
      message: "Lab order created successfully",
      compositionId: result,
      requestId: `OrderId-${Date.now()}`
    });
  } catch (error) {
    console.error("Error creating lab order:", error);
    return NextResponse.json(
      { error: "Failed to create lab order" },
      { status: 500 }
    );
  }
}

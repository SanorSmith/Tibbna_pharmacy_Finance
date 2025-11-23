import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import { 
  getOpenEHREHRBySubjectId, 
  createOpenEHRComposition,
  getOpenEHRCompositions,
  getOpenEHRComposition
} from "@/lib/openehr/openehr";
import axios from "axios";

// Test Order interface matching the OpenEHR template structure
interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  request_id: string;
  narrative: string;
}

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

    // Get pagination parameters from query string
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view test orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`Fetching test orders for patient ${patientid} with limit=${limit}, offset=${offset}`);

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ error: "No EHR found for this patient" }, { status: 404 });
    }

    // Fetch compositions from OpenEHR
    const compositions = await getOpenEHRCompositions(ehrId);

    // Filter compositions that likely contain service requests by checking archetype_node_id
    // This reduces unnecessary API calls
    const serviceRequestCompositions = compositions.filter(comp => {
      // Only fetch compositions that might have service requests
      // We'll check the actual data in the next step
      return true; // For now, we need to check all since we can't filter by archetype in the list
    });

    console.log(`Found ${compositions.length} total compositions, checking for test orders...`);

    // Fetch full details only for compositions and filter for test orders
    const allTestOrders = await Promise.all(
      serviceRequestCompositions.map(async (comp) => {
        try {
          const details = await getOpenEHRComposition(ehrId, comp.composition_uid) as Record<string, unknown>;
          
          // Quick check: does this composition have service_request data?
          const hasServiceRequest = Object.keys(details).some(key => 
            key.includes('service_request')
          );
          
          if (!hasServiceRequest) {
            return null; // Skip compositions without service requests
          }
          
          // Extract test order from composition details using correct template paths
          const compositionData = details as Record<string, unknown>;

          // Try multiple possible paths for service request data
          let serviceRequestData = compositionData["template_clinical_encounter_v1/service_request"] as Record<string, unknown>;
          
          if (!serviceRequestData) {
            // Try direct access
            serviceRequestData = compositionData as Record<string, unknown>;
          }
          
          const serviceName = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/service_name|other"] as string ||
            serviceRequestData["service_name|other"] as string ||
            serviceRequestData["service_request/request/service_name|other"] as string;
          
          const clinicalIndication = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/clinical_indication"] as string ||
            serviceRequestData["clinical_indication"] as string ||
            serviceRequestData["service_request/request/clinical_indication"] as string;

          if (!serviceName && !clinicalIndication) {
            return null;
          }

          // Extract all fields using the exact template paths
          const serviceTypeCode = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/service_type|code"] as string ||
            serviceRequestData["service_type|code"] as string ||
            serviceRequestData["service_request/request/service_type|code"] as string;
          
          const serviceTypeValue = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/service_type|value"] as string ||
            serviceRequestData["service_type|value"] as string ||
            serviceRequestData["service_request/request/service_type|value"] as string;
          
          const description = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/description"] as string ||
            serviceRequestData["description"] as string ||
            serviceRequestData["service_request/request/description"] as string;
          
          // Extract test type and urgency from description (format: "Test Type: value (Code: code) | Urgency: urgency")
          let extractedServiceTypeCode = "";
          let extractedServiceTypeValue = "";
          let extractedUrgencyFromDesc = "";
          if (description) {
            const typeMatch = description.match(/Test Type: (.+?) \(Code: (.+?)\)/);
            if (typeMatch) {
              extractedServiceTypeValue = typeMatch[1];
              extractedServiceTypeCode = typeMatch[2] !== 'N/A' ? typeMatch[2] : '';
            }
            
            const urgencyMatch = description.match(/Urgency: (\w+)/);
            if (urgencyMatch) {
              extractedUrgencyFromDesc = urgencyMatch[1].toLowerCase();
            }
          }
          
          const narrativeText = 
            serviceRequestData["template_clinical_encounter_v1/service_request/narrative"] as string ||
            serviceRequestData["narrative"] as string ||
            serviceRequestData["service_request/narrative"] as string;
          
          // Extract urgency from narrative (format: "TestName (urgency) ordered due to...")
          let extractedUrgency = "routine";
          if (narrativeText) {
            const urgencyMatch = narrativeText.match(/\(([^)]+)\) ordered due to/);
            if (urgencyMatch) {
              extractedUrgency = urgencyMatch[1].toLowerCase();
            }
          }
          
          const urgency = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/urgency|value"] as string ||
            serviceRequestData["urgency|value"] as string ||
            serviceRequestData["service_request/request/urgency|value"] as string ||
            extractedUrgencyFromDesc || // Prioritize urgency from description
            extractedUrgency; // Fallback to narrative extraction
          
          const requestingProvider = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/requesting_provider"] as string ||
            serviceRequestData["requesting_provider"] as string ||
            serviceRequestData["service_request/request/requesting_provider"] as string;
          
          const receivingProvider = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/receiving_provider"] as string ||
            serviceRequestData["receiving_provider"] as string ||
            serviceRequestData["service_request/request/receiving_provider"] as string;
          
          const requestStatus = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request/request_status|value"] as string ||
            serviceRequestData["request_status|value"] as string ||
            serviceRequestData["service_request/request/request_status|value"] as string;
          
          const requestId = 
            serviceRequestData["template_clinical_encounter_v1/service_request/request_id"] as string ||
            serviceRequestData["request_id"] as string ||
            serviceRequestData["service_request/request_id"] as string;

          const testOrder: TestOrderRecord = {
            composition_uid: comp.composition_uid,
            recorded_time: comp.start_time,
            service_name: serviceName || "",
            service_type_code: serviceTypeCode || extractedServiceTypeCode || "",
            service_type_value: serviceTypeValue || extractedServiceTypeValue || "",
            description: description || "",
            clinical_indication: clinicalIndication || "",
            urgency: urgency?.toLowerCase() || "routine",
            requesting_provider: requestingProvider || "",
            receiving_provider: receivingProvider || "",
            request_status: requestStatus?.toLowerCase() || "ordered",
            request_id: requestId || "",
            narrative: narrativeText || "",
          };

          return testOrder;
        } catch (error) {
          console.error(`Error processing composition ${comp.composition_uid}:`, error);
          return null;
        }
      })
    );

    // Filter out null entries and sort by date
    const validTestOrders = allTestOrders.filter((testOrder): testOrder is TestOrderRecord => testOrder !== null)
      .sort((a, b) => new Date(b.recorded_time).getTime() - new Date(a.recorded_time).getTime());

    // Apply pagination
    const totalFilteredCount = validTestOrders.length;
    const hasMore = offset + limit < totalFilteredCount;
    const paginatedTestOrders = validTestOrders.slice(offset, offset + limit);

    // Removed excessive logging
    return NextResponse.json({ testOrders: paginatedTestOrders, hasMore });
  } catch (error) {
    console.error("Error fetching test orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch test orders" },
      { status: 500 }
    );
  }
}

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
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can create test orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      service_name,
      service_type_code,
      service_type_value,
      clinical_indication,
      urgency,
      requesting_provider,
      receiving_provider,
      narrative,
    } = body.testOrder;
    
    console.log("DEBUG: Received testOrder data:", body.testOrder);
    console.log("DEBUG: urgency value:", urgency);
    console.log("DEBUG: requesting_provider value:", requesting_provider);

    // Validate required fields
    if (!service_name || !clinical_indication) {
      return NextResponse.json({ 
        error: "Service name and clinical indication are required" 
      }, { status: 400 });
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ error: "No EHR found for this patient" }, { status: 404 });
    }

    // Create composition data in FLAT format using correct template paths
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v1/context/start_time": new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Add test order to composition using exact template paths
    const eventTime = new Date().toISOString();

    // Service Request Details - store data without problematic coded fields
    compositionData["template_clinical_encounter_v1/service_request/request/service_name|other"] = service_name;
    compositionData["template_clinical_encounter_v1/service_request/request/description"] = `Test Type: ${service_type_value || 'Not specified'} (Code: ${service_type_code || 'N/A'}) | Urgency: ${urgency || 'routine'}`; // Store test type and urgency in description
    compositionData["template_clinical_encounter_v1/service_request/request/clinical_indication"] = clinical_indication;
    compositionData["template_clinical_encounter_v1/service_request/request/requested_date"] = eventTime;
    compositionData["template_clinical_encounter_v1/service_request/request/requesting_provider"] = requesting_provider || "Dr. Unknown";
    
    console.log("DEBUG: requesting_provider value:", requesting_provider);
    console.log("DEBUG: user.name:", user.name);
    compositionData["template_clinical_encounter_v1/service_request/request/receiving_provider"] = receiving_provider || "Clinical Laboratory";
    compositionData["template_clinical_encounter_v1/service_request/request/timing"] = eventTime;
    compositionData["template_clinical_encounter_v1/service_request/request_id"] = `testreq-${Date.now()}`;
    compositionData["template_clinical_encounter_v1/service_request/narrative"] = narrative || `${service_name} (${urgency || 'routine'}) ordered due to ${clinical_indication}`; // Include urgency in narrative
    compositionData["template_clinical_encounter_v1/service_request/language|code"] = "en";
    compositionData["template_clinical_encounter_v1/service_request/language|terminology"] = "ISO_639-1";
    compositionData["template_clinical_encounter_v1/service_request/encoding|code"] = "UTF-8";
    compositionData["template_clinical_encounter_v1/service_request/encoding|terminology"] = "IANA_character-sets";

    console.log("Creating test order composition with data:", JSON.stringify(compositionData, null, 2));

    // Create the composition in OpenEHR
    const compositionId = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    console.log(`Created test order composition: ${compositionId}`);

    return NextResponse.json({
      success: true,
      compositionId,
      message: "Test order created successfully",
    });
  } catch (error) {
    console.error("Error creating test order:", error);
    return NextResponse.json(
      { error: "Failed to create test order" },
      { status: 500 }
    );
  }
}

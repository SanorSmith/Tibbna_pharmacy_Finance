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
  getOpenEHRComposition,
} from "@/lib/openehr/openehr";

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view lab orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      return NextResponse.json({
        labOrders: [],
        message: "No EHR found for this patient",
      });
    }

    // Fetch all compositions for this EHR
    const compositions = await getOpenEHRCompositions(ehrId);

    // Filter and process lab order compositions
    const allLabOrders = await Promise.all(
      compositions.map(async (comp) => {
        try {
          const fullComposition = await getOpenEHRComposition(
            ehrId,
            comp.composition_uid
          );
          const details = fullComposition as Record<string, unknown>;

          console.log(
            `Checking composition ${comp.composition_uid}:`,
            JSON.stringify(details, null, 2)
          );

          // Check if this composition contains lab order data - try multiple possible paths
          const serviceName =
            (details[
              "template_clinical_encounter_v2/service_request/request/service_name|other"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/service_name|other"
            ] as string) ||
            (details["service_name|other"] as string);

          const serviceTypeCode =
            (details[
              "template_clinical_encounter_v2/service_request/request/service_type|code"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/service_type|code"
            ] as string) ||
            (details["service_type|code"] as string);

          const serviceTypeValue =
            (details[
              "template_clinical_encounter_v2/service_request/request/service_type|value"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/service_type|value"
            ] as string) ||
            (details["service_type|value"] as string);

          const description =
            (details[
              "template_clinical_encounter_v2/service_request/request/description"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/description"
            ] as string) ||
            (details["description"] as string);

          const clinicalIndication =
            (details[
              "template_clinical_encounter_v2/service_request/request/clinical_indication"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/clinical_indication"
            ] as string) ||
            (details["clinical_indication"] as string);

          const urgency =
            (details[
              "template_clinical_encounter_v2/service_request/request/urgency|value"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/urgency|value"
            ] as string) ||
            (details["urgency|value"] as string);

          const requestedDate =
            (details[
              "template_clinical_encounter_v2/service_request/request/requested_date"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/requested_date"
            ] as string) ||
            (details["requested_date"] as string);

          const requestingProvider =
            (details[
              "template_clinical_encounter_v2/service_request/request/requesting_provider"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/requesting_provider"
            ] as string) ||
            (details["requesting_provider"] as string);

          const receivingProvider =
            (details[
              "template_clinical_encounter_v2/service_request/request/receiving_provider"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/receiving_provider"
            ] as string) ||
            (details["receiving_provider"] as string);

          const requestStatus =
            (details[
              "template_clinical_encounter_v2/service_request/request/request_status|value"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/request_status|value"
            ] as string) ||
            (details["request_status|value"] as string);

          const timing =
            (details[
              "template_clinical_encounter_v2/service_request/request/timing"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request/timing"
            ] as string) ||
            (details["timing"] as string);

          const requestId =
            (details[
              "template_clinical_encounter_v2/service_request/request_id"
            ] as string) ||
            (details[
              "template_clinical_encounter_v2/service_request_id"
            ] as string) ||
            (details["request_id"] as string);

          const narrative =
            (details[
              "template_clinical_encounter_v2/service_request/narrative"
            ] as string) ||
            (details["template_clinical_encounter_v2/narrative"] as string) ||
            (details["narrative"] as string);

          console.log(
            `Extracted data - serviceName: ${serviceName}, clinicalIndication: ${clinicalIndication}`
          );

          // Only return if there's actual lab order data
          if (serviceName && clinicalIndication) {
            console.log(
              `Composition ${comp.composition_uid} has lab order: ${serviceName}`
            );
            return {
              composition_uid: comp.composition_uid,
              recorded_time: comp.start_time,
              service_name: serviceName,
              service_type_code: serviceTypeCode || "",
              service_type_value: serviceTypeValue || "",
              description: description || "",
              clinical_indication: clinicalIndication,
              urgency: urgency || "routine",
              requested_date: requestedDate || comp.start_time,
              requesting_provider: requestingProvider || "",
              receiving_provider: receivingProvider || "",
              request_status: requestStatus || "ordered",
              timing: timing || "",
              request_id: requestId || "",
              narrative: narrative || "",
            };
          } else {
            console.log(
              `Skipping composition ${comp.composition_uid} - no lab order data`
            );
            return null;
          }
        } catch (error) {
          console.error(
            `Failed to fetch composition ${comp.composition_uid}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out null entries and sort by date
    const validLabOrders = allLabOrders
      .filter(
        (labOrder): labOrder is NonNullable<typeof labOrder> =>
          labOrder !== null
      )
      .sort(
        (a, b) =>
          new Date(b.recorded_time).getTime() -
          new Date(a.recorded_time).getTime()
      );

    // Apply pagination
    const totalFilteredCount = validLabOrders.length;
    const hasMore = offset + limit < totalFilteredCount;
    const paginatedResults = validLabOrders.slice(offset, offset + limit);

    return NextResponse.json({
      labOrders: paginatedResults,
      hasMore,
      total: totalFilteredCount,
    });
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

    // Only doctors and nurses can create lab orders
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      service_name,
      service_type_code,
      service_type_value,
      description,
      clinical_indication,
      urgency,
      requesting_provider,
      receiving_provider,
      timing,
      narrative,
    } = body.labOrder;

    // Validate required fields
    if (!service_name || !clinical_indication) {
      return NextResponse.json(
        {
          error: "Service name and clinical indication are required",
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Create composition data in FLAT format using correct template paths
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v2/language|code": "en",
      "template_clinical_encounter_v2/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v2/territory|code": "US",
      "template_clinical_encounter_v2/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v2/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v2/context/start_time":
        new Date().toISOString(),
      "template_clinical_encounter_v2/context/setting|code": "238",
      "template_clinical_encounter_v2/context/setting|value": "other care",
      "template_clinical_encounter_v2/context/setting|terminology": "openehr",
      "template_clinical_encounter_v2/category|code": "433",
      "template_clinical_encounter_v2/category|value": "event",
      "template_clinical_encounter_v2/category|terminology": "openehr",
    };

    // Add lab order to composition using correct template paths
    const eventTime = new Date().toISOString();

    // Service Request Details - exact match to your template
    compositionData[
      "template_clinical_encounter_v2/service_request/request/service_name|other"
    ] = service_name;
    compositionData[
      "template_clinical_encounter_v2/service_request/request/service_type|terminology"
    ] = "SNOMED-CT";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/service_type|code"
    ] = service_type_code || "104177005";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/service_type|value"
    ] = service_type_value || "Complete blood count (procedure)";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/description"
    ] = description || "";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/clinical_indication"
    ] = clinical_indication;
    compositionData[
      "template_clinical_encounter_v2/service_request/request/urgency|value"
    ] = urgency.charAt(0).toUpperCase() + urgency.slice(1); // Capitalize first letter
    compositionData[
      "template_clinical_encounter_v2/service_request/request/urgency|terminology"
    ] = "local";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/urgency|code"
    ] = urgency;
    compositionData[
      "template_clinical_encounter_v2/service_request/request/requested_date"
    ] = eventTime;
    compositionData[
      "template_clinical_encounter_v2/service_request/request/requesting_provider"
    ] = requesting_provider || "Dr. Unknown";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/receiving_provider"
    ] = receiving_provider || "Clinical Laboratory";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/request_status|terminology"
    ] = "local";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/request_status|code"
    ] = "ordered";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/request_status|value"
    ] = "Ordered";
    compositionData[
      "template_clinical_encounter_v2/service_request/request/timing"
    ] = timing || eventTime;
    compositionData[
      "template_clinical_encounter_v2/service_request/request_id"
    ] = `labreq-${Date.now()}`;
    compositionData[
      "template_clinical_encounter_v2/service_request/narrative"
    ] = narrative || `${service_name} ordered due to ${clinical_indication}`;
    compositionData[
      "template_clinical_encounter_v2/service_request/language|code"
    ] = "en";
    compositionData[
      "template_clinical_encounter_v2/service_request/language|terminology"
    ] = "ISO_639-1";
    compositionData[
      "template_clinical_encounter_v2/service_request/encoding|code"
    ] = "UTF-8";
    compositionData[
      "template_clinical_encounter_v2/service_request/encoding|terminology"
    ] = "IANA_character-sets";

    console.log(
      "Creating composition with data:",
      JSON.stringify(compositionData, null, 2)
    );

    // Create the composition in OpenEHR
    const compositionId = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v2",
      compositionData
    );

    console.log(`Created lab order composition: ${compositionId}`);

    return NextResponse.json({
      success: true,
      compositionId,
      message: "Lab order created successfully",
    });
  } catch (error) {
    console.error("Error creating lab order:", error);
    return NextResponse.json(
      { error: "Failed to create lab order" },
      { status: 500 }
    );
  }
}

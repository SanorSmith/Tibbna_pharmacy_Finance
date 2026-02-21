/**
 * API Endpoint: Fetch OpenEHR Laboratory Orders for Patient
 * GET /api/d/[workspaceid]/patients/[patientid]/openehr-lab-orders
 * 
 * Fetches laboratory order compositions from OpenEHR for a specific patient
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import axios from "axios";
import { getOpenEHROrderStatus } from "@/lib/openehr-order-status";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

interface RouteParams {
  params: {
    workspaceid: string;
    patientid: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;

    // Fetch patient to get EHR ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient has EHR ID
    if (!patient.ehrid) {
      return NextResponse.json({
        labOrders: [],
        message: "Patient does not have an OpenEHR EHR ID",
      });
    }

    // Fetch laboratory orders from OpenEHR
    const orders = await listLaboratoryOrders(patient.ehrid);

    // Fetch full composition data for each order
    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const compositionUrl = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${patient.ehrid}/composition/${order.composition_uid}?format=FLAT`;
          
          const response = await axios.get(compositionUrl, {
            headers: {
              "X-API-Key": process.env.EHRBASE_API_KEY!,
              Authorization: `Basic ${basicAuth}`,
              Accept: "application/json",
            },
          });

          const composition = response.data;
          
          // Parse the FLAT composition to extract order details
          const parsedOrder = parseLabOrderComposition(composition, order.composition_uid);
          
          // Compute actual status based on collected samples
          if (parsedOrder.request_id) {
            try {
              const computedStatus = await getOpenEHROrderStatus(parsedOrder.request_id);
              parsedOrder.request_status = computedStatus;
            } catch (statusError) {
              console.error(`Error computing status for order ${parsedOrder.request_id}:`, statusError);
              // Keep default REQUESTED status if computation fails
            }
          }
          
          return parsedOrder;
        } catch (error) {
          console.error(`Error fetching composition ${order.composition_uid}:`, error);
          return null;
        }
      })
    );

    // Filter out failed fetches and sort by date
    const validOrders = detailedOrders
      .filter(order => order !== null)
      .sort((a, b) => new Date(b!.recorded_time).getTime() - new Date(a!.recorded_time).getTime());

    return NextResponse.json({
      labOrders: validOrders,
      count: validOrders.length,
    });

  } catch (error) {
    console.error("Error fetching OpenEHR lab orders:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch laboratory orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Parse CANONICAL format laboratory order composition
 */
function parseLabOrderComposition(composition: Record<string, any>, compositionUid: string) {
  // Extract from composition context
  const startTime = composition.context?.start_time?.value || composition.context?.start_time || new Date().toISOString();
  const composerName = composition.composer?.name || "Unknown";
  
  // Extract from content (INSTRUCTION)
  const instruction = composition.content?.[0];
  const activities = instruction?.activities?.[0];
  const description = activities?.description;
  
  // Extract service requested from description items
  let serviceName = "Laboratory Test";
  let requestId = "";
  let priority = "ROUTINE";
  
  if (description?.items) {
    for (const item of description.items) {
      const itemName = item.name?.value || "";
      if (itemName === "Service requested") {
        serviceName = item.value?.value || serviceName;
      } else if (itemName === "Request ID") {
        requestId = item.value?.value || item.value?.id || "";
      } else if (itemName === "Priority") {
        priority = item.value?.value || priority;
      }
    }
  }

  return {
    composition_uid: compositionUid,
    recorded_time: startTime,
    request_id: requestId,
    service_name: serviceName,
    service_type_code: "104177005",
    service_type_value: "Laboratory test request",
    description: serviceName,
    clinical_indication: "",
    urgency: priority.toLowerCase(),
    requested_date: startTime,
    requesting_provider: composerName,
    receiving_provider: "Laboratory",
    request_status: "REQUESTED",
    timing: priority.toLowerCase(),
    narrative: serviceName,
    specimen_type: "",
    source: "openEHR" as const,
  };
}

/**
 * List laboratory orders from OpenEHR
 */
async function listLaboratoryOrders(
  ehrId: string
): Promise<LaboratoryOrderListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/archetype_id/value = 'openEHR-EHR-COMPOSITION.request.v1' ORDER BY c/context/start_time/value DESC`;

  const response = await axios.post(
    url,
    { q: query },
    {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rows = response.data.rows || [];
  return rows.map((row: unknown[]) => ({
    composition_uid: row[0] as string,
    composition_name: row[1] as string,
    start_time: row[2] as string,
  }));
}

export interface LaboratoryOrderListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}

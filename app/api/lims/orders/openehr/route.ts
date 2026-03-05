/**
 * OpenEHR Lab Orders API Route
 * GET /api/lims/orders/openehr
 * 
 * Fetches lab orders from openEHR for all patients in a workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOpenEHRTestOrders, TestOrderRecord } from "@/lib/openehr/openehr";

/**
 * GET /api/lims/orders/openehr
 * Fetch lab orders from openEHR for all patients in a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceid");
    const patientId = searchParams.get("patientid");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Get patients in workspace
    const workspacePatients = await db
      .select()
      .from(patients)
      .where(
        patientId 
          ? and(eq(patients.workspaceid, workspaceId), eq(patients.patientid, patientId))
          : eq(patients.workspaceid, workspaceId)
      );
    
    const patientsWithEhr = workspacePatients.filter(p => p.ehrid);

    console.log(`Found ${patientsWithEhr.length} patients with EHR IDs in workspace ${workspaceId}`);

    const allOrders: Array<TestOrderRecord & { patientId: string; patientName: string }> = [];
    
    for (const patient of patientsWithEhr) {
      try {
        const orders = await getOpenEHRTestOrders(patient.ehrid!);
        
        const ordersWithPatient = orders.map(order => ({
          ...order,
          patientId: patient.patientid,
          patientName: [patient.firstname, patient.middlename, patient.lastname].filter(Boolean).join(' '),
        }));
        
        allOrders.push(...ordersWithPatient);
      } catch (error) {
        console.error(`Error fetching orders for patient ${patient.patientid}:`, error);
      }
    }

    allOrders.sort((a, b) => 
      new Date(b.recorded_time).getTime() - new Date(a.recorded_time).getTime()
    );

    return NextResponse.json({
      orders: allOrders,
      count: allOrders.length,
      patientsScanned: patientsWithEhr.length,
    });
  } catch (error) {
    console.error("Error fetching openEHR orders:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch openEHR orders",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * OpenEHR Order Status API
 * 
 * GET endpoint to retrieve the computed status of an OpenEHR order
 * based on its samples' validation states
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getOpenEHROrderStatus } from "@/lib/openehr-order-status";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; requestid: string }> }
) {
  try {
    const { workspaceid, requestid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the computed status for this OpenEHR order
    const status = await getOpenEHROrderStatus(requestid);

    return NextResponse.json({ 
      openehrrequestid: requestid,
      status,
      source: "computed"
    });
  } catch (error) {
    console.error("Error fetching OpenEHR order status:", error);
    return NextResponse.json(
      { error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}

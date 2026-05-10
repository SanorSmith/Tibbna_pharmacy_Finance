/**
 * Batch OpenEHR Order Status API
 * 
 * POST endpoint to retrieve computed statuses for multiple OpenEHR orders
 * in a single request instead of N individual calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getOpenEHROrderStatuses } from "@/lib/openehr-order-status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requestIds: string[] = body.requestIds || [];

    if (requestIds.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const statusMap = await getOpenEHROrderStatuses(requestIds);

    // Convert Map to plain object for JSON
    const statuses: Record<string, string> = {};
    statusMap.forEach((status, id) => {
      statuses[id] = status;
    });

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Error fetching batch OpenEHR order statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch order statuses" },
      { status: 500 }
    );
  }
}

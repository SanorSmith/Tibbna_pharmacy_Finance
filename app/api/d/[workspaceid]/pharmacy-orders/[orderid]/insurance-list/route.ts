/**
 * API: /api/d/[workspaceid]/pharmacy-orders/[orderid]/insurance-list
 * - GET: Get available insurance options for the order
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Return a list of available insurance companies
    const insuranceCompanies = [
      { id: "asia", name: "Asia Insurance", coverage: 85, status: "active" },
      { id: "gulf", name: "Gulf Insurance", coverage: 90, status: "active" },
      { id: "national", name: "National Insurance", coverage: 80, status: "active" },
      { id: "iraqi", name: "Iraqi Insurance", coverage: 75, status: "active" },
      { id: "baghdad", name: "Baghdad Insurance", coverage: 70, status: "active" },
      { id: "mosul", name: "Mosul Insurance", coverage: 65, status: "inactive" },
      { id: "basra", name: "Basra Insurance", coverage: 60, status: "inactive" },
    ];

    return NextResponse.json(insuranceCompanies);
  } catch (error) {
    console.error("Error fetching insurance list:", error);
    return NextResponse.json({ error: "Failed to fetch insurance list" }, { status: 500 });
  }
}

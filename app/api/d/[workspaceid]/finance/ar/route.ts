/**
 * Finance — Accounts Receivable API
 *
 * GET /api/d/[workspaceid]/finance/ar — List AR transactions
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { listArTransactions } from "@/lib/finance/services/ar-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ar:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      customertype: searchParams.get("customertype") || undefined,
      customerid: searchParams.get("customerid") || undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    const transactions = await listArTransactions(workspaceid, filters);
    return NextResponse.json({ transactions });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ar");
  }
}

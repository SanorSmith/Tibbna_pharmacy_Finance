/**
 * Finance — Fiscal Periods API
 *
 * GET  /api/d/[workspaceid]/finance/periods — List periods
 * POST /api/d/[workspaceid]/finance/periods — Create single period (rarely used)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { listPeriods } from "@/lib/finance/services/period-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:periods:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      fiscalyear: searchParams.has("year")
        ? parseInt(searchParams.get("year")!, 10)
        : undefined,
      status: searchParams.get("status") || undefined,
    };

    const periods = await listPeriods(workspaceid, filters);
    return NextResponse.json({ periods });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/periods");
  }
}

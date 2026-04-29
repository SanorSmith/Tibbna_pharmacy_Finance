/**
 * Finance — Dashboard KPIs
 *
 * GET /api/d/[workspaceid]/finance/reports/dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getFinanceDashboard } from "@/lib/finance/services/reports-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:reports:read");
    if (auth instanceof NextResponse) return auth;

    const kpis = await getFinanceDashboard(workspaceid);
    return NextResponse.json(kpis);
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/reports/dashboard");
  }
}

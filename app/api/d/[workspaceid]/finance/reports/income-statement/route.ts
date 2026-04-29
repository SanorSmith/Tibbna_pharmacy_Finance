/**
 * Finance — Income Statement (P&L) Report
 *
 * GET /api/d/[workspaceid]/finance/reports/income-statement?periodid=uuid
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getIncomeStatement } from "@/lib/finance/services/reports-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:reports:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const periodid = searchParams.get("periodid");

    if (!periodid) {
      return NextResponse.json(
        { error: "periodid query parameter is required" },
        { status: 400 }
      );
    }

    const report = await getIncomeStatement(workspaceid, periodid);
    return NextResponse.json(report);
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/reports/income-statement");
  }
}

/**
 * Finance — AR Aging Report API
 *
 * GET /api/d/[workspaceid]/finance/ar/aging
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getArAging } from "@/lib/finance/services/ar-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ar:read");
    if (auth instanceof NextResponse) return auth;

    const aging = await getArAging(workspaceid);
    return NextResponse.json({ aging });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ar/aging");
  }
}

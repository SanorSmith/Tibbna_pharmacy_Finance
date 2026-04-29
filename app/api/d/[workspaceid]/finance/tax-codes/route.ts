/**
 * Finance — Tax Codes API
 *
 * GET  /api/d/[workspaceid]/finance/tax-codes — List tax codes
 * POST /api/d/[workspaceid]/finance/tax-codes — Create tax code
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateTaxCodeSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  listTaxCodes,
  createTaxCode,
} from "@/lib/finance/services/tax-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:settings:read");
    if (auth instanceof NextResponse) return auth;

    const taxCodes = await listTaxCodes(workspaceid);
    return NextResponse.json({ taxCodes });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/tax-codes");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:settings:write");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateTaxCodeSchema.parse(body);
    const taxCode = await createTaxCode(workspaceid, validated);

    return NextResponse.json({ taxCode }, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/tax-codes");
  }
}

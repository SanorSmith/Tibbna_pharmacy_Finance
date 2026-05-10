/**
 * Finance — AP Payments API
 *
 * GET  /api/d/[workspaceid]/finance/ap/payments — List AP payments
 * POST /api/d/[workspaceid]/finance/ap/payments — Create AP payment
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateApPaymentSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  listApPayments,
  createApPayment,
} from "@/lib/finance/services/ap-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ap:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      vendorid: searchParams.get("vendorid") || undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    const payments = await listApPayments(workspaceid, filters);
    return NextResponse.json({ payments });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ap/payments");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ap:pay");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateApPaymentSchema.parse(body);
    const payment = await createApPayment(workspaceid, validated, auth.user.userid);

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/ap/payments");
  }
}

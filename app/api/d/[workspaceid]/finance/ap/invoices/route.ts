/**
 * Finance — AP Invoices API
 *
 * GET  /api/d/[workspaceid]/finance/ap/invoices — List AP invoices
 * POST /api/d/[workspaceid]/finance/ap/invoices — Create AP invoice
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateApInvoiceSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  listApInvoices,
  createApInvoice,
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
      status: searchParams.get("status") || undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    const result = await listApInvoices(workspaceid, filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ap/invoices");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ap:write");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateApInvoiceSchema.parse(body);
    const invoice = await createApInvoice(workspaceid, validated, auth.user.userid);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/ap/invoices");
  }
}

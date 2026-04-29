/**
 * Finance — Single AP Invoice API
 *
 * GET  /api/d/[workspaceid]/finance/ap/invoices/[apinvoiceid]
 * POST /api/d/[workspaceid]/finance/ap/invoices/[apinvoiceid] — Post invoice to GL
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  getApInvoiceById,
  postApInvoice,
} from "@/lib/finance/services/ap-service";

type RouteParams = {
  params: Promise<{ workspaceid: string; apinvoiceid: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, apinvoiceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ap:read");
    if (auth instanceof NextResponse) return auth;

    const invoice = await getApInvoiceById(workspaceid, apinvoiceid);
    if (!invoice) {
      return NextResponse.json({ error: "AP invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ap/invoices/[id]");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, apinvoiceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:ap:approve");
    if (auth instanceof NextResponse) return auth;

    const invoice = await postApInvoice(workspaceid, apinvoiceid, auth.user.userid);
    return NextResponse.json({ invoice });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/ap/invoices/[id]");
  }
}

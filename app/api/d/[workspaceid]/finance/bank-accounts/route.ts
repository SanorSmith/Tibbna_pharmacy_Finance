/**
 * Finance — Bank & Cash Accounts API
 *
 * GET  /api/d/[workspaceid]/finance/bank-accounts — List bank accounts
 * POST /api/d/[workspaceid]/finance/bank-accounts — Create bank account
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateBankAccountSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  listBankAccounts,
  createBankAccount,
} from "@/lib/finance/services/bank-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:bank:read");
    if (auth instanceof NextResponse) return auth;

    const accounts = await listBankAccounts(workspaceid);
    return NextResponse.json({ accounts });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/bank-accounts");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:bank:write");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateBankAccountSchema.parse(body);
    const account = await createBankAccount(workspaceid, validated);

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/bank-accounts");
  }
}

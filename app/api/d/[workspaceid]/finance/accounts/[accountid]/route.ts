/**
 * Finance — Chart of Accounts (Single Account) API
 *
 * GET    /api/d/[workspaceid]/finance/accounts/[accountid] — Get account
 * PUT    /api/d/[workspaceid]/finance/accounts/[accountid] — Update account
 * DELETE /api/d/[workspaceid]/finance/accounts/[accountid] — Deactivate account
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { UpdateAccountSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  getAccountById,
  updateAccount,
  deactivateAccount,
} from "@/lib/finance/services/coa-service";

type RouteParams = {
  params: Promise<{ workspaceid: string; accountid: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, accountid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:accounts:read"
    );
    if (auth instanceof NextResponse) return auth;

    const account = await getAccountById(workspaceid, accountid);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ account });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/accounts/[id]");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, accountid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:accounts:write"
    );
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = UpdateAccountSchema.parse(body);
    const account = await updateAccount(
      workspaceid,
      accountid,
      validated,
      auth.user.userid
    );

    return NextResponse.json({ account });
  } catch (error) {
    return handleFinanceApiError(error, "PUT /finance/accounts/[id]");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, accountid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:accounts:write"
    );
    if (auth instanceof NextResponse) return auth;

    await deactivateAccount(workspaceid, accountid, auth.user.userid);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleFinanceApiError(error, "DELETE /finance/accounts/[id]");
  }
}

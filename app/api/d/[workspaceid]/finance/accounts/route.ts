/**
 * Finance — Chart of Accounts API
 *
 * GET  /api/d/[workspaceid]/finance/accounts — List accounts
 * POST /api/d/[workspaceid]/finance/accounts — Create account
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateAccountSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { listAccounts, createAccount } from "@/lib/finance/services/coa-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:accounts:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      accounttype: searchParams.get("accounttype") || undefined,
      isactive: searchParams.has("isactive")
        ? searchParams.get("isactive") === "true"
        : undefined,
    };

    const accounts = await listAccounts(workspaceid, filters);
    return NextResponse.json({ accounts });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/accounts");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:accounts:write");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateAccountSchema.parse(body);
    const account = await createAccount(workspaceid, validated, auth.user.userid);

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/accounts");
  }
}

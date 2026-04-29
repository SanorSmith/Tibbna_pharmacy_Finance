/**
 * Finance — Seed Chart of Accounts from Template
 *
 * POST /api/d/[workspaceid]/finance/accounts/seed
 * Seeds the healthcare_pharmacy COA template into a workspace.
 * Rejects if the workspace already has accounts.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { SeedCOASchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { seedCOA } from "@/lib/finance/services/coa-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:accounts:write"
    );
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    SeedCOASchema.parse(body);

    const result = await seedCOA(workspaceid, auth.user.userid);

    return NextResponse.json(
      {
        success: true,
        accountsCreated: result.accountsCreated,
        message: `Chart of Accounts seeded from healthcare_pharmacy template`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/accounts/seed");
  }
}

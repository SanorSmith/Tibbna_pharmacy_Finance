/**
 * Finance — Auto-Generate Fiscal Periods
 *
 * POST /api/d/[workspaceid]/finance/periods/generate
 * Creates 12 monthly periods for a given year.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { GeneratePeriodsSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { generatePeriods } from "@/lib/finance/services/period-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:periods:close"
    );
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = GeneratePeriodsSchema.parse(body);

    const result = await generatePeriods(workspaceid, validated.year);

    return NextResponse.json(
      {
        success: true,
        periodsCreated: result.periodsCreated,
        message: `Created ${result.periodsCreated} monthly periods for ${validated.year}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/periods/generate");
  }
}

/**
 * Finance — Unified Posting Engine API
 *
 * POST /api/d/[workspaceid]/finance/posting
 * Entry point for automated postings from pharmacy events and manual use.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { PostingRequestSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { postFinancialEvent } from "@/lib/finance/services/posting-engine";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:journal:post"
    );
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = PostingRequestSchema.parse(body);

    const result = await postFinancialEvent({
      workspaceid,
      sourcetype: validated.sourcetype,
      sourceid: validated.sourceid ?? null,
      date: validated.date,
      description: validated.description ?? "",
      lines: validated.lines.map((l) => ({
        accountcode: l.accountcode,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo ?? undefined,
      })),
      metadata: validated.metadata,
      userid: auth.user.userid,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        PERIOD_CLOSED: 422,
        DUPLICATE_CONFLICT: 409,
        ACCOUNT_NOT_FOUND: 404,
        INTERNAL_ERROR: 500,
      };
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusMap[result.code] || 500 }
      );
    }

    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
    });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/posting");
  }
}

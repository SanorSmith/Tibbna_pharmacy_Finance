/**
 * Finance — Reverse a Posted Journal
 *
 * POST /api/d/[workspaceid]/finance/journal-entries/[journalid]/reverse
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { reverseJournal } from "@/lib/finance/services/posting-engine";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ workspaceid: string; journalid: string }>;
};

const ReverseSchema = z.object({
  reason: z.string().min(1, "Reversal reason is required").max(500),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, journalid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:journal:reverse"
    );
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { reason } = ReverseSchema.parse(body);

    const result = await reverseJournal(
      workspaceid,
      journalid,
      reason,
      auth.user.userid
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleFinanceApiError(
      error,
      "POST /finance/journal-entries/[id]/reverse"
    );
  }
}

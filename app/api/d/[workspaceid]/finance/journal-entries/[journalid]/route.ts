/**
 * Finance — Single Journal Entry API
 *
 * GET /api/d/[workspaceid]/finance/journal-entries/[journalid]
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getJournalWithLines } from "@/lib/finance/services/journal-service";

type RouteParams = {
  params: Promise<{ workspaceid: string; journalid: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, journalid } = await params;
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:journal:read"
    );
    if (auth instanceof NextResponse) return auth;

    const journal = await getJournalWithLines(workspaceid, journalid);
    if (!journal) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ journal });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/journal-entries/[id]");
  }
}

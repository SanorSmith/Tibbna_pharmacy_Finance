/**
 * Finance — Journal Entries API
 *
 * GET  /api/d/[workspaceid]/finance/journal-entries — List entries
 * POST /api/d/[workspaceid]/finance/journal-entries — Create manual entry
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateJournalEntrySchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  listJournalEntries,
  createManualJournal,
} from "@/lib/finance/services/journal-service";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:journal:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get("status") || undefined,
      sourcetype: searchParams.get("sourcetype") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    const result = await listJournalEntries(workspaceid, filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/journal-entries");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:journal:create");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateJournalEntrySchema.parse(body);

    const result = await createManualJournal(
      workspaceid,
      validated,
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
    return handleFinanceApiError(error, "POST /finance/journal-entries");
  }
}

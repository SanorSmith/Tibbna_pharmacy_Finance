/**
 * Finance — Single Period API
 *
 * GET /api/d/[workspaceid]/finance/periods/[periodid]
 * PUT /api/d/[workspaceid]/finance/periods/[periodid] — Close/Reopen
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  getPeriodById,
  closePeriod,
  reopenPeriod,
} from "@/lib/finance/services/period-service";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ workspaceid: string; periodid: string }>;
};

const UpdatePeriodSchema = z.object({
  action: z.enum(["close", "reopen"]),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, periodid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:periods:read");
    if (auth instanceof NextResponse) return auth;

    const period = await getPeriodById(workspaceid, periodid);
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    return NextResponse.json({ period });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/periods/[id]");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, periodid } = await params;
    const auth = await requireFinancePermission(workspaceid, "finance:periods:close");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { action } = UpdatePeriodSchema.parse(body);

    let period;
    if (action === "close") {
      period = await closePeriod(workspaceid, periodid, auth.user.userid);
    } else {
      period = await reopenPeriod(workspaceid, periodid);
    }

    return NextResponse.json({ period });
  } catch (error) {
    return handleFinanceApiError(error, "PUT /finance/periods/[id]");
  }
}

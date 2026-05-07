/**
 * POS Return Receipt API
 *
 * GET — Get return receipt data for reprint
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posReturns,
  posReturnItems,
  posRefundTransactions,
  posSales,
  users,
  workspaces,
  posReturnReasons,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { returnId } = await params;

    // Get return with reason
    const [returnRecord] = await db
      .select({
        return: posReturns,
        reason: posReturnReasons,
      })
      .from(posReturns)
      .leftJoin(
        posReturnReasons,
        eq(posReturns.returnreasonid, posReturnReasons.reasonid)
      )
      .where(eq(posReturns.returnid, returnId))
      .limit(1);

    if (!returnRecord) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    // Get workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, returnRecord.return.workspaceid))
      .limit(1);

    // Get original sale
    const [originalSale] = await db
      .select()
      .from(posSales)
      .where(eq(posSales.saleid, returnRecord.return.originalsaleid))
      .limit(1);

    // Get return items
    const items = await db
      .select()
      .from(posReturnItems)
      .where(eq(posReturnItems.returnid, returnId))
      .orderBy(posReturnItems.returnitemid);

    // Get refund transactions
    const refunds = await db
      .select({
        refund: posRefundTransactions,
        cashier: users,
      })
      .from(posRefundTransactions)
      .leftJoin(users, eq(posRefundTransactions.processedby, users.userid))
      .where(eq(posRefundTransactions.returnid, returnId))
      .orderBy(posRefundTransactions.createdat);

    return NextResponse.json({
      workspace: workspace || null,
      return: returnRecord.return,
      reason: returnRecord.reason || null,
      originalSale: originalSale || null,
      items: items.map((item) => ({
        ...item,
        unitPrice: parseFloat(item.unitprice),
        totalPrice: parseFloat(item.totalprice),
      })),
      refunds: refunds.map((r) => ({
        ...r.refund,
        refundAmount: parseFloat(r.refund.refundamount),
        cashier: r.cashier?.name || r.cashier?.email || "Unknown",
      })),
    });
  } catch (error) {
    console.error("[Return Receipt] Error:", error);
    return NextResponse.json({ error: "Failed to get return receipt" }, { status: 500 });
  }
}

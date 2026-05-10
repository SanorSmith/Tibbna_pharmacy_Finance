/**
 * POS Sale Receipt API
 *
 * GET — Get full sale receipt data (with items, payments) for reprint
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posSales,
  posSaleItems,
  posPayments,
  posShifts,
  users,
  workspaces,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { saleId } = await params;

    // Get sale with cashier and shift
    const [sale] = await db
      .select({
        sale: posSales,
        cashier: users,
        shift: posShifts,
      })
      .from(posSales)
      .leftJoin(users, eq(posSales.cashierid, users.userid))
      .leftJoin(posShifts, eq(posSales.shiftid, posShifts.shiftid))
      .where(eq(posSales.saleid, saleId))
      .limit(1);

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Get workspace info
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, sale.sale.workspaceid))
      .limit(1);

    // Get sale items
    const items = await db
      .select()
      .from(posSaleItems)
      .where(eq(posSaleItems.saleid, saleId))
      .orderBy(posSaleItems.itemid);

    // Get payments
    const payments = await db
      .select()
      .from(posPayments)
      .where(eq(posPayments.saleid, saleId))
      .orderBy(posPayments.paymentid);

    return NextResponse.json({
      workspace: workspace || null,
      sale: sale.sale,
      cashier: sale.cashier || null,
      shift: sale.shift || null,
      items: items.map((item) => ({
        ...item,
        unitPrice: parseFloat(item.unitprice),
        taxAmount: parseFloat(item.taxamount),
        discountAmount: parseFloat(item.discountamount),
        totalAmount: parseFloat(item.totalamount),
      })),
      payments: payments.map((p) => ({
        ...p,
        amount: parseFloat(p.amount),
        insuranceCoverage: p.insurancecoverage
          ? parseFloat(p.insurancecoverage)
          : null,
        patientCopay: p.patientcopay ? parseFloat(p.patientcopay) : null,
      })),
    });
  } catch (error) {
    console.error("[Sale Receipt] Error:", error);
    return NextResponse.json({ error: "Failed to get sale receipt" }, { status: 500 });
  }
}

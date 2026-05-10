/**
 * POS Receipt Search API
 *
 * POST — Search receipts by receipt number, phone, name, date range
 * Returns sales, returns, and shift reports matching criteria
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posSales,
  posSaleItems,
  posPayments,
  posReturns,
  posReturnItems,
  posShifts,
  users,
} from "@/lib/db/schema";
import { eq, and, or, gte, lte, like, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const searchSchema = z.object({
  workspaceId: z.string().uuid(),
  receiptNumber: z.string().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  receiptType: z.enum(["SALE", "RETURN", "SHIFT", "ALL"]).default("ALL"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = searchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const results: any = { sales: [], returns: [], shifts: [] };

    // Date conditions
    const dateConditions: any[] = [];
    if (data.startDate) {
      dateConditions.push(gte(sql`DATE(saledate)`, data.startDate));
    }
    if (data.endDate) {
      dateConditions.push(lte(sql`DATE(saledate)`, data.endDate));
    }

    // Search sales
    if (data.receiptType === "SALE" || data.receiptType === "ALL") {
      const saleConditions: any[] = [
        eq(posSales.workspaceid, data.workspaceId),
        eq(posSales.status, "COMPLETED"),
      ];

      if (data.receiptNumber) {
        saleConditions.push(like(posSales.salenumber, `%${data.receiptNumber}%`));
      }
      if (data.customerPhone) {
        saleConditions.push(
          like(posSales.customerphone || "", `%${data.customerPhone}%`)
        );
      }
      if (data.customerName) {
        saleConditions.push(
          like(posSales.customername || "", `%${data.customerName}%`)
        );
      }
      saleConditions.push(...dateConditions);

      const sales = await db
        .select({
          sale: posSales,
          cashier: users,
        })
        .from(posSales)
        .leftJoin(users, eq(posSales.cashierid, users.userid))
        .where(and(...saleConditions))
        .orderBy(sql`${posSales.saledate} DESC`)
        .limit(50);

      results.sales = sales.map((s) => ({
        type: "SALE",
        id: s.sale.saleid,
        receiptNumber: s.sale.salenumber,
        date: s.sale.saledate,
        customerName: s.sale.customername,
        customerPhone: s.sale.customerphone,
        totalAmount: parseFloat(s.sale.totalamount),
        cashier: s.cashier?.name || s.cashier?.email || "Unknown",
      }));
    }

    // Search returns
    if (data.receiptType === "RETURN" || data.receiptType === "ALL") {
      const returnConditions: any[] = [
        eq(posReturns.workspaceid, data.workspaceId),
        eq(posReturns.status, "COMPLETED"),
      ];

      if (data.receiptNumber) {
        returnConditions.push(
          like(posReturns.returnnumber, `%${data.receiptNumber}%`)
        );
      }
      if (data.customerPhone) {
        returnConditions.push(
          like(posReturns.customerphone || "", `%${data.customerPhone}%`)
        );
      }
      if (data.customerName) {
        returnConditions.push(
          like(posReturns.customername || "", `%${data.customerName}%`)
        );
      }

      if (data.startDate) {
        returnConditions.push(gte(sql`DATE(returndate)`, data.startDate));
      }
      if (data.endDate) {
        returnConditions.push(lte(sql`DATE(returndate)`, data.endDate));
      }

      const returns = await db
        .select()
        .from(posReturns)
        .where(and(...returnConditions))
        .orderBy(sql`${posReturns.returndate} DESC`)
        .limit(50);

      results.returns = returns.map((r) => ({
        type: "RETURN",
        id: r.returnid,
        receiptNumber: r.returnnumber,
        date: r.returndate,
        customerName: r.customername,
        customerPhone: r.customerphone,
        totalAmount: parseFloat(r.refundamount),
        originalSaleNumber: r.originalsalenumber,
      }));
    }

    // Search shifts
    if (data.receiptType === "SHIFT" || data.receiptType === "ALL") {
      const shiftConditions: any[] = [
        eq(posShifts.workspaceid, data.workspaceId),
      ];

      if (data.receiptNumber) {
        shiftConditions.push(
          like(posShifts.shiftnumber, `%${data.receiptNumber}%`)
        );
      }

      if (data.startDate) {
        shiftConditions.push(gte(sql`DATE(openingtime)`, data.startDate));
      }
      if (data.endDate) {
        shiftConditions.push(lte(sql`DATE(openingtime)`, data.endDate));
      }

      const shifts = await db
        .select({
          shift: posShifts,
          cashier: users,
        })
        .from(posShifts)
        .leftJoin(users, eq(posShifts.cashierid, users.userid))
        .where(and(...shiftConditions))
        .orderBy(sql`${posShifts.openingtime} DESC`)
        .limit(50);

      results.shifts = shifts.map((s) => ({
        type: "SHIFT",
        id: s.shift.shiftid,
        receiptNumber: s.shift.shiftnumber,
        date: s.shift.openingtime,
        cashier: s.cashier?.name || s.cashier?.email || "Unknown",
        totalAmount: parseFloat(s.shift.totalsales),
        status: s.shift.status,
      }));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Receipt Search] Error:", error);
    return NextResponse.json({ error: "Failed to search receipts" }, { status: 500 });
  }
}

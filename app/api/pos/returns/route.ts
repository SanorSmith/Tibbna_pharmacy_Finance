/**
 * POS Returns API
 *
 * POST — Create a new return (full, partial, or exchange)
 * GET  — List returns for a workspace (filterable by status, shift)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posReturns,
  posReturnItems,
  posRefundTransactions,
  posReturnReasons,
  posSales,
  posSaleItems,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

// ── Validation ───────────────────────────────────────────────────────────────

const returnItemSchema = z.object({
  saleItemId: z.string().uuid(),
  drugId: z.string().uuid().optional().nullable(),
  drugName: z.string(),
  batchId: z.string().uuid().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  quantityReturned: z.number().int().positive(),
  originalQuantity: z.number().int().positive().optional(),
  unitPrice: z.number().nonnegative(),
  itemCondition: z.enum(["NEW", "OPENED", "DAMAGED", "DEFECTIVE", "EXPIRED"]).default("OPENED"),
  notes: z.string().optional(),
});

const createReturnSchema = z.object({
  workspaceId: z.string().uuid(),
  originalSaleId: z.string().uuid(),
  returnType: z.enum(["FULL_RETURN", "PARTIAL_RETURN", "EXCHANGE"]),
  returnReasonId: z.string().uuid().optional().nullable(),
  returnNotes: z.string().optional(),
  items: z.array(returnItemSchema).min(1),
  refundMethod: z.enum(["CASH", "CARD", "STORE_CREDIT", "ORIGINAL_METHOD"]),
  shiftId: z.string().uuid().optional().nullable(),
});

// ── POST: Create Return ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createReturnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get original sale
    const [originalSale] = await db
      .select()
      .from(posSales)
      .where(eq(posSales.saleid, data.originalSaleId))
      .limit(1);

    if (!originalSale) {
      return NextResponse.json(
        { error: "Original sale not found" },
        { status: 404 }
      );
    }

    if (originalSale.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only return completed sales" },
        { status: 400 }
      );
    }

    // Get return reason details (for restocking fee, approval)
    let returnReason: any = null;
    if (data.returnReasonId) {
      const [reason] = await db
        .select()
        .from(posReturnReasons)
        .where(eq(posReturnReasons.reasonid, data.returnReasonId))
        .limit(1);
      returnReason = reason;
    }

    // Calculate totals
    let totalReturnAmount = 0;
    for (const item of data.items) {
      totalReturnAmount += item.unitPrice * item.quantityReturned;
    }

    // Calculate restocking fee
    let restockingFee = 0;
    if (returnReason?.applyrestockingfee) {
      restockingFee =
        totalReturnAmount *
        (parseFloat(returnReason.restockingfeepercentage || "0") / 100);
    }

    const refundAmount = totalReturnAmount - restockingFee;

    // Generate return number: RET-YYYYMMDD-NNNNNN
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const returnNumber = `RET-${today}-${Date.now().toString().slice(-6)}`;

    // Check if requires approval
    const requiresApproval =
      returnReason?.requiresapproval || refundAmount > 500000; // > 500K IQD

    // Create return record
    const [returnRecord] = await db
      .insert(posReturns)
      .values({
        returnnumber: returnNumber,
        workspaceid: data.workspaceId,
        originalsaleid: data.originalSaleId,
        originalsalenumber: originalSale.salenumber,
        originalsaledate: originalSale.saledate,
        returntype: data.returnType,
        returnreasonid: data.returnReasonId || null,
        returnnotes: data.returnNotes || null,
        patientid: originalSale.patientid,
        customername: originalSale.customername,
        customerphone: originalSale.customerphone,
        totalreturnamount: totalReturnAmount.toFixed(2),
        restockingfee: restockingFee.toFixed(2),
        refundamount: refundAmount.toFixed(2),
        refundmethod: data.refundMethod,
        status: requiresApproval ? "PENDING" : "COMPLETED",
        requiresapproval: requiresApproval,
        processedby: user.userid,
        processedat: new Date(),
        shiftid: data.shiftId || null,
      })
      .returning();

    // Create return items
    for (const item of data.items) {
      const restockEligible =
        item.itemCondition !== "DAMAGED" && item.itemCondition !== "EXPIRED";

      await db.insert(posReturnItems).values({
        returnid: returnRecord.returnid,
        originalsaleitemid: item.saleItemId,
        drugid: item.drugId || null,
        drugname: item.drugName,
        batchid: item.batchId || null,
        lotnumber: item.lotNumber || null,
        quantityreturned: item.quantityReturned,
        originalquantity: item.originalQuantity || null,
        unitprice: item.unitPrice.toFixed(2),
        totalprice: (item.unitPrice * item.quantityReturned).toFixed(2),
        itemcondition: item.itemCondition,
        restockeligible: restockEligible,
        restocked: !requiresApproval && restockEligible, // Auto-restock if no approval needed
        itemnotes: item.notes || null,
      });
    }

    // If auto-approved, process refund and restock inventory
    if (!requiresApproval) {
      await db.insert(posRefundTransactions).values({
        returnid: returnRecord.returnid,
        refundamount: refundAmount.toFixed(2),
        refundmethod: data.refundMethod,
        processedby: user.userid,
      });

      // Restock inventory for eligible items
      for (const item of data.items) {
        const restockEligible =
          item.itemCondition !== "DAMAGED" && item.itemCondition !== "EXPIRED";

        if (restockEligible && item.batchId) {
          // Find item_id from batch
          const batchResult = await db.execute(sql`
            SELECT item_id FROM item_batches WHERE id = ${item.batchId} LIMIT 1
          `);
          const itemId = (batchResult as any)?.[0]?.item_id;

          if (itemId) {
            // Get warehouse_id from current stock record
            const stockResult = await db.execute(sql`
              SELECT warehouse_id FROM inventory_stock
              WHERE item_id = ${itemId} AND batch_id = ${item.batchId}
              LIMIT 1
            `);
            const warehouseId = (stockResult as any)?.[0]?.warehouse_id;

            if (warehouseId) {
              // Add quantity back to inventory_stock
              await db.execute(sql`
                UPDATE inventory_stock
                SET quantity = quantity + ${item.quantityReturned},
                    last_updated = NOW()
                WHERE item_id = ${itemId}
                  AND batch_id = ${item.batchId}
                  AND warehouse_id = ${warehouseId}
              `);

              // Create stock_transaction audit record
              await db.execute(sql`
                INSERT INTO stock_transactions (
                  item_id, warehouse_id, batch_id,
                  transaction_type, quantity,
                  reference_type, reference_id,
                  notes, created_by
                ) VALUES (
                  ${itemId}, ${warehouseId}, ${item.batchId},
                  'RETURN', ${item.quantityReturned},
                  'POS_RETURN', ${returnRecord.returnid},
                  ${`POS Return ${returnNumber} - ${item.drugName}`},
                  ${user.userid}
                )
              `);
              console.log(`[POS Return] Restocked ${item.quantityReturned}x ${item.drugName}`);
            }
          }
        }
      }

      // Update original sale status if fully returned
      if (data.returnType === "FULL_RETURN") {
        await db
          .update(posSales)
          .set({ status: "REFUNDED", updatedat: new Date() })
          .where(eq(posSales.saleid, data.originalSaleId));
      }
    }

    return NextResponse.json(
      {
        return: returnRecord,
        returnNumber,
        refundAmount,
        requiresApproval,
        message: requiresApproval
          ? "Return submitted for manager approval"
          : "Return processed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Returns Create] Error:", error);
    return NextResponse.json(
      { error: "Failed to create return" },
      { status: 500 }
    );
  }
}

// ── GET: List Returns ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const status = searchParams.get("status");
    const shiftId = searchParams.get("shiftId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    const conditions: any[] = [eq(posReturns.workspaceid, workspaceId)];

    if (status) {
      conditions.push(eq(posReturns.status, status as any));
    }
    if (shiftId) {
      conditions.push(eq(posReturns.shiftid, shiftId));
    }

    const returns = await db
      .select({
        return: posReturns,
        reason: posReturnReasons,
      })
      .from(posReturns)
      .leftJoin(
        posReturnReasons,
        eq(posReturns.returnreasonid, posReturnReasons.reasonid)
      )
      .where(and(...conditions))
      .orderBy(desc(posReturns.returndate))
      .limit(50);

    return NextResponse.json({ returns });
  } catch (error) {
    console.error("[Returns List] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

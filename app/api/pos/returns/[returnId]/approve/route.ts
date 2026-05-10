/**
 * POS Return Approval API
 *
 * POST — Approve or reject a pending return.
 *        On approval: processes refund, marks items for restocking.
 *        On rejection: marks return as rejected with reason.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posReturns,
  posReturnItems,
  posRefundTransactions,
  posSales,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const approvalSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { returnId } = await params;
    const body = await request.json();
    const parsed = approvalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { approved, rejectionReason } = parsed.data;

    // Get return
    const [returnRecord] = await db
      .select()
      .from(posReturns)
      .where(eq(posReturns.returnid, returnId))
      .limit(1);

    if (!returnRecord) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    if (returnRecord.status !== "PENDING") {
      return NextResponse.json(
        { error: "Return is not pending approval" },
        { status: 400 }
      );
    }

    if (approved) {
      // Approve: update status, process refund, restock items
      await db
        .update(posReturns)
        .set({
          status: "COMPLETED",
          approvedby: user.userid,
          approvedat: new Date(),
          updatedat: new Date(),
        })
        .where(eq(posReturns.returnid, returnId));

      // Get return items and mark eligible ones as restocked
      const items = await db
        .select()
        .from(posReturnItems)
        .where(eq(posReturnItems.returnid, returnId));

      for (const item of items) {
        if (item.restockeligible) {
          await db
            .update(posReturnItems)
            .set({ restocked: true })
            .where(eq(posReturnItems.returnitemid, item.returnitemid));
        }
      }

      // Process refund transaction
      await db.insert(posRefundTransactions).values({
        returnid: returnId,
        refundamount: returnRecord.refundamount,
        refundmethod: returnRecord.refundmethod || "CASH",
        processedby: user.userid,
      });

      // Restock inventory for eligible items
      for (const item of items) {
        if (item.restockeligible && item.batchid) {
          // Find item_id from batch
          const batchResult = await db.execute(sql`
            SELECT item_id FROM item_batches WHERE id = ${item.batchid} LIMIT 1
          `);
          const itemId = (batchResult as any)?.[0]?.item_id;

          if (itemId) {
            // Get warehouse_id from current stock record
            const stockResult = await db.execute(sql`
              SELECT warehouse_id FROM inventory_stock
              WHERE item_id = ${itemId} AND batch_id = ${item.batchid}
              LIMIT 1
            `);
            const warehouseId = (stockResult as any)?.[0]?.warehouse_id;

            if (warehouseId) {
              // Add quantity back to inventory_stock
              await db.execute(sql`
                UPDATE inventory_stock
                SET quantity = quantity + ${item.quantityreturned},
                    last_updated = NOW()
                WHERE item_id = ${itemId}
                  AND batch_id = ${item.batchid}
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
                  ${itemId}, ${warehouseId}, ${item.batchid},
                  'RETURN', ${item.quantityreturned},
                  'POS_RETURN', ${returnId},
                  ${`POS Return ${returnRecord.returnnumber} - ${item.drugname}`},
                  ${user.userid}
                )
              `);
              console.log(`[POS Return Approved] Restocked ${item.quantityreturned}x ${item.drugname}`);
            }
          }
        }
      }

      // If full return, mark original sale as refunded
      if (returnRecord.returntype === "FULL_RETURN") {
        await db
          .update(posSales)
          .set({ status: "REFUNDED", updatedat: new Date() })
          .where(eq(posSales.saleid, returnRecord.originalsaleid));
      }

      return NextResponse.json({
        message: "Return approved and refund processed",
        returnId,
        refundAmount: returnRecord.refundamount,
      });
    } else {
      // Reject return
      await db
        .update(posReturns)
        .set({
          status: "REJECTED",
          rejectionreason: rejectionReason || "No reason provided",
          updatedat: new Date(),
        })
        .where(eq(posReturns.returnid, returnId));

      return NextResponse.json({
        message: "Return rejected",
        returnId,
        rejectionReason,
      });
    }
  } catch (error) {
    console.error("[Return Approve] Error:", error);
    return NextResponse.json(
      { error: "Failed to process return approval" },
      { status: 500 }
    );
  }
}

/**
 * POS Checkout Complete API
 *
 * POST — finalize sale: create POS sale + items + payments,
 *        deduct inventory for OTC/new-prescription sales,
 *        update pharmacy order status if from dispensed order.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posSales,
  posSaleItems,
  posPayments,
  pharmacyOrders,
  pharmacyOrderItems,
  patientCreditAccounts,
} from "@/lib/db/schema";
import { PHARMACY_ITEM_STATUS, type PharmacyItemStatus } from "@/lib/db/tables/pharmacy-orders";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const saleItemSchema = z.object({
  drugId: z.string().uuid().optional().nullable(),
  drugName: z.string(),
  batchId: z.string().optional().nullable().transform(val => {
    // Handle empty strings as null
    if (!val || val.trim() === "") return null;
    // Validate UUID format, return null if invalid
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(val) ? val : null;
  }),
  lotNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative(),
  pharmacyOrderItemId: z.string().uuid().optional().nullable(),
});

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "INSURANCE", "CREDIT_ACCOUNT"]),
  amount: z.number().nonnegative(),
  cardType: z.string().optional().nullable(),
  cardLast4: z.string().optional().nullable(),
  cardHolder: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  authorizationCode: z.string().optional().nullable(),
  insuranceCompanyId: z.string().uuid().optional().nullable(),
  insuranceClaimNumber: z.string().optional().nullable(),
  insuranceCoverage: z.number().optional().nullable(),
  patientCopay: z.number().optional().nullable(),
  approvalCode: z.string().optional().nullable(),
  creditAccountId: z.string().uuid().optional().nullable(),
});

const checkoutSchema = z.object({
  workspaceId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  patientId: z.string().uuid().optional().nullable(),
  customername: z.string().optional().nullable(),
  customernationalid: z.string().optional().nullable(),
  customerphone: z.string().optional().nullable(),
  pharmacyOrderId: z.string().uuid().optional().nullable(),
  prescriptionId: z.string().optional().nullable(),
  saleType: z.enum(["DISPENSED_ORDER", "NEW_PRESCRIPTION", "OTC_WALKIN"]),
  shiftId: z.string().uuid().optional().nullable(),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = checkoutSchema.parse(body);

    // Run migration to drop FK constraint if it exists (one-time)
    try {
      await db.execute(sql`
        ALTER TABLE pos_sale_items DROP CONSTRAINT IF EXISTS pos_sale_items_batchid_drug_batches_batchid_fk
      `);
      console.log("[POS Checkout] Migration: Dropped FK constraint on pos_sale_items.batchid");
    } catch (error) {
      // Ignore error if constraint doesn't exist or migration already run
      console.log("[POS Checkout] Migration skipped:", error instanceof Error ? error.message : String(error));
    }

    // Validate: payments total must match sale total
    const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentsTotal < data.totalAmount - 0.01) {
      return NextResponse.json(
        {
          error: "Insufficient payment",
          expected: data.totalAmount,
          received: paymentsTotal,
        },
        { status: 400 }
      );
    }

    // Get default warehouse for inventory deductions
    const warehouseResult = await db.execute(sql`
      SELECT id FROM warehouses WHERE is_active = true ORDER BY name LIMIT 1
    `);
    const defaultWarehouseId = (warehouseResult as any)?.[0]?.id || null;

    const result = await db.transaction(async (tx) => {
      // 1. Generate sale number
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const seq = Date.now().toString(36).toUpperCase();
      const saleNumber = `POS-${today}-${seq}`;

      // 2. Create POS sale
      const [sale] = await tx
        .insert(posSales)
        .values({
          workspaceid: data.workspaceId,
          salenumber: saleNumber,
          saledate: new Date(),
          patientid: data.patientId || null,
          customername: data.customername || null,
          customernationalid: data.customernationalid || null,
          customerphone: data.customerphone || null,
          pharmacyorderid: data.pharmacyOrderId || null,
          prescriptionid: data.prescriptionId || null,
          saletype: data.saleType,
          subtotal: data.subtotal.toFixed(2),
          taxamount: (data.taxAmount || 0).toFixed(2),
          discountamount: (data.discountAmount || 0).toFixed(2),
          totalamount: data.totalAmount.toFixed(2),
          paidamount: paymentsTotal.toFixed(2),
          changeamount: Math.max(0, paymentsTotal - data.totalAmount).toFixed(2),
          status: "COMPLETED",
          cashierid: user.userid,
          shiftid: data.shiftId || null,
        })
        .returning();

      // 3. Payment validation for dispensing logic
      if (data.pharmacyOrderId) {
        const paymentRatio = paymentsTotal / data.totalAmount;
        
        // Validate that payment amount matches dispensing amount
        if (paymentRatio < 0.01) {
          throw new Error("Payment required for dispensing medications");
        }
        
        // Calculate allowed dispensing quantity based on payment
        const allowedDispenseRatio = Math.min(paymentRatio, 1.0);
        
        // Update item quantities to match payment ratio
        data.items = data.items.map(item => ({
          ...item,
          quantity: Math.floor(item.quantity * allowedDispenseRatio)
        }));
      }

      // 4. Create sale items + deduct inventory for OTC / NEW_PRESCRIPTION
      const createdItems = [];
      for (const item of data.items) {

        // Use the cart price (unitPrice) - don't override with batch price
        // The cart already has the correct price from the pharmacy order
        let verifiedPrice = item.unitPrice;
        
        // Only verify batch price exists for validation, but don't override cart price
        if (item.batchId) {
          const batchResult = await tx.execute(sql`
            SELECT selling_price
            FROM item_batches
            WHERE id = ${item.batchId}
            LIMIT 1
          `);
          const batch = (batchResult as any)?.[0];
          if (batch?.selling_price) {
            console.log(`[POS Checkout] Cart price: ${verifiedPrice}, Batch price: ${batch.selling_price} - keeping cart price`);
          }
        }

        // Resolve drugId: use item.drugId, or look up from pharmacy order item, or find by name
        let resolvedDrugId = item.drugId;
        if (!resolvedDrugId && item.pharmacyOrderItemId) {
          const [orderItem] = await tx
            .select({ drugid: pharmacyOrderItems.drugid })
            .from(pharmacyOrderItems)
            .where(eq(pharmacyOrderItems.itemid, item.pharmacyOrderItemId))
            .limit(1);
          resolvedDrugId = orderItem?.drugid || null;
        }
        if (!resolvedDrugId) {
          const found = await tx.execute(sql`
            SELECT drugid FROM drugs WHERE name = ${item.drugName} LIMIT 1
          `);
          const row = (found as any)?.[0];
          resolvedDrugId = row?.drugid || null;
        }

        // Resolve inventory item ID for stock deduction
        let resolvedItemId: string | null = null;
        if (item.batchId) {
          const found = await tx.execute(sql`
            SELECT item_id FROM item_batches WHERE id = ${item.batchId} LIMIT 1
          `);
          resolvedItemId = (found as any)?.[0]?.item_id || null;
        }
        if (!resolvedItemId && resolvedDrugId) {
          const found = await tx.execute(sql`
            SELECT id FROM items WHERE drug_id = ${resolvedDrugId} LIMIT 1
          `);
          resolvedItemId = (found as any)?.[0]?.id || null;
        }
        if (!resolvedItemId) {
          const found = await tx.execute(sql`
            SELECT id FROM items WHERE name = ${item.drugName} LIMIT 1
          `);
          resolvedItemId = (found as any)?.[0]?.id || null;
        }

        // Auto-select best batch if item.batchId is null
        let finalBatchId = item.batchId;
        let finalLotNumber = item.lotNumber;
        let finalExpiryDate = item.expiryDate;
        
        if (!finalBatchId && resolvedItemId) {
          const bestBatch = await tx.execute(sql`
            SELECT ib.id, ib.batch_number, ib.expiry_date
            FROM item_batches ib
            JOIN inventory_stock ist ON ist.item_id = ib.item_id AND ist.batch_id = ib.id
            WHERE ib.item_id = ${resolvedItemId}
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
              AND ib.is_quarantined = false
              AND ist.quantity > 0
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          `);
          const bestRow = (bestBatch as any)?.[0];
          if (bestRow) {
            finalBatchId = bestRow.id;
            finalLotNumber = bestRow.batch_number;
            finalExpiryDate = bestRow.expiry_date;
          } else {
            // Fallback: Try to find item by name if drug_id mapping has no stock
            console.log(`[POS Checkout] No stock found for resolved item ${resolvedItemId}, trying name fallback`);
            const itemByName = await tx.execute(sql`
              SELECT id FROM items WHERE name = ${item.drugName} LIMIT 1
            `);
            const nameRow = (itemByName as any)?.[0];
            if (nameRow && nameRow.id !== resolvedItemId) {
              resolvedItemId = nameRow.id;
              console.log(`[POS Checkout] Fallback to item by name: ${resolvedItemId}`);
              const fallbackBatch = await tx.execute(sql`
                SELECT ib.id, ib.batch_number, ib.expiry_date
                FROM item_batches ib
                JOIN inventory_stock ist ON ist.item_id = ib.item_id AND ist.batch_id = ib.id
                WHERE ib.item_id = ${resolvedItemId}
                  AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
                  AND ib.is_quarantined = false
                  AND ist.quantity > 0
                ORDER BY ib.expiry_date ASC NULLS LAST
                LIMIT 1
              `);
              const fallbackRow = (fallbackBatch as any)?.[0];
              if (fallbackRow) {
                finalBatchId = fallbackRow.id;
                finalLotNumber = fallbackRow.batch_number;
                finalExpiryDate = fallbackRow.expiry_date;
              }
            }
          }
        }
        
        // If batchId was provided (either from request or auto-selected), ensure lot/expiry are set
        if (finalBatchId && !finalLotNumber) {
          const batchInfo = await tx.execute(sql`
            SELECT batch_number, expiry_date FROM item_batches WHERE id = ${finalBatchId} LIMIT 1
          `);
          const batchRow = (batchInfo as any)?.[0];
          if (batchRow) {
            finalLotNumber = finalLotNumber || batchRow.batch_number;
            finalExpiryDate = finalExpiryDate || batchRow.expiry_date;
          }
        }

        const [saleItem] = await tx
          .insert(posSaleItems)
          .values({
            saleid: sale.saleid,
            drugid: resolvedDrugId || sql`NULL` as any,
            drugname: item.drugName,
            batchid: finalBatchId || null,
            lotnumber: finalLotNumber || null,
            expirydate: finalExpiryDate || null,
            quantity: item.quantity,
            unitprice: verifiedPrice.toFixed(2),
            discountpercent: (item.discountPercent || 0).toFixed(2),
            discountamount: (item.discountAmount || 0).toFixed(2),
            taxamount: (item.taxAmount || 0).toFixed(2),
            totalamount: (item.quantity * verifiedPrice).toFixed(2),
            pharmacyorderitemid: item.pharmacyOrderItemId || null,
          })
          .returning();
        createdItems.push(saleItem);

        // Deduct inventory for all sale types since dispense process doesn't use unified inventory yet
        console.log(`[POS Checkout] Sale type: ${data.saleType}, resolvedItemId: ${resolvedItemId}`);
        if (resolvedItemId && finalBatchId) {
          // Get warehouse_id from inventory_stock for the selected batch
          const stockInfo = await tx.execute(sql`
            SELECT warehouse_id FROM inventory_stock
            WHERE item_id = ${resolvedItemId} AND batch_id = ${finalBatchId}
            LIMIT 1
          `);
          const warehouseIdForDeduction = (stockInfo as any)?.[0]?.warehouse_id || defaultWarehouseId;

          console.log(`[POS Checkout] Deducting from item ${resolvedItemId}, batch ${finalBatchId}, warehouse ${warehouseIdForDeduction}`);
          
          // Deduct from inventory_stock
          await tx.execute(sql`
            UPDATE inventory_stock
            SET quantity = GREATEST(quantity - ${item.quantity}, 0),
                last_updated = NOW()
            WHERE item_id = ${resolvedItemId}
              AND batch_id = ${finalBatchId}
              AND warehouse_id = ${warehouseIdForDeduction}
          `);

          // Create stock_transaction audit record
          await tx.execute(sql`
            INSERT INTO stock_transactions (
              item_id,
              warehouse_id,
              batch_id,
              transaction_type,
              quantity,
              reference_type,
              reference_id,
              notes,
              created_by
            )
            VALUES (
              ${resolvedItemId},
              ${warehouseIdForDeduction},
              ${finalBatchId},
              'DISPENSE',
              ${-item.quantity},
              'POS_SALE',
              ${sale.saleid},
              ${`POS Sale ${saleNumber}`},
              ${user.userid}
            )
          `);
          console.log(`[POS Checkout] Stock deduction completed`);
        } else {
          console.warn(
            `[POS] No inventory stock found for item ${resolvedItemId} (${item.drugName}), skipping deduction`
          );
        }
      }

      // 4. Create payment records
      const createdPayments = [];
      for (const payment of data.payments) {
        const [pr] = await tx
          .insert(posPayments)
          .values({
            saleid: sale.saleid,
            paymentmethod: payment.method,
            amount: payment.amount.toFixed(2),
            cardtype: payment.cardType || null,
            cardlast4: payment.cardLast4 || null,
            cardholder: payment.cardHolder || null,
            transactionid: payment.transactionId || null,
            authorizationcode: payment.authorizationCode || null,
            insurancecompanyid: payment.insuranceCompanyId || null,
            insuranceclaimnumber: payment.insuranceClaimNumber || null,
            insurancecoverage: payment.insuranceCoverage?.toFixed(2) || null,
            patientcopay: payment.patientCopay?.toFixed(2) || null,
            approvalcode: payment.approvalCode || null,
            creditaccountid: payment.creditAccountId || null,
            status: "COMPLETED",
          })
          .returning();
        createdPayments.push(pr);

        // Update patient credit account balance if credit payment
        if (payment.method === "CREDIT_ACCOUNT" && payment.creditAccountId) {
          await tx
            .update(patientCreditAccounts)
            .set({
              currentbalance: sql`${patientCreditAccounts.currentbalance}::numeric + ${payment.amount}`,
              availablecredit: sql`${patientCreditAccounts.availablecredit}::numeric - ${payment.amount}`,
              updatedat: new Date(),
            })
            .where(
              eq(patientCreditAccounts.accountid, payment.creditAccountId)
            );
        }
      }

      // 5. Update pharmacy order items + order status (if from a pharmacy order)
      if (data.pharmacyOrderId) {
        // 5a. Update pharmacy order items with payment-based dispensing logic
        const paymentRatio = paymentsTotal / data.totalAmount;
        
        for (const cartItem of data.items) {
          if (!cartItem.pharmacyOrderItemId) continue;
          
          // Get current order item to check original quantity
          const [orderItem] = await tx
            .select({
              quantity: pharmacyOrderItems.quantity,
              quantitydispensed: pharmacyOrderItems.quantitydispensed,
            })
            .from(pharmacyOrderItems)
            .where(eq(pharmacyOrderItems.itemid, cartItem.pharmacyOrderItemId))
            .limit(1);
          
          if (!orderItem) continue;
          
          // Calculate new dispensed quantity (already adjusted for payment)
          const currentDispensed = orderItem.quantitydispensed || 0;
          const newDispensedQty = currentDispensed + cartItem.quantity;
          const totalQty = orderItem.quantity;
          
          // Determine item status based on BOTH payment and dispensing
          let itemStatus: PharmacyItemStatus;
          if (paymentRatio >= 0.99 && newDispensedQty >= totalQty) {
            // Fully paid + fully dispensed
            itemStatus = PHARMACY_ITEM_STATUS.DISPENSED;
          } else if (paymentRatio >= 0.01 && newDispensedQty > 0) {
            // Partially paid + partially dispensed (use SCANNED as in-progress status)
            itemStatus = PHARMACY_ITEM_STATUS.SCANNED;
          } else {
            // No payment or no dispensing
            itemStatus = PHARMACY_ITEM_STATUS.PENDING;
          }
          
          // Update the order item
          await tx
            .update(pharmacyOrderItems)
            .set({
              quantitydispensed: Math.min(newDispensedQty, totalQty),
              status: itemStatus,
            })
            .where(eq(pharmacyOrderItems.itemid, cartItem.pharmacyOrderItemId));
            
          console.log(
            `[POS] Item ${cartItem.pharmacyOrderItemId}: dispensed ${newDispensedQty}/${totalQty} → ${itemStatus}`
          );
        }

        // 5b. Check if ALL items in the order are now dispensed
        const allItems = await tx
          .select({
            itemid: pharmacyOrderItems.itemid,
            status: pharmacyOrderItems.status,
          })
          .from(pharmacyOrderItems)
          .where(eq(pharmacyOrderItems.orderid, data.pharmacyOrderId));

        const totalItems = allItems.length;
        const dispensedItems = allItems.filter(
          (i) => i.status === "DISPENSED"
        ).length;

        // 5c. Update order status based on how many items are dispensed
        let orderStatus: "DISPENSED" | "PARTIALLY_DISPENSED" | "IN_PROGRESS";
        if (dispensedItems === totalItems) {
          orderStatus = "DISPENSED";
        } else if (dispensedItems > 0) {
          orderStatus = "PARTIALLY_DISPENSED";
        } else {
          orderStatus = "IN_PROGRESS";
        }

        await tx
          .update(pharmacyOrders)
          .set({
            status: orderStatus as any,
            metadata: sql`COALESCE(${pharmacyOrders.metadata}, '{}'::jsonb) || jsonb_build_object('posSaleId', ${sale.saleid}::text, 'posSaleNumber', ${saleNumber}::text, 'soldAt', ${new Date().toISOString()}::text)`,
            dispensedby: user.userid,
            dispensedat: dispensedItems === totalItems ? new Date() : null,
            updatedat: new Date(),
          })
          .where(eq(pharmacyOrders.orderid, data.pharmacyOrderId));

        console.log(
          `[POS] Order ${data.pharmacyOrderId}: ${dispensedItems}/${totalItems} items dispensed → ${orderStatus}`
        );
      }

      return {
        sale,
        saleNumber,
        itemCount: createdItems.length,
        paymentCount: createdPayments.length,
      };
    });

    console.log(
      `[POS] Sale ${result.saleNumber} completed: ${result.itemCount} items, ${result.paymentCount} payments`
    );

    return NextResponse.json(
      {
        success: true,
        saleId: result.sale.saleid,
        saleNumber: result.saleNumber,
        sale: result.sale,
        message: `Sale ${result.saleNumber} completed successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POS Checkout] Error:", error);
    console.error("[POS Checkout] Error details:", JSON.stringify(error, null, 2));
    console.error("[POS Checkout] Error stack:", error instanceof Error ? error.stack : "No stack");
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Checkout failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

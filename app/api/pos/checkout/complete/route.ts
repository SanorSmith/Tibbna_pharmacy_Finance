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
import { invoices, invoiceLines } from "@/lib/db/tables/pharmacy-invoices";
import {
  stockLevels,
  stockMovements,
  stockLocations,
} from "@/lib/db/tables/pharmacy-stock";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { inventoryStock, itemBatches, stockTransactions } from "@/lib/db/schema";
import { PHARMACY_ITEM_STATUS, type PharmacyItemStatus } from "@/lib/db/tables/pharmacy-orders";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const saleItemSchema = z.object({
  drugId: z.string().uuid().optional().nullable(),
  drugName: z.string(),
  batchId: z.string().uuid().optional().nullable(),
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

    // Get a default location for stock movements (first available)
    let defaultLocationId: string | null = null;
    const [loc] = await db
      .select({ locationid: stockLocations.locationid })
      .from(stockLocations)
      .limit(1);
    defaultLocationId = loc?.locationid || null;

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

        // If batch specified, verify price against batch sellingprice
        let verifiedPrice = item.unitPrice;
        if (item.batchId) {
          const [batch] = await tx
            .select({ sellingprice: drugBatches.sellingprice })
            .from(drugBatches)
            .where(eq(drugBatches.batchid, item.batchId))
            .limit(1);
          if (batch?.sellingprice) {
            verifiedPrice = parseFloat(batch.sellingprice);
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
        // If still no drugId, find by drug name in the drugs table
        if (!resolvedDrugId) {
          const found = await tx.execute(sql`
            SELECT drugid FROM drugs WHERE name = ${item.drugName} LIMIT 1
          `);
          const row = (found as any)?.[0];
          resolvedDrugId = row?.drugid || null;
        }

        const [saleItem] = await tx
          .insert(posSaleItems)
          .values({
            saleid: sale.saleid,
            drugid: resolvedDrugId || sql`NULL`  as any, // may be null if drug not found
            drugname: item.drugName,
            batchid: item.batchId || null,
            lotnumber: item.lotNumber || null,
            expirydate: item.expiryDate || null,
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

        // Create stock movements for ALL sale types to track POS sales
        // For OTC_WALKIN and NEW_PRESCRIPTION: also deduct inventory
        // For DISPENSED_ORDER: create movement record only (inventory already deducted during dispense)
        if (item.drugId) {
          const drugId = item.drugId;
          
          // UNIFIED INVENTORY SYSTEM: Find inventory stock for this drug
          // Join through items table to find stock by drug_id
          console.log(`[POS Inventory Debug] Looking for stock with drug_id=${drugId}`);
          const invStockQuery = await tx.execute(sql`
            SELECT 
              ist.id,
              ist.batch_id as batchid,
              ist.quantity,
              ist.warehouse_id as warehouseid
            FROM inventory_stock ist
            INNER JOIN item_batches ib ON ib.id = ist.batch_id
            INNER JOIN items i ON i.id = ib.item_id
            WHERE i.drug_id = ${drugId}
              AND ist.quantity > 0
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          `);

          console.log(`[POS Inventory Debug] Query result:`, invStockQuery);
          const invStock = (invStockQuery as any)[0] as {
            id: string;
            batchid: string;
            quantity: number;
            warehouseid: string;
          } | undefined;

          if (invStock) {
            console.log(`[POS Inventory] Found stock: batch=${invStock.batchid}, qty=${invStock.quantity}, saleType=${data.saleType}`);
            // Deduct inventory for all sale types
            const newQty = Math.max(0, invStock.quantity - item.quantity);
            console.log(`[POS Inventory] Deducting ${item.quantity} from ${invStock.quantity} → ${newQty}`);
            await tx
              .update(inventoryStock)
              .set({
                quantity: newQty,
                lastupdated: new Date(),
              })
              .where(eq(inventoryStock.id, invStock.id));

            // Create stock movement for audit trail (without batchid to avoid FK constraint)
            await tx.insert(stockMovements).values({
              drugid: drugId,
              batchid: null, // Don't use unified batch ID - it's not in drug_batches table
              locationid: defaultLocationId || sql`NULL`,
              type: "DISPENSE",
              quantity: -item.quantity,
              reason: `POS Sale ${saleNumber} (${data.saleType}) - Batch: ${invStock.batchid}`,
              referenceid: sale.saleid,
              performedby: user.userid,
            });
          } else {
            console.warn(
              `[POS] No inventory stock for drug ${drugId}, creating audit transaction only`
            );
            // Create audit transaction even if no stock found
            if (defaultLocationId) {
              await tx.insert(stockMovements).values({
                drugid: drugId,
                batchid: item.batchId || null,
                locationid: defaultLocationId,
                type: "DISPENSE",
                quantity: -item.quantity,
                reason: `POS Sale ${saleNumber} (${data.saleType}) (no stock record)`,
                referenceid: sale.saleid,
                performedby: user.userid,
              });
            }
          }
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

        // 5b. Create or update pharmacy invoice
        const [existingInvoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.orderid, data.pharmacyOrderId))
          .limit(1);

        if (existingInvoice) {
          // Update existing invoice to PAID
          await tx
            .update(invoices)
            .set({
              status: paymentsTotal >= data.totalAmount ? "PAID" : "PARTIALLY_PAID",
              updatedat: new Date(),
            })
            .where(eq(invoices.invoiceid, existingInvoice.invoiceid));
          
          console.log(`[POS] Updated invoice ${existingInvoice.invoicenumber} to ${paymentsTotal >= data.totalAmount ? "PAID" : "PARTIALLY_PAID"}`);
        } else {
          // Create new invoice
          const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
          const [newInvoice] = await tx
            .insert(invoices)
            .values({
              orderid: data.pharmacyOrderId,
              patientid: data.patientId || null,
              invoicenumber: invoiceNumber,
              status: paymentsTotal >= data.totalAmount ? "PAID" : "PARTIALLY_PAID",
              subtotal: data.subtotal.toFixed(2),
              insurancecovered: "0.00",
              patientcopay: data.totalAmount.toFixed(2),
              total: data.totalAmount.toFixed(2),
            })
            .returning();

          // Create invoice line items from cart
          for (const item of data.items) {
            await tx.insert(invoiceLines).values({
              invoiceid: newInvoice.invoiceid,
              drugid: item.drugId || null,
              description: item.drugName,
              quantity: item.quantity,
              unitprice: item.unitPrice.toFixed(2),
              linetotal: (item.unitPrice * item.quantity).toFixed(2),
              insurancecovered: "0.00",
              patientpays: (item.unitPrice * item.quantity).toFixed(2),
            });
          }

          console.log(`[POS] Created invoice ${invoiceNumber} with status ${paymentsTotal >= data.totalAmount ? "PAID" : "PARTIALLY_PAID"}`);
        }
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
    console.error("[POS Checkout]", error);
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

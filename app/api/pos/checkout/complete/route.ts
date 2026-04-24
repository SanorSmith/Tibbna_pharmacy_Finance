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
import {
  stockLevels,
  stockMovements,
  stockLocations,
} from "@/lib/db/tables/pharmacy-stock";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
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

      // 3. Create sale items + deduct inventory for OTC / NEW_PRESCRIPTION
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

        const [saleItem] = await tx
          .insert(posSaleItems)
          .values({
            saleid: sale.saleid,
            drugid: item.drugId || "",
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

        // Deduct inventory ONLY for OTC_WALKIN and NEW_PRESCRIPTION
        // (DISPENSED_ORDER inventory was already deducted during dispense)
        if (
          (data.saleType === "OTC_WALKIN" ||
            data.saleType === "NEW_PRESCRIPTION") &&
          item.drugId
        ) {
          const drugId = item.drugId;
          // Find stock level for this drug (+ batch if specified)
          const stockFilter = item.batchId
            ? and(
                eq(stockLevels.drugid, drugId),
                eq(stockLevels.batchid, item.batchId)
              )
            : eq(stockLevels.drugid, drugId);

          const [sl] = await tx
            .select()
            .from(stockLevels)
            .where(stockFilter)
            .limit(1);

          if (sl) {
            // Deduct quantity
            const newQty = Math.max(0, sl.quantity - item.quantity);
            await tx
              .update(stockLevels)
              .set({
                quantity: newQty,
                updatedat: new Date(),
              })
              .where(eq(stockLevels.stocklevelid, sl.stocklevelid));

            // Create DISPENSE stock movement
            await tx.insert(stockMovements).values({
              drugid: drugId,
              batchid: item.batchId || sl.batchid || null,
              locationid: sl.locationid, // use the stock level's location
              type: "DISPENSE",
              quantity: -item.quantity,
              reason: `POS Sale ${saleNumber}`,
              referenceid: sale.saleid,
              performedby: user.userid,
            });
          } else if (defaultLocationId) {
            // No stock level found — still create audit movement
            await tx.insert(stockMovements).values({
              drugid: drugId,
              batchid: item.batchId || null,
              locationid: defaultLocationId,
              type: "DISPENSE",
              quantity: -item.quantity,
              reason: `POS Sale ${saleNumber} (no stock record)`,
              referenceid: sale.saleid,
              performedby: user.userid,
            });
            console.warn(
              `[POS] No stock level for drug ${drugId}, movement created with default location`
            );
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
        // 5a. Update only the PAID items to DISPENSED
        const paidOrderItemIds = data.items
          .filter((item) => item.pharmacyOrderItemId)
          .map((item) => item.pharmacyOrderItemId as string);

        for (const itemId of paidOrderItemIds) {
          await tx
            .update(pharmacyOrderItems)
            .set({ status: "DISPENSED" })
            .where(eq(pharmacyOrderItems.itemid, itemId));
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

/**
 * POS Checkout Calculate API
 *
 * POST — calculate subtotal, tax, insurance coverage, copay, totals
 * 
 * UPDATED: Now accepts itemId as primary identifier and uses inventory_stock
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies, inventoryStock, warehouses, drugs } from "@/lib/db/schema";
import { stockLevels } from "@/lib/db/tables/pharmacy-stock";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const calculateSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid().optional(), // Primary identifier
      drugId: z.string().uuid().optional(), // Fallback for backward compatibility
      drugName: z.string(),
      batchId: z.string().uuid().optional(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
    })
  ),
  patientId: z.string().uuid().optional(),
  insuranceId: z.string().uuid().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = calculateSchema.parse(body);

    // Calculate subtotal
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Calculate discount
    const discountPercent = data.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;

    // Tax (configurable — default 0% for Iraq)
    const taxRate = 0;
    const taxAmount = afterDiscount * taxRate;

    let insuranceCoverage = 0;
    let insuranceDetail = null;

    // Get insurance coverage if applicable
    if (data.insuranceId) {
      const [insurance] = await db
        .select()
        .from(insuranceCompanies)
        .where(eq(insuranceCompanies.insuranceid, data.insuranceId))
        .limit(1);

      if (insurance) {
        const coveragePercent =
          parseFloat(insurance.coveragepercent || "0") / 100;
        insuranceCoverage = afterDiscount * coveragePercent;
        insuranceDetail = {
          companyName: insurance.name,
          coveragePercent: parseFloat(insurance.coveragepercent || "0"),
          coverageAmount: parseFloat(insuranceCoverage.toFixed(2)),
        };
      }
    }

    const total = afterDiscount + taxAmount;
    const patientCopay = total - insuranceCoverage;

    // Get default pharmacy warehouse
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.name, "Pharmacy"))
      .limit(1);
    
    const warehouseId = warehouse?.id || "22222222-0000-0000-0000-000000000002";

    // Validate stock availability for each item using inventory_stock
    const stockWarnings: string[] = [];
    for (const item of data.items) {
      // Resolve itemId from drugId if not provided (backward compatibility)
      let resolvedItemId = item.itemId;
      if (!resolvedItemId && item.drugId) {
        const [drug] = await db
          .select({ itemid: drugs.itemid })
          .from(drugs)
          .where(eq(drugs.drugid, item.drugId))
          .limit(1);
        resolvedItemId = drug?.itemid || null;
      }

      if (resolvedItemId) {
        // Use new inventory_stock system
        const stockFilter = item.batchId
          ? and(
              eq(inventoryStock.itemid, resolvedItemId),
              eq(inventoryStock.batchid, item.batchId),
              eq(inventoryStock.warehouseid, warehouseId)
            )
          : and(
              eq(inventoryStock.itemid, resolvedItemId),
              eq(inventoryStock.warehouseid, warehouseId)
            );

        const stockRecords = await db
          .select()
          .from(inventoryStock)
          .where(stockFilter);

        if (stockRecords.length === 0) {
          stockWarnings.push(
            `${item.drugName}: no stock record found${item.batchId ? ' for this batch' : ''}`
          );
        } else {
          const totalAvailable = stockRecords.reduce(
            (sum, record) => sum + (record.quantity - record.reservedquantity),
            0
          );
          if (totalAvailable < item.quantity) {
            stockWarnings.push(
              `${item.drugName}: only ${totalAvailable} available (requested ${item.quantity})`
            );
          }
        }
      } else if (item.drugId) {
        // Fallback to legacy stock system for backward compatibility
        const stockFilter = item.batchId
          ? and(
              eq(stockLevels.drugid, item.drugId),
              eq(stockLevels.batchid, item.batchId)
            )
          : eq(stockLevels.drugid, item.drugId);

        const [sl] = await db
          .select()
          .from(stockLevels)
          .where(stockFilter)
          .limit(1);

        if (!sl) {
          stockWarnings.push(
            `${item.drugName}: no stock record found (legacy system)`
          );
        } else {
          const available = sl.quantity - sl.reservedquantity;
          if (available < item.quantity) {
            stockWarnings.push(
              `${item.drugName}: only ${available} available (requested ${item.quantity})`
            );
          }
        }
      }
    }

    return NextResponse.json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountPercent,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      insuranceCoverage: parseFloat(insuranceCoverage.toFixed(2)),
      insuranceDetail,
      patientCopay: parseFloat(patientCopay.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      itemCount: data.items.length,
      stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
    });
  } catch (error) {
    console.error("[POS Calculate]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Calculation failed" },
      { status: 500 }
    );
  }
}

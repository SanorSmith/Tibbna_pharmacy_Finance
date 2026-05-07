/**
 * POS Checkout Calculate API
 *
 * POST — calculate subtotal, tax, insurance coverage, copay, totals
 *
 * Uses the unified inventory system: inventory_stock for stock validation
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies, inventoryStock } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const calculateSchema = z.object({
  items: z.array(
    z.object({
      drugId: z.string().uuid().optional().nullable(),
      itemId: z.string().uuid().optional().nullable(),
      drugName: z.string(),
      batchId: z.string().uuid().optional().nullable(),
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

    // Validate stock availability using inventory_stock (unified system)
    const stockWarnings: string[] = [];
    for (const item of data.items) {
      // Resolve item_id: use itemId directly, or look up from drugId
      let resolvedItemId = item.itemId;
      if (!resolvedItemId && item.drugId) {
        const found = await db.execute(sql`
          SELECT id FROM items WHERE drug_id = ${item.drugId} LIMIT 1
        `);
        resolvedItemId = (found as any)?.[0]?.id || null;
      }
      if (!resolvedItemId && item.drugName) {
        const found = await db.execute(sql`
          SELECT id FROM items WHERE name = ${item.drugName} LIMIT 1
        `);
        resolvedItemId = (found as any)?.[0]?.id || null;
      }

      if (resolvedItemId) {
        // Check total available stock from inventory_stock
        const stockResult = await db.execute(sql`
          SELECT COALESCE(SUM(ist.quantity - ist.reserved_quantity), 0) as available
          FROM inventory_stock ist
          LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
          WHERE ist.item_id = ${resolvedItemId}
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
            AND (ib.is_quarantined = false OR ib.id IS NULL)
            AND ist.quantity > 0
            ${item.batchId ? sql`AND ist.batch_id = ${item.batchId}` : sql``}
        `);
        const available = parseInt((stockResult as any)?.[0]?.available || "0");
        
        console.log(`[POS Calculate] Stock check for ${item.drugName}: resolvedItemId=${resolvedItemId}, available=${available}, requested=${item.quantity}`);

        if (available <= 0) {
          stockWarnings.push(
            `${item.drugName}: no stock record found`
          );
        } else if (available < item.quantity) {
          stockWarnings.push(
            `${item.drugName}: only ${available} available (requested ${item.quantity})`
          );
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

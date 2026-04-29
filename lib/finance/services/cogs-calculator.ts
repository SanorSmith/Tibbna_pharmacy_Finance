/**
 * Finance Module — FIFO COGS Calculator
 *
 * Calculates Cost of Goods Sold using FIFO by expiry date.
 * Consumes oldest-expiry batches first.
 *
 * Data sources:
 * - Primary: drug_batches.purchaseprice + pharmacy_stock_levels.quantity
 * - Fallback: item_batches.unit_cost (universal inventory)
 */
import { db } from "@/lib/db";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { stockLevels } from "@/lib/db/tables/pharmacy-stock";
import { eq, and, gt, asc } from "drizzle-orm";
import type { COGSResult } from "../types";

// ── Calculate FIFO COGS ──────────────────────────────────────────
export async function calculateFIFOCogs(
  drugid: string,
  quantityNeeded: number,
  preferredBatchid?: string | null
): Promise<COGSResult> {
  // Query batches with remaining stock, ordered by expirydate ASC (FIFO)
  const batches = await db
    .select({
      batchid: drugBatches.batchid,
      expirydate: drugBatches.expirydate,
      purchaseprice: drugBatches.purchaseprice,
      availableqty: stockLevels.quantity,
    })
    .from(drugBatches)
    .innerJoin(stockLevels, eq(stockLevels.batchid, drugBatches.batchid))
    .where(
      and(eq(drugBatches.drugid, drugid), gt(stockLevels.quantity, 0))
    )
    .orderBy(asc(drugBatches.expirydate));

  // If preferred batch specified, move it to front
  if (preferredBatchid) {
    const idx = batches.findIndex((b) => b.batchid === preferredBatchid);
    if (idx > 0) {
      const [preferred] = batches.splice(idx, 1);
      batches.unshift(preferred);
    }
  }

  let remaining = quantityNeeded;
  let totalCost = 0;
  const batchBreakdown: COGSResult["batchBreakdown"] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const unitcost = batch.purchaseprice
      ? parseFloat(batch.purchaseprice)
      : 0;
    const available = batch.availableqty;
    const consume = Math.min(remaining, available);
    const linecost = consume * unitcost;

    batchBreakdown.push({
      batchid: batch.batchid,
      quantity: consume,
      unitcost,
      linecost,
    });

    totalCost += linecost;
    remaining -= consume;
  }

  const insufficientData = remaining > 0;
  if (insufficientData) {
    console.warn(
      `[COGS] Insufficient batch data for drug ${drugid}: ` +
        `needed ${quantityNeeded}, found cost data for ${quantityNeeded - remaining}`
    );
  }

  return { totalCost, batchBreakdown, insufficientData };
}

// ── Calculate Inventory Valuation ────────────────────────────────
export async function calculateInventoryValuation(
  workspaceid: string
): Promise<{
  totalValue: number;
  items: Array<{
    drugid: string;
    drugname: string;
    totalqty: number;
    avgcost: number;
    totalvalue: number;
  }>;
}> {
  // We need to import drugs here to avoid circular deps
  const { drugs } = await import("@/lib/db/tables/pharmacy-drugs");

  const raw = await db
    .select({
      drugid: drugs.drugid,
      drugname: drugs.name,
      batchid: drugBatches.batchid,
      purchaseprice: drugBatches.purchaseprice,
      quantity: stockLevels.quantity,
    })
    .from(drugs)
    .innerJoin(drugBatches, eq(drugBatches.drugid, drugs.drugid))
    .innerJoin(stockLevels, eq(stockLevels.batchid, drugBatches.batchid))
    .where(
      and(eq(drugs.workspaceid, workspaceid), gt(stockLevels.quantity, 0))
    )
    .orderBy(drugs.name, asc(drugBatches.expirydate));

  // Aggregate by drug
  const drugMap = new Map<
    string,
    { drugname: string; totalqty: number; totalvalue: number }
  >();

  for (const row of raw) {
    const unitcost = row.purchaseprice
      ? parseFloat(row.purchaseprice)
      : 0;
    const value = row.quantity * unitcost;

    const existing = drugMap.get(row.drugid);
    if (existing) {
      existing.totalqty += row.quantity;
      existing.totalvalue += value;
    } else {
      drugMap.set(row.drugid, {
        drugname: row.drugname,
        totalqty: row.quantity,
        totalvalue: value,
      });
    }
  }

  let totalValue = 0;
  const items = Array.from(drugMap.entries()).map(([drugid, data]) => {
    totalValue += data.totalvalue;
    return {
      drugid,
      drugname: data.drugname,
      totalqty: data.totalqty,
      avgcost: data.totalqty > 0 ? data.totalvalue / data.totalqty : 0,
      totalvalue: data.totalvalue,
    };
  });

  return { totalValue, items };
}

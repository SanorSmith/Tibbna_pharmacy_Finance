/**
 * Finance Hook — Stock Adjustment
 *
 * Called after a stock adjustment is recorded (shrinkage, damage, found items).
 *
 * Loss (negative qty):
 *   Dr 5320 Inventory Write-off
 *     Cr 1131 Drug Inventory
 *
 * Gain (positive qty):
 *   Dr 1131 Drug Inventory
 *     Cr 4320 Other Income
 */
import { postFinancialEvent } from "../services/posting-engine";
import { safeFinanceHook } from "../errors";
import type { StockAdjustmentEventData, PostingLine } from "../types";

export async function onStockAdjustment(
  event: StockAdjustmentEventData
): Promise<void> {
  await safeFinanceHook("StockAdjustment", async () => {
    const absValue = Math.abs(event.adjustmentquantity * event.unitcost);
    if (absValue < 0.01) return;

    const isLoss = event.adjustmentquantity < 0;
    const lines: PostingLine[] = isLoss
      ? [
          {
            accountcode: "5320",
            debit: absValue,
            credit: 0,
            memo: `Write-off: ${event.reason}`,
          },
          {
            accountcode: "1131",
            debit: 0,
            credit: absValue,
            memo: "Inventory reduction",
          },
        ]
      : [
          {
            accountcode: "1131",
            debit: absValue,
            credit: 0,
            memo: "Inventory gain",
          },
          {
            accountcode: "4320",
            debit: 0,
            credit: absValue,
            memo: `Stock gain: ${event.reason}`,
          },
        ];

    const result = await postFinancialEvent({
      workspaceid: event.workspaceid,
      sourcetype: "STOCK_ADJUSTMENT",
      sourceid: event.adjustmentid,
      date: event.adjustmentdate,
      description: `Stock adjustment: ${event.reason}`,
      lines,
      userid: event.userid,
      metadata: {
        adjustmentid: event.adjustmentid,
        quantity: event.adjustmentquantity,
        unitcost: event.unitcost,
        type: isLoss ? "LOSS" : "GAIN",
      },
    });

    if (!result.success) {
      console.error("[Finance Hook: StockAdjustment] Posting failed:", result);
    }
  });
}

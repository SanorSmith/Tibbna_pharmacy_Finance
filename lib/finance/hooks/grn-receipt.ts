/**
 * Finance Hook — GRN Receipt
 *
 * Called after a Goods Receipt Note is created from a Purchase Order.
 * Journal:
 *   Dr 1131 Drug Inventory (totalamount)
 *     Cr 1133 GRNI         (totalamount)
 */
import { postFinancialEvent } from "../services/posting-engine";
import { safeFinanceHook } from "../errors";
import type { GrnEventData } from "../types";

export async function onGrnReceipt(event: GrnEventData): Promise<void> {
  await safeFinanceHook("GrnReceipt", async () => {
    const result = await postFinancialEvent({
      workspaceid: event.workspaceid,
      sourcetype: "GRN_RECEIPT",
      sourceid: event.grnid,
      date: event.receiptdate,
      description: `GRN receipt: ${event.grnid} from PO ${event.poid}`,
      lines: [
        {
          accountcode: "1131",
          debit: event.totalamount,
          credit: 0,
          memo: "Inventory received",
        },
        {
          accountcode: "1133",
          debit: 0,
          credit: event.totalamount,
          memo: "Goods received not invoiced (accrual)",
        },
      ],
      userid: event.userid,
      metadata: {
        grnid: event.grnid,
        poid: event.poid,
        vendorid: event.vendorid,
        itemcount: event.items.length,
      },
    });

    if (!result.success) {
      console.error("[Finance Hook: GrnReceipt] Posting failed:", result);
    }
  });
}

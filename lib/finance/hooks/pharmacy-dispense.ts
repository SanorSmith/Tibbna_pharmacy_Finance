/**
 * Finance Hook — Pharmacy Dispense
 *
 * Called after a pharmacy order is dispensed and invoice created.
 * Creates: Revenue journal + COGS journal + AR transactions.
 *
 * Journal entries:
 *   Dr 1121 Patient AR       (patientcopay)
 *   Dr 1122 Insurance AR     (insurancecovered)
 *     Cr 4110 Drug Sales     (subtotal)
 *   Dr 5100 Drug COGS        (FIFO cost)
 *     Cr 1131 Drug Inventory (FIFO cost)
 */
import { postFinancialEvent } from "../services/posting-engine";
import { calculateFIFOCogs } from "../services/cogs-calculator";
import { createArTransaction } from "../services/ar-service";
import { safeFinanceHook } from "../errors";
import type { DispenseEventData, PostingLine } from "../types";

export async function onPharmacyDispense(
  event: DispenseEventData
): Promise<void> {
  await safeFinanceHook("PharmacyDispense", async () => {
    // ── 1. Calculate COGS ────────────────────────────────────
    let totalCogs = 0;
    for (const item of event.items) {
      if (!item.drugid) continue;
      const cogs = await calculateFIFOCogs(
        item.drugid,
        item.quantity,
        item.batchid
      );
      totalCogs += cogs.totalCost;
    }

    // ── 2. Build journal lines ───────────────────────────────
    const lines: PostingLine[] = [];

    // Revenue recognition (credit)
    if (event.subtotal > 0) {
      lines.push({
        accountcode: "4110",
        debit: 0,
        credit: event.subtotal,
        memo: `Revenue: Invoice ${event.invoiceid}`,
      });
    }

    // AR split based on insurance
    if (event.insurancecovered > 0 && event.insuranceid) {
      lines.push({
        accountcode: "1122",
        debit: event.insurancecovered,
        credit: 0,
        memo: `Insurance AR: ${event.insuranceid}`,
      });
    }

    if (event.patientcopay > 0) {
      lines.push({
        accountcode: "1121",
        debit: event.patientcopay,
        credit: 0,
        memo: `Patient copay: ${event.patientid}`,
      });
    }

    // COGS recognition
    if (totalCogs > 0) {
      lines.push({
        accountcode: "5100",
        debit: totalCogs,
        credit: 0,
        memo: "Cost of goods sold (FIFO)",
      });
      lines.push({
        accountcode: "1131",
        debit: 0,
        credit: totalCogs,
        memo: "Inventory reduction",
      });
    }

    // Skip if no valid lines
    if (lines.length < 2) {
      console.warn("[Finance Hook: Dispense] Skipping — insufficient data for balanced journal");
      return;
    }

    // ── 3. Post to GL ────────────────────────────────────────
    const result = await postFinancialEvent({
      workspaceid: event.workspaceid,
      sourcetype: "PHARMACY_DISPENSE",
      sourceid: event.orderid,
      date: event.dispensedate,
      description: `Pharmacy dispense: Order ${event.orderid}`,
      lines,
      userid: event.userid,
      metadata: {
        invoiceid: event.invoiceid,
        patientid: event.patientid,
        itemcount: event.items.length,
        cogs: totalCogs,
      },
    });

    if (!result.success) {
      console.error("[Finance Hook: Dispense] Posting failed:", result);
      return;
    }

    // ── 4. Create AR transactions ────────────────────────────
    if (event.patientcopay > 0 && event.patientid) {
      await createArTransaction({
        workspaceid: event.workspaceid,
        customertype: "PATIENT",
        customerid: event.patientid,
        sourcetype: "PHARMACY_DISPENSE",
        sourceid: event.invoiceid,
        transactiondate: event.dispensedate,
        debitamount: event.patientcopay,
        creditamount: 0,
        description: `Pharmacy invoice ${event.invoiceid}`,
        journalid: result.journalid,
      });
    }

    if (event.insurancecovered > 0 && event.insuranceid) {
      await createArTransaction({
        workspaceid: event.workspaceid,
        customertype: "INSURANCE",
        customerid: event.insuranceid,
        sourcetype: "PHARMACY_DISPENSE",
        sourceid: event.invoiceid,
        transactiondate: event.dispensedate,
        debitamount: event.insurancecovered,
        creditamount: 0,
        description: `Insurance claim: Invoice ${event.invoiceid}`,
        journalid: result.journalid,
      });
    }
  });
}

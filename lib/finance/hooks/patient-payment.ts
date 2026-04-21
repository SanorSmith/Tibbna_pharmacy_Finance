/**
 * Finance Hook — Patient Payment
 *
 * Called after a patient payment is recorded.
 * Journal:
 *   Dr 1111 Cash/Bank    (amount)
 *     Cr 1121 Patient AR (amount)
 */
import { postFinancialEvent } from "../services/posting-engine";
import { createArTransaction } from "../services/ar-service";
import { safeFinanceHook } from "../errors";
import type { PaymentEventData } from "../types";

export async function onPatientPayment(
  event: PaymentEventData
): Promise<void> {
  await safeFinanceHook("PatientPayment", async () => {
    const cashAccount = event.paymentmethod === "CARD" ? "1111" : "1111";

    const result = await postFinancialEvent({
      workspaceid: event.workspaceid,
      sourcetype: "PATIENT_PAYMENT",
      sourceid: event.paymentid,
      date: event.paymentdate,
      description: `Patient payment: ${event.paymentmethod} — Invoice ${event.invoiceid}`,
      lines: [
        {
          accountcode: cashAccount,
          debit: event.amount,
          credit: 0,
          memo: `Payment received: ${event.paymentmethod}`,
        },
        {
          accountcode: "1121",
          debit: 0,
          credit: event.amount,
          memo: `Settle AR: Patient ${event.patientid}`,
        },
      ],
      userid: event.userid,
      metadata: {
        paymentid: event.paymentid,
        invoiceid: event.invoiceid,
        patientid: event.patientid,
        paymentmethod: event.paymentmethod,
      },
    });

    if (!result.success) {
      console.error("[Finance Hook: PatientPayment] Posting failed:", result);
      return;
    }

    // Create AR credit transaction
    await createArTransaction({
      workspaceid: event.workspaceid,
      customertype: "PATIENT",
      customerid: event.patientid,
      sourcetype: "PATIENT_PAYMENT",
      sourceid: event.paymentid,
      transactiondate: event.paymentdate,
      debitamount: 0,
      creditamount: event.amount,
      description: `Payment received: ${event.paymentmethod}`,
      journalid: result.journalid,
    });
  });
}

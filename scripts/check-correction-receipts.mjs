import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function checkCorrectionReceipts() {
  try {
    console.log("Checking correction receipts for PGRN-20260509-8621...\n");

    const originalId = await sql`
      SELECT id FROM pharmacy_goods_receipt 
      WHERE receipt_number = 'PGRN-20260509-8621'
    `;

    if (originalId.length === 0) {
      console.log("Original receipt not found");
      return;
    }

    const origId = originalId[0].id;
    console.log("Original receipt ID:", origId);

    // Check for correction receipts
    const corrections = await sql`
      SELECT id, receipt_number, status, correction_of, correction_reason, corrected_by, is_reversal, correction_type, notes
      FROM pharmacy_goods_receipt
      WHERE correction_of = ${origId}
      ORDER BY createdat DESC
    `;

    console.log("\nCorrection receipts found:", corrections.length);
    corrections.forEach(r => {
      console.log("\nReceipt:", r.receipt_number);
      console.log("  Status:", r.status);
      console.log("  Is Reversal:", r.is_reversal);
      console.log("  Correction Type:", r.correction_type);
      console.log("  Correction Reason:", r.correction_reason);
      console.log("  Corrected By:", r.corrected_by);
      console.log("  Notes:", r.notes);
    });

    // Check original receipt status
    const original = await sql`
      SELECT id, receipt_number, status, notes
      FROM pharmacy_goods_receipt
      WHERE id = ${origId}
    `;

    console.log("\nOriginal receipt status:", original[0].status);
    console.log("Original receipt notes:", original[0].notes);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkCorrectionReceipts();

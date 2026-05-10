import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(url + "?sslmode=require", { max: 1 });

  try {
    console.log("Cleaning procurement demo data...\n");
    
    // Delete in reverse order of dependencies
    const result1 = await sql`DELETE FROM pharmacy_claim_damage WHERE receipt_id IN (SELECT id FROM pharmacy_goods_receipt WHERE receipt_number LIKE 'GRN-2026%')`;
    console.log(`Deleted claim damage records: ${result1.count}`);
    
    const result2 = await sql`DELETE FROM pharmacy_goods_receipt_items WHERE receipt_id IN (SELECT id FROM pharmacy_goods_receipt WHERE receipt_number LIKE 'GRN-2026%')`;
    console.log(`Deleted goods receipt items: ${result2.count}`);
    
    const result3 = await sql`DELETE FROM pharmacy_goods_receipt WHERE receipt_number LIKE 'GRN-2026%'`;
    console.log(`Deleted goods receipts: ${result3.count}`);
    
    const result4 = await sql`DELETE FROM pharmacy_purchase_order_items WHERE order_id IN (SELECT id FROM pharmacy_purchase_orders WHERE order_number LIKE 'PO-2026%')`;
    console.log(`Deleted purchase order items: ${result4.count}`);
    
    const result5 = await sql`DELETE FROM pharmacy_purchase_orders WHERE order_number LIKE 'PO-2026%'`;
    console.log(`Deleted purchase orders: ${result5.count}`);
    
    console.log("\n✅ Cleanup complete!");
    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    await sql.end();
    process.exit(1);
  }
}

main();

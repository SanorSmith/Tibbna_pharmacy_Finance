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
    console.log("Checking procurement tables...\n");
    
    const orders = await sql`SELECT COUNT(*)::int as cnt FROM pharmacy_purchase_orders`;
    console.log(`Purchase Orders: ${orders[0].cnt}`);
    
    if (orders[0].cnt > 0) {
      const recentOrders = await sql`SELECT order_number, status, order_date FROM pharmacy_purchase_orders ORDER BY order_date DESC LIMIT 5`;
      console.log("Recent orders:");
      for (const order of recentOrders) {
        console.log(`  - ${order.order_number} (${order.status}) on ${order.order_date}`);
      }
    }
    
    const receipts = await sql`SELECT COUNT(*)::int as cnt FROM pharmacy_goods_receipt`;
    console.log(`\nGoods Receipts: ${receipts[0].cnt}`);
    
    if (receipts[0].cnt > 0) {
      const recentReceipts = await sql`SELECT receipt_number, status, receipt_date FROM pharmacy_goods_receipt ORDER BY receipt_date DESC LIMIT 5`;
      console.log("Recent receipts:");
      for (const receipt of recentReceipts) {
        console.log(`  - ${receipt.receipt_number} (${receipt.status}) on ${receipt.receipt_date}`);
      }
    }
    
    const orderItems = await sql`SELECT COUNT(*)::int as cnt FROM pharmacy_purchase_order_items`;
    console.log(`\nOrder Items: ${orderItems[0].cnt}`);
    
    const receiptItems = await sql`SELECT COUNT(*)::int as cnt FROM pharmacy_goods_receipt_items`;
    console.log(`Receipt Items: ${receiptItems[0].cnt}`);
    
    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    await sql.end();
    process.exit(1);
  }
}

main();

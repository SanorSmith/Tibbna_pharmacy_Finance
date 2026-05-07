import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(`${url}?sslmode=require`);

  const tables = ['users', 'workspaces', 'pos_sales', 'pos_shifts', 'pos_payments', 'pos_sale_items'];
  
  for (const table of tables) {
    const result = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${table} AND column_name = 'isactive'
    `;
    console.log(`${table}: isactive column exists = ${result.length > 0}`);
  }

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

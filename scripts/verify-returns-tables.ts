import "dotenv/config";
import postgres from "postgres";

async function main() {
  const client = postgres(`${process.env.DATABASE_URL}?sslmode=require`, { max: 1 });
  
  const tables = await client`
    SELECT tablename FROM pg_tables 
    WHERE tablename LIKE 'pos_return%' OR tablename LIKE 'pos_refund%'
    ORDER BY tablename
  `;
  console.log("Tables created:", tables.map(t => t.tablename));

  const reasons = await client`SELECT reasoncode, reasonname FROM pos_return_reasons`;
  console.log("\nSeeded return reasons:", reasons.length);
  reasons.forEach(r => console.log(`  - ${r.reasoncode}: ${r.reasonname}`));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

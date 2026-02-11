import { config } from 'dotenv';
config();

import postgres from 'postgres';

const sql = postgres(`${process.env.DATABASE_URL}?sslmode=require`);
const WS = 'fa9fb036-a7eb-49af-890c-54406dad139d';

async function cleanupDB() {
  const total = await sql`SELECT COUNT(*)::int as total FROM test_reference_ranges WHERE workspaceid = ${WS}`;
  console.log(`Current tests in database: ${total[0].total}`);

  console.log('Deleting all test reference ranges...');
  const deleted = await sql`DELETE FROM test_reference_ranges WHERE workspaceid = ${WS}`;
  console.log(`Deleted ${deleted.count} rows. Database is now empty for this workspace.`);

  await sql.end();
}

cleanupDB().catch(console.error);

import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(`${process.env.DATABASE_URL}?sslmode=require`);

try {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='insurance_companies'`;
  console.log('Table exists:', tables);

  if (tables.length > 0) {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='insurance_companies'`;
    console.log('Columns:', cols);

    const data = await sql`SELECT * FROM insurance_companies LIMIT 5`;
    console.log('Rows:', data);
  }
} catch (e) {
  console.error('ERROR:', e.message);
}
await sql.end();

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: false
});

async function activatePenItems() {
  try {
    console.log('Activating items matching "pen"...');
    
    const result = await pool.query(
      `UPDATE items
       SET is_active = true
       WHERE (name ILIKE '%pen%'
         OR generic_name ILIKE '%pen%'
         OR itemcode ILIKE '%pen%'
         OR item_code ILIKE '%pen%')
       RETURNING id, name, itemcode, is_active`
    );
    
    console.log(`Activated ${result.rows.length} items:`);
    result.rows.forEach(item => {
      console.log(`- ${item.name} (${item.itemcode})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

activatePenItems();

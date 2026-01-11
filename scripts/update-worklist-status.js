require('dotenv').config();
const postgres = require('postgres');

async function updateWorklistStatus() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Updating Worklist Status ===\n');
    
    // Update the Night shift worklist to COMPLETED
    await sql`
      UPDATE worklists
      SET status = 'COMPLETED', updatedat = NOW()
      WHERE worklistname = 'Night shift'
      RETURNING worklistid, worklistname, status
    `;
    
    console.log('✅ Worklist "Night shift" updated to COMPLETED\n');
    
    // Check all worklists
    const worklists = await sql`
      SELECT worklistid, worklistname, status, updatedat
      FROM worklists
      ORDER BY updatedat DESC
      LIMIT 5
    `;
    
    console.log('Recent Worklists:');
    worklists.forEach(w => {
      console.log(`  ${w.worklistname}: ${w.status}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

updateWorklistStatus();

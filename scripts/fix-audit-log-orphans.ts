import { db } from "../lib/db/index";
import { sql } from "drizzle-orm";

async function fixOrphanedRecords() {
  try {
    console.log("Cleaning up orphaned audit log records...");
    
    // Delete audit log records that reference non-existent samples
    await db.execute(sql`
      DELETE FROM sample_accession_audit_log 
      WHERE sampleid NOT IN (SELECT sampleid FROM accession_samples)
    `);
    
    console.log("✅ Orphaned records cleaned up successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

fixOrphanedRecords();

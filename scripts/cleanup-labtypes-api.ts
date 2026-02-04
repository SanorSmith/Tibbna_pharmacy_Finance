// Script to clean up duplicate lab types via API
// Run with: npx tsx scripts/cleanup-labtypes-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function cleanupLabTypes() {
  console.log("🔍 Checking for duplicate lab types...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/cleanup-labtypes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceid: WORKSPACE_ID,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("📊 Lab Types Before Cleanup:\n");
      result.before.forEach((lt: any) => {
        console.log(`   - ${lt.labtype}: ${lt.count} tests`);
      });

      if (result.consolidated) {
        console.log("\n🔧 Consolidation performed:");
        result.updates.forEach((update: string) => console.log(`   ✅ ${update}`));
      } else {
        console.log("\n✅ No duplicate lab types found - database is clean!");
      }

      console.log("\n📊 Lab Types After Cleanup:\n");
      result.after.forEach((lt: any) => {
        console.log(`   - ${lt.labtype}: ${lt.count} tests`);
      });

      console.log("\n🎉 Cleanup complete!");
    } else {
      console.error("❌ Cleanup failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling cleanup API:", error);
  }
}

cleanupLabTypes();

// Script to update lab types via API
// Run with: npx tsx scripts/update-lab-types-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function updateLabTypes() {
  console.log("🚀 Starting update of lab types for Endocrinology tests...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/update-lab-types", {
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
      console.log("✅ Update completed successfully!\n");
      console.log(`📊 Summary:`);
      console.log(`   - Tests updated: ${result.successCount}`);
      console.log(`   - Errors: ${result.errorCount}`);
      
      if (result.updated && result.updated.length > 0) {
        console.log(`\n✨ Updates applied:`);
        result.updated.forEach((update: string) => console.log(`   - ${update}`));
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        result.errors.forEach((error: string) => console.log(`   - ${error}`));
      }
      
      console.log(`\n✅ All tests have been moved to Endocrinology lab type!`);
    } else {
      console.error("❌ Update failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling update API:", error);
  }
}

updateLabTypes();

// Script to update sample types via API
// Run with: npx tsx scripts/update-sample-types-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function updateSampleTypes() {
  console.log("🚀 Starting update of sample types and container types...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/update-sample-types", {
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
      console.log(`   - Tests not found: ${result.notFoundCount}`);
      console.log(`   - Errors: ${result.errorCount}`);
      
      if (result.updated && result.updated.length > 0) {
        console.log(`\n✨ Sample updated tests (first 50):`);
        result.updated.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        result.errors.forEach((error: string) => console.log(`   - ${error}`));
      }
      
      console.log(`\n✅ All sample types have been updated!`);
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

updateSampleTypes();

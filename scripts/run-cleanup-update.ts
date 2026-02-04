// Script to cleanup duplicates and update existing tests with gender-specific ranges
// Run with: npx tsx scripts/run-cleanup-update.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function cleanupAndUpdate() {
  console.log("🧹 Starting cleanup and update process...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/cleanup-and-update-tests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceid: WORKSPACE_ID,
        userid: USER_ID,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Cleanup and update completed successfully!\n");
      console.log(`📊 Summary:`);
      console.log(`   - Current test count: ${result.currentTestCount}`);
      console.log(`   - Tests updated: ${result.updateCount}`);
      console.log(`   - Tests not found in CSV: ${result.notFoundCount}`);
      
      if (result.updated && result.updated.length > 0) {
        console.log(`\n✨ Sample updated tests (first 50):`);
        result.updated.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      if (result.notFound && result.notFound.length > 0) {
        console.log(`\n⚠️  Tests from CSV not found in database (first 20):`);
        result.notFound.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      console.log(`\n✅ All existing tests have been updated with gender-specific reference ranges!`);
      console.log(`📊 Final count: ${result.currentTestCount} test reference ranges`);
    } else {
      console.error("❌ Cleanup and update failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling cleanup API:", error);
  }
}

cleanupAndUpdate();

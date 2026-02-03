// Script to import Iraq test references with gender-specific ranges
// Run with: npx tsx scripts/import-iraq-tests.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function importTests() {
  console.log("🚀 Starting import of Iraq test references...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/import-iraq-tests", {
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
      console.log("✅ Import completed successfully!\n");
      console.log(`📊 Summary:`);
      console.log(`   - Test ranges imported: ${result.successCount}`);
      console.log(`   - Errors: ${result.errorCount}`);
      
      if (result.imported && result.imported.length > 0) {
        console.log(`\n✨ Sample imported tests (first 50):`);
        result.imported.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered (first 20):`);
        result.errors.forEach((error: string) => console.log(`   - ${error}`));
      }
      
      console.log(`\n✅ All tests with gender-specific and pediatric ranges have been imported!`);
    } else {
      console.error("❌ Import failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling import API:", error);
  }
}

importTests();

// Script to import Hematology standalone tests via API
// Run with: npx tsx scripts/import-hematology-tests-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function importHematologyTests() {
  console.log("🚀 Starting import of Hematology standalone tests...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/import-hematology-tests", {
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
      console.log(`   - New tests added: ${result.successCount}`);
      console.log(`   - Existing tests updated: ${result.updatedCount}`);
      console.log(`   - Errors: ${result.errorCount}`);
      
      if (result.added && result.added.length > 0) {
        console.log(`\n✨ Tests added (first 50):`);
        result.added.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        result.errors.forEach((error: string) => console.log(`   - ${error}`));
      }
      
      console.log(`\n✅ All Hematology standalone tests have been imported!`);
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

importHematologyTests();

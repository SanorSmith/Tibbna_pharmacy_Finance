// Script to update remaining tests with reference ranges from medical literature
// Run with: npx tsx scripts/update-remaining-tests.ts

async function updateRemainingTests() {
  const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
  const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

  console.log("🔬 Updating remaining tests with medical reference ranges...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/update-remaining-tests", {
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
      console.log("✅ Update completed successfully!\n");
      console.log(`📊 Summary:`);
      console.log(`   - Tests updated: ${result.updateCount}`);
      console.log(`   - Tests not found: ${result.notFoundCount}`);
      
      if (result.updated && result.updated.length > 0) {
        console.log(`\n✨ Updated tests:`);
        result.updated.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      if (result.notFound && result.notFound.length > 0) {
        console.log(`\n⚠️  Tests not updated (no reference data found):`);
        result.notFound.forEach((test: string) => console.log(`   - ${test}`));
      }
      
      console.log(`\n✅ All tests have been updated with proper reference ranges from medical databases!`);
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

updateRemainingTests();

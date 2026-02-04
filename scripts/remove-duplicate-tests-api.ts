// Script to remove duplicate tests via API
// Run with: npx tsx scripts/remove-duplicate-tests-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function removeDuplicateTests() {
  console.log("🔧 Removing duplicate tests...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/remove-duplicate-tests", {
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
      console.log("✅ Duplicate removal completed!\n");
      console.log(`📊 Summary:`);
      console.log(`   - Duplicates found: ${result.duplicatesFound}`);
      console.log(`   - Tests removed: ${result.removed.length}`);
      console.log(`   - Tests kept: ${result.kept.length}\n`);

      if (result.kept && result.kept.length > 0) {
        console.log("✅ Tests kept (oldest instance):");
        result.kept.forEach((test: string) => console.log(`   - ${test}`));
        console.log();
      }

      if (result.removed && result.removed.length > 0) {
        console.log("🗑️  Tests removed (marked inactive):");
        result.removed.forEach((test: string) => console.log(`   - ${test}`));
        console.log();
      }

      console.log("✅ All duplicate tests have been removed!");
    } else {
      console.error("❌ Removal failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling removal API:", error);
  }
}

removeDuplicateTests();

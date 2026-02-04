// Script to import Special Test via API
// Run with: npx tsx scripts/import-special-tests-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function importSpecialTest() {
  console.log("🚀 Starting import of Special Test...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/import-special-tests", {
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
      console.log(`📊 Result: ${result.message}`);
      
      if (result.added) {
        console.log(`\n✨ Test added: ${result.added}`);
      }
      
      if (result.updated) {
        console.log(`\n🔄 Test was updated (already existed)`);
      }
      
      console.log(`\n✅ Special Test has been imported!`);
      console.log(`\nTest Details:`);
      console.log(`   - Lab Type: Special Test`);
      console.log(`   - Test Name: By genexpert PCR for HIV Viral Load`);
      console.log(`   - Test Code: PCR`);
      console.log(`   - Sample Type: Serum`);
      console.log(`   - Container: SST tube`);
      console.log(`   - Type: Standalone test (no group)`);
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

importSpecialTest();

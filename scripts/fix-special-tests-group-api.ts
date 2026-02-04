// Script to fix "Special Tests" group in Biochemistry via API
// Run with: npx tsx scripts/fix-special-tests-group-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

async function fixSpecialTestsGroup() {
  console.log("🔧 Fixing 'Special Tests' group in Biochemistry...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/fix-special-tests-group", {
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
      console.log("✅ Fix completed successfully!\n");
      console.log(`📊 Changes made: ${result.updates.length}\n`);
      
      if (result.updates && result.updates.length > 0) {
        console.log("🔄 Updates:");
        result.updates.forEach((update: string) => console.log(`   - ${update}`));
      }
      
      console.log("\n✅ 'Special Tests' group has been cleaned up!");
      console.log("\nResult:");
      console.log("   - PCR tests moved to Special Test lab type");
      console.log("   - Other tests made standalone in Biochemistry");
      console.log("   - 'Special Tests' group removed from Biochemistry");
    } else {
      console.error("❌ Fix failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling fix API:", error);
  }
}

fixSpecialTestsGroup();

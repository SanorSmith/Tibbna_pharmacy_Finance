// Script to check for duplicate tests across lab types via API
// Run with: npx tsx scripts/check-duplicate-tests-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function checkDuplicateTests() {
  console.log("🔍 Checking for duplicate tests across lab types...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/check-duplicate-tests", {
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
      console.log("📊 Duplicate Test Analysis:\n");
      console.log(`   - Total tests appearing in multiple lab types: ${result.totalDuplicates}`);
      console.log(`   - Total standalone tests: ${result.standaloneTestsCount}`);
      console.log(`   - Duplicate standalone tests: ${result.duplicateStandaloneCount}\n`);

      if (result.duplicateStandaloneCount > 0) {
        console.log("⚠️  DUPLICATE STANDALONE TESTS FOUND:\n");
        result.duplicateStandalone.forEach((dup: any) => {
          console.log(`   📌 ${dup.testcode}: ${dup.testname}`);
          console.log(`      Appears in: ${dup.labtypes}`);
          dup.tests.forEach((test: any) => {
            console.log(`         - ${test.labtype} (Sample: ${test.sampletype || 'N/A'})`);
          });
          console.log();
        });
      } else {
        console.log("✅ No duplicate standalone tests found!\n");
      }

      if (result.totalDuplicates > 0) {
        console.log("📋 ALL DUPLICATE TESTS (including grouped tests):\n");
        result.duplicateTests.slice(0, 20).forEach((dup: any) => {
          console.log(`   📌 ${dup.testcode}: ${dup.testname}`);
          console.log(`      Appears in ${dup.count} lab types: ${dup.appearsIn}`);
          dup.details.forEach((detail: any) => {
            const groupInfo = detail.grouptests ? `Group: ${detail.grouptests}` : 'Standalone';
            console.log(`         - ${detail.labtype} (${groupInfo}, Sample: ${detail.sampletype || 'N/A'})`);
          });
          console.log();
        });
        
        if (result.totalDuplicates > 20) {
          console.log(`   ... and ${result.totalDuplicates - 20} more duplicates\n`);
        }
      }

      console.log("\n✅ Duplicate check complete!");
    } else {
      console.error("❌ Check failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling check API:", error);
  }
}

checkDuplicateTests();

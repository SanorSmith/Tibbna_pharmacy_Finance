// Script to validate all test codes via API
// Run with: npx tsx scripts/validate-test-codes-api.ts

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function validateTestCodes() {
  console.log("🔍 Validating all test codes and data...\n");

  try {
    const response = await fetch("http://localhost:3000/api/admin/validate-test-codes", {
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
      console.log("📊 Validation Report:\n");
      console.log(`   - Total tests: ${result.totalTests}`);
      console.log(`   - Tests with validation issues: ${result.validationIssues}`);
      console.log(`   - Tests with short codes (<2 chars): ${result.shortCodes.length}`);
      console.log(`   - Duplicate codes in same lab type: ${result.duplicatesInSameLabType.length}\n`);

      if (result.validationIssues > 0) {
        console.log("⚠️  VALIDATION ISSUES FOUND:\n");
        result.issues.slice(0, 20).forEach((issue: any) => {
          console.log(`   📌 ${issue.testcode}: ${issue.testname}`);
          console.log(`      Lab Type: ${issue.labtype}`);
          console.log(`      Issues:`);
          issue.issues.forEach((i: string) => console.log(`         - ${i}`));
          console.log();
        });
        
        if (result.validationIssues > 20) {
          console.log(`   ... and ${result.validationIssues - 20} more issues\n`);
        }
      } else {
        console.log("✅ All tests have valid codes and required data!\n");
      }

      if (result.shortCodes.length > 0) {
        console.log("⚠️  Tests with very short codes (<2 characters):\n");
        result.shortCodes.forEach((test: any) => {
          console.log(`   - "${test.testcode}": ${test.testname} (${test.labtype})`);
        });
        console.log();
      }

      if (result.duplicatesInSameLabType.length > 0) {
        console.log("⚠️  Duplicate test codes within same lab type:\n");
        result.duplicatesInSameLabType.forEach((dup: any) => {
          console.log(`   - ${dup.testcode} in ${dup.labtype}: ${dup.count} instances`);
        });
        console.log();
      }

      console.log("✅ Validation complete!");
    } else {
      console.error("❌ Validation failed:", result.error);
      if (result.details) {
        console.error("Details:", result.details);
      }
    }
  } catch (error) {
    console.error("❌ Error calling validation API:", error);
  }
}

validateTestCodes();

// Check a few test records to see their current state
const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function checkTests() {
  try {
    const response = await fetch(`http://localhost:3000/api/lab-management/test-reference-ranges?workspaceid=${WORKSPACE_ID}`);
    const data = await response.json();
    
    console.log(`Total tests: ${data.ranges?.length || 0}\n`);
    
    // Show first 10 tests
    if (data.ranges && data.ranges.length > 0) {
      console.log("Sample test data (first 10):\n");
      data.ranges.slice(0, 10).forEach((test: any) => {
        console.log(`Test: ${test.testname}`);
        console.log(`  Code: ${test.testcode}`);
        console.log(`  Unit: ${test.unit}`);
        console.log(`  Sex: ${test.sex}, Age: ${test.agegroup}`);
        console.log(`  Reference Min: ${test.referencemin}`);
        console.log(`  Reference Max: ${test.referencemax}`);
        console.log(`  Reference Text: ${test.referencetext}`);
        console.log(`  Panic Low: ${test.paniclow}, High: ${test.panichigh}`);
        console.log(`  Updated: ${test.updatedat}\n`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTests();

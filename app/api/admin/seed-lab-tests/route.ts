/**
 * API endpoint to seed lab test catalog
 * GET /api/admin/seed-lab-tests
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

// Import all 104 individual tests from the test catalog
import { INDIVIDUAL_TESTS } from "@/lib/test-catalog";

// Convert INDIVIDUAL_TESTS to database format
const allTests = Object.values(INDIVIDUAL_TESTS).map(test => ({
  workspaceid: WORKSPACE_ID,
  testcode: test.code,
  testname: test.name,
  testcategory: test.category,
  specimentype: test.material || "Blood",
  testdescription: test.description || `${test.name} test`,
  turnaroundtime: test.category === "Microbiology" ? "48-72 hours" : 
                  test.category === "Histopathology" ? "5-7 days" :
                  test.category === "Immunology" ? "3-5 days" : "24 hours",
  fastingrequired: test.fastingRequired || false,
  isactive: true,
}));

export async function GET() {
  try {
    const results = {
      added: [] as string[],
      existing: [] as string[],
      errors: [] as string[],
    };

    for (const test of allTests) {
      try {
        // Check if test already exists (testcode is globally unique)
        const existing = await db
          .select()
          .from(labTestCatalog)
          .where(eq(labTestCatalog.testcode, test.testcode))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(labTestCatalog).values(test);
          results.added.push(`${test.testcode} - ${test.testname}`);
        } else {
          // Update test with latest data including fasting requirement
          await db
            .update(labTestCatalog)
            .set({ 
              workspaceid: test.workspaceid,
              testname: test.testname,
              testcategory: test.testcategory,
              specimentype: test.specimentype,
              testdescription: test.testdescription,
              turnaroundtime: test.turnaroundtime,
              fastingrequired: test.fastingrequired,
              isactive: test.isactive,
              updatedat: new Date(),
            })
            .where(eq(labTestCatalog.testcode, test.testcode));
          results.existing.push(`${test.testcode} - ${test.testname} (updated)`);
        }
      } catch (error) {
        results.errors.push(
          `${test.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lab test catalog seeding completed",
      results,
      summary: {
        total: allTests.length,
        added: results.added.length,
        existing: results.existing.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error("Error seeding lab test catalog:", error);
    return NextResponse.json(
      {
        error: "Failed to seed lab test catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

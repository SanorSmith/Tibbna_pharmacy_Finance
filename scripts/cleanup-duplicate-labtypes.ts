// Script to check and clean up duplicate lab types
// Run with: npx tsx scripts/cleanup-duplicate-labtypes.ts

import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema/test-reference-ranges";
import { eq, and, sql } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function cleanupLabTypes() {
  console.log("🔍 Checking for duplicate lab types...\n");

  try {
    // Get all distinct lab types with test counts
    const labTypeCounts = await db
      .select({
        labtype: testReferenceRanges.labtype,
        count: sql<number>`count(*)::int`,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          eq(testReferenceRanges.isactive, "Y")
        )
      )
      .groupBy(testReferenceRanges.labtype)
      .orderBy(testReferenceRanges.labtype);

    console.log("📊 Lab Types in Database:\n");
    labTypeCounts.forEach((lt) => {
      console.log(`   - ${lt.labtype}: ${lt.count} tests`);
    });

    // Check for "Special Test" vs "Special Tests" confusion
    const specialTestVariants = labTypeCounts.filter(
      (lt) => lt.labtype?.toLowerCase().includes("special test")
    );

    if (specialTestVariants.length > 1) {
      console.log("\n⚠️  Found multiple 'Special Test' variants:");
      specialTestVariants.forEach((lt) => {
        console.log(`   - "${lt.labtype}": ${lt.count} tests`);
      });

      console.log("\n🔧 Consolidating to 'Special Test'...");

      // Update all variants to use "Special Test"
      for (const variant of specialTestVariants) {
        if (variant.labtype !== "Special Test") {
          await db
            .update(testReferenceRanges)
            .set({ labtype: "Special Test" })
            .where(
              and(
                eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
                eq(testReferenceRanges.labtype, variant.labtype!)
              )
            );
          console.log(`   ✅ Updated "${variant.labtype}" to "Special Test"`);
        }
      }
    }

    // Get updated counts
    const updatedCounts = await db
      .select({
        labtype: testReferenceRanges.labtype,
        count: sql<number>`count(*)::int`,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          eq(testReferenceRanges.isactive, "Y")
        )
      )
      .groupBy(testReferenceRanges.labtype)
      .orderBy(testReferenceRanges.labtype);

    console.log("\n✅ Final Lab Types:\n");
    updatedCounts.forEach((lt) => {
      console.log(`   - ${lt.labtype}: ${lt.count} tests`);
    });

    console.log("\n🎉 Cleanup complete!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
}

cleanupLabTypes();

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessionSamples, validationStates, testResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    // Get all samples that have test results but no validation state
    const allSamples = await db
      .select()
      .from(accessionSamples);

    const fixed = [];
    
    for (const sample of allSamples) {
      // Check if sample has test results
      const results = await db
        .select()
        .from(testResults)
        .where(eq(testResults.sampleid, sample.sampleid));

      if (results.length > 0) {
        // Check if validation state exists
        const existingState = await db
          .select()
          .from(validationStates)
          .where(eq(validationStates.sampleid, sample.sampleid))
          .limit(1);

        if (existingState.length === 0) {
          // Create validation state as ANALYZED
          await db.insert(validationStates).values({
            sampleid: sample.sampleid,
            currentstate: 'ANALYZED',
          });
          
          fixed.push({
            sampleid: sample.sampleid,
            samplenumber: sample.samplenumber,
            resultsCount: results.length,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} samples`,
      fixed,
    });
  } catch (error) {
    console.error("Fix validation states error:", error);
    return NextResponse.json(
      { error: "Failed to fix validation states", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { samples, validationStates, testResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get all samples
    const allSamples = await db.select().from(samples).limit(10);
    
    // Get validation states
    const allValidationStates = await db.select().from(validationStates).limit(10);
    
    // Get test results
    const allTestResults = await db.select().from(testResults).limit(10);
    
    // Get samples with their validation states and results
    const samplesWithData = await Promise.all(
      allSamples.map(async (sample) => {
        const validationState = await db
          .select()
          .from(validationStates)
          .where(eq(validationStates.sampleid, sample.sampleid))
          .limit(1);
        
        const results = await db
          .select()
          .from(testResults)
          .where(eq(testResults.sampleid, sample.sampleid));
        
        return {
          sample: {
            sampleid: sample.sampleid,
            orderid: sample.orderid,
            sampletype: sample.sampletype,
            collectiondate: sample.collectiondate,
            testgroup: sample.testgroup,
          },
          validationState: validationState[0] || null,
          resultsCount: results.length,
          results: results.map(r => ({
            testcode: r.testcode,
            testname: r.testname,
            resultvalue: r.resultvalue,
            status: r.status,
          })),
        };
      })
    );
    
    return NextResponse.json({
      totalSamples: allSamples.length,
      totalValidationStates: allValidationStates.length,
      totalTestResults: allTestResults.length,
      samplesWithData,
    });
  } catch (error) {
    console.error("Check samples error:", error);
    return NextResponse.json(
      { error: "Failed to check samples", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

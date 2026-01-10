import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testResults } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    // Get all test results ordered by most recent
    const allResults = await db
      .select()
      .from(testResults)
      .orderBy(desc(testResults.createdat))
      .limit(20);
    
    return NextResponse.json({
      totalResults: allResults.length,
      results: allResults.map(r => ({
        resultid: r.resultid,
        sampleid: r.sampleid,
        testcode: r.testcode,
        testname: r.testname,
        resultvalue: r.resultvalue,
        resultnumeric: r.resultnumeric,
        unit: r.unit,
        flag: r.flag,
        isabormal: r.isabormal,
        iscritical: r.iscritical,
        status: r.status,
        createdat: r.createdat,
      })),
    });
  } catch (error) {
    console.error("Check results error:", error);
    return NextResponse.json(
      { error: "Failed to check results", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

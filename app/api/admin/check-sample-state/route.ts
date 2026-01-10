import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { samples, validationStates, testResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sampleid = searchParams.get("sampleid");
    
    if (!sampleid) {
      return NextResponse.json({ error: "sampleid required" }, { status: 400 });
    }

    const sample = await db
      .select()
      .from(samples)
      .where(eq(samples.sampleid, sampleid))
      .limit(1);

    const validationState = await db
      .select()
      .from(validationStates)
      .where(eq(validationStates.sampleid, sampleid))
      .limit(1);

    const results = await db
      .select()
      .from(testResults)
      .where(eq(testResults.sampleid, sampleid));

    return NextResponse.json({
      sample: sample[0] || null,
      validationState: validationState[0] || null,
      resultsCount: results.length,
      results: results.map(r => ({
        testcode: r.testcode,
        testname: r.testname,
        resultvalue: r.resultvalue,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("Check sample state error:", error);
    return NextResponse.json(
      { error: "Failed to check sample state" },
      { status: 500 }
    );
  }
}

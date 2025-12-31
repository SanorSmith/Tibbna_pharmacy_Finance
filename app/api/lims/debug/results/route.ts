import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";

/**
 * GET /api/lims/debug/results
 * Debug endpoint to view all test results in the database
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all samples with their test results
    const samples = await db.query.samples.findMany({
      with: {
        patientid: {
          columns: {
            firstname: true,
            lastname: true,
          },
        },
      },
      limit: 10,
    });

    // Fetch test results for each sample
    const samplesWithResults = await Promise.all(
      samples.map(async (sample) => {
        const results = await db.query.testResults.findMany({
          where: (testResults, { eq }) => eq(testResults.sampleid, sample.sampleid),
        });

        const validationState = await db.query.validationStates.findFirst({
          where: (validationStates, { eq }) => eq(validationStates.sampleid, sample.sampleid),
        });

        return {
          sample: {
            sampleid: sample.sampleid,
            orderid: sample.orderid,
            testgroup: sample.testgroup,
            priority: sample.priority,
            collectiondate: sample.collectiondate,
          },
          patient: sample.patientid,
          validationState: validationState?.currentstate || "NONE",
          resultsCount: results.length,
          results: results.map((r) => ({
            testname: r.testname,
            resultvalue: r.resultvalue,
            unit: r.unit,
            flag: r.flag,
            iscritical: r.iscritical,
            referencerange: r.referencerange,
            validationcomment: r.validationcomment,
            markedforrerun: r.markedforrerun,
          })),
        };
      })
    );

    return NextResponse.json({
      totalSamples: samples.length,
      samples: samplesWithResults,
    });
  } catch (error) {
    console.error("[API] Error fetching debug results:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch results",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

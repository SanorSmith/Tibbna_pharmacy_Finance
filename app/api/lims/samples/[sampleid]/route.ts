import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { samples, testResults, validationStates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/lims/samples/[sampleid]
 * Fetch detailed sample information with test results and validation state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;

    // Fetch sample with all related data
    const sample = await db.query.samples.findFirst({
      where: eq(samples.sampleid, sampleid),
      with: {
        patientid: {
          columns: {
            patientid: true,
            firstname: true,
            lastname: true,
            dateofbirth: true,
            gender: true,
          },
        },
      },
    });

    if (!sample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Fetch test results
    const results = await db.query.testResults.findMany({
      where: eq(testResults.sampleid, sampleid),
      orderBy: (testResults, { asc }) => [asc(testResults.testname)],
    });

    // Fetch validation state
    const validationState = await db.query.validationStates.findFirst({
      where: eq(validationStates.sampleid, sampleid),
      with: {
        validatedby: {
          columns: {
            name: true,
            email: true,
          },
        },
        releasedby: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Check if there are previous results for this patient
    const hasPreviousResults = results.some((r) => r.previousvalue !== null);

    return NextResponse.json({
      sample,
      results,
      validationState,
      hasPreviousResults,
    });
  } catch (error) {
    console.error("[API] Error fetching sample:", error);
    return NextResponse.json(
      { error: "Failed to fetch sample" },
      { status: 500 }
    );
  }
}

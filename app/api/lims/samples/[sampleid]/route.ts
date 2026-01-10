import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, testResults, validationStates, patients } from "@/lib/db/schema";
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

    // Fetch sample from accession_samples table
    const sample = await db
      .select()
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleid))
      .limit(1);

    if (!sample || sample.length === 0) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    const sampleData = sample[0];

    // Fetch patient data if patientid exists
    let patientData = null;
    if (sampleData.patientid) {
      const patient = await db
        .select({
          patientid: patients.patientid,
          firstname: patients.firstname,
          lastname: patients.lastname,
          dateofbirth: patients.dateofbirth,
          gender: patients.gender,
        })
        .from(patients)
        .where(eq(patients.patientid, sampleData.patientid))
        .limit(1);
      
      if (patient && patient.length > 0) {
        patientData = patient[0];
      }
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
      sample: {
        ...sampleData,
        patient: patientData,
      },
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

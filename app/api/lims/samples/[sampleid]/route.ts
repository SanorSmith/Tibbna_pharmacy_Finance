import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, testResults, validationStates, patients, limsOrderTests, labTestCatalog, testReferenceRanges } from "@/lib/db/schema";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";

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

    // If no results exist yet, build requested tests from order or sample's tests array
    let requestedTests: any[] = [];
    if (results.length === 0) {
      // 1) Try from limsOrderTests (LIMS orders)
      if (sampleData.orderid) {
        const orderTests = await db
          .select({
            testcode: labTestCatalog.testcode,
            testname: labTestCatalog.testname,
            testcategory: labTestCatalog.testcategory,
          })
          .from(limsOrderTests)
          .leftJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
          .where(sql`${limsOrderTests.orderid}::text = ${sampleData.orderid}::text`);

        for (const test of orderTests) {
          if (!test.testcode) continue;
          let refRange = null;
          try {
            [refRange] = await db
              .select()
              .from(testReferenceRanges)
              .where(and(ilike(testReferenceRanges.testcode, test.testcode), eq(testReferenceRanges.isactive, 'Y')))
              .limit(1);
            if (!refRange && test.testname) {
              [refRange] = await db
                .select()
                .from(testReferenceRanges)
                .where(and(ilike(testReferenceRanges.testname, test.testname), eq(testReferenceRanges.isactive, 'Y')))
                .limit(1);
            }
          } catch { /* ignore */ }

          requestedTests.push({
            resultid: null,
            testcode: test.testcode,
            testname: test.testname,
            testcategory: test.testcategory || refRange?.grouptests || null,
            sampletype: refRange?.sampletype || null,
            containertype: refRange?.containertype || null,
            resultvalue: null,
            unit: refRange?.unit || null,
            referencemin: refRange?.referencemin ? parseFloat(refRange.referencemin) : null,
            referencemax: refRange?.referencemax ? parseFloat(refRange.referencemax) : null,
            referencerange: refRange?.referencetext || null,
            flag: null,
            isabormal: false,
            iscritical: false,
            status: 'pending',
            hasResult: false,
          });
        }
      }

      // 2) If still empty, try from sample's tests JSONB array (OpenEHR orders)
      let testsArray: string[] = [];
      if (Array.isArray(sampleData.tests)) {
        testsArray = sampleData.tests.map((t: unknown) => String(t || "").trim()).filter(Boolean);
      } else if (typeof sampleData.tests === 'string') {
        try {
          let parsed = JSON.parse(sampleData.tests);
          // Handle double-encoded JSON
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          if (Array.isArray(parsed)) {
            testsArray = parsed.map((t: unknown) => String(t || "").trim()).filter(Boolean);
          }
        } catch { /* not valid JSON */ }
      }
      if (requestedTests.length === 0 && testsArray.length > 0) {
        const testTokens = testsArray;
        if (testTokens.length > 0) {
          const catalogTests = await db
            .select({
              testcode: labTestCatalog.testcode,
              testname: labTestCatalog.testname,
              testcategory: labTestCatalog.testcategory,
            })
            .from(labTestCatalog)
            .where(
              and(
                eq(labTestCatalog.workspaceid, sampleData.workspaceid),
                or(
                  inArray(labTestCatalog.testcode, testTokens),
                  inArray(labTestCatalog.testname, testTokens)
                )
              )
            );

          for (const test of catalogTests) {
            if (!test.testcode) continue;
            let refRange = null;
            try {
              [refRange] = await db
                .select()
                .from(testReferenceRanges)
                .where(and(ilike(testReferenceRanges.testcode, test.testcode), eq(testReferenceRanges.isactive, 'Y')))
                .limit(1);
              if (!refRange && test.testname) {
                [refRange] = await db
                  .select()
                  .from(testReferenceRanges)
                  .where(and(ilike(testReferenceRanges.testname, test.testname), eq(testReferenceRanges.isactive, 'Y')))
                  .limit(1);
              }
            } catch { /* ignore */ }

            requestedTests.push({
              resultid: null,
              testcode: test.testcode,
              testname: test.testname,
              testcategory: test.testcategory || refRange?.grouptests || null,
              sampletype: refRange?.sampletype || null,
              containertype: refRange?.containertype || null,
              resultvalue: null,
              unit: refRange?.unit || null,
              referencemin: refRange?.referencemin ? parseFloat(refRange.referencemin) : null,
              referencemax: refRange?.referencemax ? parseFloat(refRange.referencemax) : null,
              referencerange: refRange?.referencetext || null,
              flag: null,
              isabormal: false,
              iscritical: false,
              status: 'pending',
              hasResult: false,
            });
          }
        }
      }
    }

    // Enrich results or requestedTests with specimen/container info from reference ranges
    const finalResults = results.length > 0 ? results : requestedTests;
    if (results.length > 0) {
      // Results exist but lack sampletype/containertype — look them up
      const testCodes = results.map((r) => r.testcode).filter(Boolean);
      if (testCodes.length > 0) {
        const refRows = await db
          .select({
            testcode: testReferenceRanges.testcode,
            sampletype: testReferenceRanges.sampletype,
            containertype: testReferenceRanges.containertype,
            grouptests: testReferenceRanges.grouptests,
          })
          .from(testReferenceRanges)
          .where(and(
            inArray(testReferenceRanges.testcode, testCodes),
            eq(testReferenceRanges.isactive, 'Y')
          ));

        const refMap = new Map<string, { sampletype: string | null; containertype: string | null; testcategory: string | null }>();
        for (const r of refRows) {
          if (r.testcode && !refMap.has(r.testcode)) {
            refMap.set(r.testcode, { sampletype: r.sampletype, containertype: r.containertype, testcategory: r.grouptests });
          }
        }

        for (let i = 0; i < finalResults.length; i++) {
          const ref = refMap.get(finalResults[i].testcode);
          if (ref) {
            (finalResults as any[])[i] = {
              ...finalResults[i],
              sampletype: ref.sampletype || null,
              containertype: ref.containertype || null,
              testcategory: (finalResults[i] as any).testcategory || ref.testcategory || null,
            };
          }
        }
      }
    }

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
      results: finalResults,
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

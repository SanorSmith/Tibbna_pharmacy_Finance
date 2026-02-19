/**
 * Sample Search API
 * Search for samples by sample ID or patient ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, patients, testResults, limsOrderTests, labTestCatalog, testReferenceRanges } from "@/lib/db/schema";
import { eq, or, ilike, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const workspaceid = searchParams.get("workspaceid");

    if (!query || !workspaceid) {
      return NextResponse.json(
        { error: "Query and workspaceid are required" },
        { status: 400 }
      );
    }

    // Search for samples by sample number, patient name, or patient ID
    const samples = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
        sampletype: accessionSamples.sampletype,
        collectiondate: accessionSamples.collectiondate,
        orderid: accessionSamples.orderid,
        patientid: accessionSamples.patientid,
        patient: {
          patientid: patients.patientid,
          firstname: patients.firstname,
          lastname: patients.lastname,
          dateofbirth: patients.dateofbirth,
          gender: patients.gender,
        },
      })
      .from(accessionSamples)
      .leftJoin(patients, sql`${accessionSamples.patientid}::text = ${patients.patientid}::text`)
      .where(
        and(
          eq(accessionSamples.workspaceid, workspaceid),
          or(
            ilike(accessionSamples.samplenumber, `%${query}%`),
            ilike(patients.firstname, `%${query}%`),
            ilike(patients.lastname, `%${query}%`),
            sql`${patients.patientid}::text ILIKE ${'%' + query + '%'}`
          )
        )
      )
      .limit(10);

    // For each sample, fetch test results and requested tests
    const enrichedSamples = await Promise.all(
      samples.map(async (sample) => {
        // Fetch existing test results
        const results = await db
          .select()
          .from(testResults)
          .where(eq(testResults.sampleid, sample.sampleid));

        // Fetch requested tests from order
        let requestedTests: any[] = [];
        if (sample.orderid) {
          const orderTests = await db
            .select({
              testcode: labTestCatalog.testcode,
              testname: labTestCatalog.testname,
              testcategory: labTestCatalog.testcategory,
            })
            .from(limsOrderTests)
            .leftJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
            .where(sql`${limsOrderTests.orderid}::text = ${sample.orderid}::text`);

          // Get reference ranges for each test
          requestedTests = await Promise.all(
            orderTests.map(async (test) => {
              if (!test.testcode) return null;

              // Try matching by testcode first, then fall back to testname
              let [refRange] = await db
                .select()
                .from(testReferenceRanges)
                .where(
                  and(
                    ilike(testReferenceRanges.testcode, test.testcode),
                    eq(testReferenceRanges.isactive, 'Y')
                  )
                )
                .limit(1);

              if (!refRange && test.testname) {
                [refRange] = await db
                  .select()
                  .from(testReferenceRanges)
                  .where(
                    and(
                      ilike(testReferenceRanges.testname, test.testname),
                      eq(testReferenceRanges.isactive, 'Y')
                    )
                  )
                  .limit(1);
              }

              let unit = refRange?.unit || null;
              let referencerange = refRange?.referencetext || null;

              if (!refRange && test.testcategory) {
                const category = test.testcategory.toLowerCase();
                if (category.includes('pathology') || category.includes('cytology') || 
                    category.includes('biopsy') || category.includes('screening')) {
                  referencerange = 'Descriptive result';
                  unit = 'N/A';
                }
              }

              return {
                testcode: test.testcode,
                testname: test.testname,
                unit: unit,
                referencemin: refRange?.referencemin ? parseFloat(refRange.referencemin) : null,
                referencemax: refRange?.referencemax ? parseFloat(refRange.referencemax) : null,
                referencerange: referencerange,
              };
            })
          );

          requestedTests = requestedTests.filter(t => t !== null);
        }

        // Merge requested tests with existing results
        const allTests = requestedTests.map(requestedTest => {
          const existingResult = results.find(r => r.testcode === requestedTest.testcode);

          if (existingResult) {
            return {
              resultid: existingResult.resultid,
              testcode: existingResult.testcode,
              testname: existingResult.testname,
              resultvalue: existingResult.resultvalue,
              unit: existingResult.unit || requestedTest.unit,
              referencemin: requestedTest.referencemin,
              referencemax: requestedTest.referencemax,
              referencerange: requestedTest.referencerange,
              flag: existingResult.flag,
              isabormal: existingResult.isabormal,
              iscritical: existingResult.iscritical,
              status: existingResult.status,
              hasResult: true,
            };
          } else {
            return {
              resultid: null,
              testcode: requestedTest.testcode,
              testname: requestedTest.testname,
              resultvalue: null,
              unit: requestedTest.unit,
              referencemin: requestedTest.referencemin,
              referencemax: requestedTest.referencemax,
              referencerange: requestedTest.referencerange,
              flag: null,
              isabormal: false,
              iscritical: false,
              status: 'pending',
              hasResult: false,
            };
          }
        });

        // Include existing results not matched to any requested test (e.g. no order)
        const matchedTestCodes = new Set(allTests.map(t => t.testcode));
        const unmatchedResults = results.filter(r => !matchedTestCodes.has(r.testcode));

        // Fetch reference ranges for unmatched results
        const extraTests = await Promise.all(
          unmatchedResults.map(async (r) => {
            let refMin: number | null = r.referencemin ? parseFloat(r.referencemin) : null;
            let refMax: number | null = r.referencemax ? parseFloat(r.referencemax) : null;
            let refRange: string | null = r.referencerange;
            let unit = r.unit;

            // Look up reference range from testReferenceRanges if not on the result
            if (refMin === null && refMax === null && !refRange && r.testcode) {
              // Try by testcode first, then by testname
              let [ref] = await db
                .select()
                .from(testReferenceRanges)
                .where(
                  and(
                    ilike(testReferenceRanges.testcode, r.testcode),
                    eq(testReferenceRanges.isactive, 'Y')
                  )
                )
                .limit(1);

              if (!ref && r.testname) {
                [ref] = await db
                  .select()
                  .from(testReferenceRanges)
                  .where(
                    and(
                      ilike(testReferenceRanges.testname, r.testname),
                      eq(testReferenceRanges.isactive, 'Y')
                    )
                  )
                  .limit(1);
              }

              if (ref) {
                refMin = ref.referencemin ? parseFloat(ref.referencemin) : null;
                refMax = ref.referencemax ? parseFloat(ref.referencemax) : null;
                refRange = ref.referencetext || null;
                unit = unit || ref.unit;
              }
            }

            return {
              resultid: r.resultid,
              testcode: r.testcode,
              testname: r.testname,
              resultvalue: r.resultvalue,
              unit: unit,
              referencemin: refMin,
              referencemax: refMax,
              referencerange: refRange,
              flag: r.flag,
              isabormal: r.isabormal,
              iscritical: r.iscritical,
              status: r.status,
              hasResult: true,
            };
          })
        );

        allTests.push(...extraTests);

        // Calculate patient age
        let age = 0;
        if (sample.patient?.dateofbirth) {
          const birthDate = new Date(sample.patient.dateofbirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          sampleid: sample.sampleid,
          sample: {
            sampleid: sample.sampleid,
            samplenumber: sample.samplenumber,
            sampletype: sample.sampletype,
            collectiondate: sample.collectiondate,
            orderid: sample.orderid,
          },
          patient: sample.patient ? {
            ...sample.patient,
            age: age,
          } : null,
          results: allTests,
        };
      })
    );

    return NextResponse.json({
      samples: enrichedSamples,
      count: enrichedSamples.length,
    });
  } catch (error) {
    console.error("Error searching samples:", error);
    return NextResponse.json(
      { error: "Failed to search samples" },
      { status: 500 }
    );
  }
}

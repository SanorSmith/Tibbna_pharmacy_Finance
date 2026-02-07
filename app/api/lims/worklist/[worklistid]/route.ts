/**
 * Worklist Detail API Route
 * Fetches a specific worklist with all its items, samples, patients, and test results
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { worklists, worklistItems, accessionSamples, patients, testResults, limsOrders, limsOrderTests, labTestCatalog, testReferenceRanges } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const { worklistid } = await params;

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    // Fetch worklist
    const [worklist] = await db
      .select()
      .from(worklists)
      .where(
        and(
          eq(worklists.worklistid, worklistid),
          eq(worklists.workspaceid, workspaceid)
        )
      )
      .limit(1);

    if (!worklist) {
      return NextResponse.json(
        { error: "Worklist not found" },
        { status: 404 }
      );
    }

    // Fetch worklist items with samples
    const items = await db
      .select({
        worklistitemid: worklistItems.worklistitemid,
        worklistid: worklistItems.worklistid,
        sampleid: worklistItems.sampleid,
        testcode: worklistItems.testcode,
        testname: worklistItems.testname,
        status: worklistItems.status,
        position: worklistItems.position,
        addedat: worklistItems.addedat,
        // Sample data
        sample: accessionSamples,
      })
      .from(worklistItems)
      .leftJoin(
        accessionSamples,
        sql`${worklistItems.sampleid}::uuid = ${accessionSamples.sampleid}`
      )
      .where(eq(worklistItems.worklistid, worklistid));

    // Enrich items with patient and test results data
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (!item.sample) {
          return {
            ...item,
            patient: null,
            results: [],
          };
        }

        // Fetch patient data
        let patientData = null;
        if (item.sample.patientid) {
          const [patient] = await db
            .select({
              patientid: patients.patientid,
              firstname: patients.firstname,
              lastname: patients.lastname,
              dateofbirth: patients.dateofbirth,
              gender: patients.gender,
              age: sql<number>`EXTRACT(YEAR FROM AGE(${patients.dateofbirth}))`.as('age'),
            })
            .from(patients)
            .where(sql`${patients.patientid}::text = ${item.sample.patientid}`)
            .limit(1);

          patientData = patient || null;
        }

        // Fetch test results for this sample
        const results = await db
          .select()
          .from(testResults)
          .where(eq(testResults.sampleid, item.sample.sampleid));

        // Fetch requested tests from the order or worklist item
        let requestedTests: any[] = [];
        let orderTests: any[] = [];
        
        if (item.sample.orderid) {
          // Fetch tests from order
          orderTests = await db
            .select({
              testcode: labTestCatalog.testcode,
              testname: labTestCatalog.testname,
              testcategory: labTestCatalog.testcategory,
            })
            .from(limsOrderTests)
            .leftJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
            .where(sql`${limsOrderTests.orderid}::text = ${item.sample.orderid}::text`);
        } else if (item.testcode && item.testname) {
          // Fallback: Use test from worklist item itself
          orderTests = [{
            testcode: item.testcode,
            testname: item.testname,
            testcategory: null,
          }];
        } else {
          // No order and no test in worklist item - this sample has no tests assigned
          // Log this for debugging
          console.log(`Sample ${item.sample.samplenumber} has no order and no tests in worklist item`);
        }
        
        if (orderTests.length > 0) {

          // For each requested test, get reference ranges
          requestedTests = await Promise.all(
            orderTests.map(async (test) => {
              if (!test.testcode) return null;
              
              console.log(`Looking up reference range for test code: ${test.testcode}, test name: ${test.testname}`);
              
              // Try matching by testcode first, then fall back to testname
              let [refRange] = await db
                .select()
                .from(testReferenceRanges)
                .where(
                  and(
                    eq(testReferenceRanges.testcode, test.testcode),
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
                      sql`LOWER(${testReferenceRanges.testname}) = LOWER(${test.testname})`,
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
          
          // Filter out null values
          requestedTests = requestedTests.filter(t => t !== null);
        } // End of if (orderTests.length > 0)

        // Merge requested tests with existing results
        const allTests = requestedTests.map(requestedTest => {
          const existingResult = results.find(r => r.testcode === requestedTest.testcode);
          
          if (existingResult) {
            // Return existing result with reference ranges from requestedTest
            return {
              resultid: existingResult.resultid,
              testcode: existingResult.testcode,
              testname: existingResult.testname,
              resultvalue: existingResult.resultvalue,
              unit: existingResult.unit || requestedTest.unit,
              referencemin: requestedTest.referencemin ?? existingResult.referencemin,
              referencemax: requestedTest.referencemax ?? existingResult.referencemax,
              referencerange: requestedTest.referencerange ?? existingResult.referencerange,
              flag: existingResult.flag,
              isabormal: existingResult.isabormal,
              iscritical: existingResult.iscritical,
              status: existingResult.status,
              hasResult: true,
            };
          } else {
            // Return placeholder for test that needs result entry
            return {
              resultid: null,
              testcode: requestedTest.testcode,
              testname: requestedTest.testname,
              resultvalue: null,
              unit: requestedTest.unit,
              referencemin: requestedTest.referencemin,
              referencemax: requestedTest.referencemax,
              referencerange: requestedTest.referencerange,
              flag: 'pending',
              isabormal: false,
              iscritical: false,
              status: 'pending',
              hasResult: false,
            };
          }
        });

        // Include existing results not matched to any requested test
        const matchedTestCodes = new Set(allTests.map(t => t.testcode));
        const unmatchedResults = results.filter(r => !matchedTestCodes.has(r.testcode));

        const extraTests = await Promise.all(
          unmatchedResults.map(async (r) => {
            let refMin: number | null = r.referencemin;
            let refMax: number | null = r.referencemax;
            let refRange: string | null = r.referencerange;
            let unit = r.unit;

            if (refMin === null && refMax === null && !refRange && r.testcode) {
              // Try by testcode first, then by testname
              let [ref] = await db
                .select()
                .from(testReferenceRanges)
                .where(
                  and(
                    eq(testReferenceRanges.testcode, r.testcode),
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
                      sql`LOWER(${testReferenceRanges.testname}) = LOWER(${r.testname})`,
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

        return {
          worklistitemid: item.worklistitemid,
          worklistid: item.worklistid,
          sampleid: item.sampleid,
          status: item.status,
          position: item.position,
          sample: {
            sampleid: item.sample.sampleid,
            samplenumber: item.sample.samplenumber,
            sampletype: item.sample.sampletype,
            collectiondate: item.sample.collectiondate,
            orderid: item.sample.orderid,
          },
          patient: patientData,
          results: allTests,
        };
      })
    );

    return NextResponse.json({
      worklist: {
        worklistid: worklist.worklistid,
        worklistname: worklist.worklistname,
        worklisttype: worklist.worklisttype,
        department: worklist.department,
        status: worklist.status,
        createdat: worklist.createdat,
      },
      items: enrichedItems,
      total: enrichedItems.length,
    });
  } catch (error) {
    console.error("[API] Error fetching worklist detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklist detail" },
      { status: 500 }
    );
  }
}

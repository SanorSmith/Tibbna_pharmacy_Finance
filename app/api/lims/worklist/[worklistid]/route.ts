/**
 * Worklist Detail API Route
 * Fetches a specific worklist with all its items, samples, patients, and test results
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { worklists, worklistItems, accessionSamples, patients, testResults, limsOrders, limsOrderTests, labTestCatalog, testReferenceRanges, validationStates } from "@/lib/db/schema";
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
        sql`${worklistItems.sampleid}::text = ${accessionSamples.sampleid}::text`
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

        // Fetch validation state for this sample
        const validationState = await db.query.validationStates.findFirst({
          where: eq(validationStates.sampleid, item.sample.sampleid),
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
        }
        
        // Fallback 1: Use sample's tests JSON field (populated for openEHR orders)
        if (orderTests.length === 0 && item.sample && (item.sample as any).tests) {
          const sampleTests = (item.sample as any).tests;
          if (Array.isArray(sampleTests) && sampleTests.length > 0) {
            // Tests can be strings (test codes) or objects with testcode/testname
            orderTests = sampleTests.map((t: any) => {
              if (typeof t === 'string') {
                return { testcode: t, testname: t, testcategory: null };
              }
              return {
                testcode: t.testCode || t.testcode || t.code || t,
                testname: t.testName || t.testname || t.name || t.testCode || t.testcode || t,
                testcategory: t.testCategory || t.testcategory || t.category || null,
              };
            });
          }
        }
        
        // Fallback 2: Use test from worklist item itself
        if (orderTests.length === 0 && item.testcode && item.testname) {
          orderTests = [{
            testcode: item.testcode,
            testname: item.testname,
            testcategory: null,
          }];
        }
        
        // Fallback 3: Look up tests from labTestCatalog by sample's labcategory or worklist department
        if (orderTests.length === 0) {
          const category = (item.sample as any).labcategory || worklist.department;
          if (category) {
            // Try labTestCatalog first
            const catalogTests = await db
              .select({
                testcode: labTestCatalog.testcode,
                testname: labTestCatalog.testname,
                testcategory: labTestCatalog.testcategory,
              })
              .from(labTestCatalog)
              .where(
                and(
                  sql`LOWER(${labTestCatalog.testcategory}) = LOWER(${category})`,
                  eq(labTestCatalog.workspaceid, workspaceid)
                )
              );
            if (catalogTests.length > 0) {
              orderTests = catalogTests;
            } else {
              // Try testReferenceRanges by labtype
              const refTests = await db
                .select({
                  testcode: testReferenceRanges.testcode,
                  testname: testReferenceRanges.testname,
                })
                .from(testReferenceRanges)
                .where(
                  and(
                    sql`LOWER(${testReferenceRanges.labtype}) = LOWER(${category})`,
                    eq(testReferenceRanges.workspaceid, workspaceid),
                    eq(testReferenceRanges.isactive, 'Y')
                  )
                );
              // Deduplicate by testcode
              const seen = new Set<string>();
              const uniqueRefTests = refTests.filter(t => {
                if (seen.has(t.testcode)) return false;
                seen.add(t.testcode);
                return true;
              });
              if (uniqueRefTests.length > 0) {
                orderTests = uniqueRefTests.map(t => ({ ...t, testcategory: category }));
                console.log(`Fallback 3b: Found ${uniqueRefTests.length} tests from reference ranges for labtype "${category}"`);
              }
            }
          }
        }
        
        if (orderTests.length === 0) {
          console.log(`Sample ${item.sample.samplenumber} (orderid: ${item.sample.orderid}, labcategory: ${(item.sample as any).labcategory}, worklist dept: ${worklist.department}) has no tests from any source`);
        }
        
        if (orderTests.length > 0) {

          // For each requested test, get reference ranges
          requestedTests = await Promise.all(
            orderTests.map(async (test) => {
              if (!test.testcode) return null;
              
              
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
            let refMin: number | null = r.referencemin ? parseFloat(r.referencemin) : null;
            let refMax: number | null = r.referencemax ? parseFloat(r.referencemax) : null;
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
          validationState: validationState,
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

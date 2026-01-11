/**
 * Test Results API Route
 * 
 * Provides CRUD operations for laboratory test results
 * Supports result entry, validation workflow, and status management
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { testResults, resultValidationHistory } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for test result creation
const testResultCreateSchema = z.object({
  sampleid: z.string().uuid(),
  accessionsampleid: z.string().uuid().optional(),
  worklistid: z.string().uuid().optional(),
  testcode: z.string().min(1),
  testname: z.string().min(1),
  resultvalue: z.string().min(1),
  resultnumeric: z.number().optional(),
  resulttext: z.string().optional(),
  resultcode: z.string().optional(),
  unit: z.string().optional(),
  referencemin: z.number().optional(),
  referencemax: z.number().optional(),
  referencerange: z.string().optional(),
  flag: z.string().optional(),
  isabormal: z.boolean().optional(),
  iscritical: z.boolean().optional(),
  interpretation: z.string().optional(),
  entrymethod: z.string().optional(),
  instrumentid: z.string().optional(),
  comment: z.string().optional(),
  techniciannotes: z.string().optional(),
  isqc: z.boolean().optional(),
  qclevel: z.string().optional(),
});

// GET /api/d/[workspaceid]/test-results - Get all results with filters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sampleid = searchParams.get("sampleid");
    const worklistid = searchParams.get("worklistid");
    const status = searchParams.get("status");
    const testcode = searchParams.get("testcode");
    const iscritical = searchParams.get("iscritical");
    const isabormal = searchParams.get("isabormal");

    const whereConditions: any[] = [eq(testResults.workspaceid, workspaceid)];

    if (sampleid) {
      whereConditions.push(eq(testResults.sampleid, sampleid));
    }

    if (worklistid) {
      whereConditions.push(eq(testResults.worklistid, worklistid));
    }

    if (status) {
      whereConditions.push(eq(testResults.status, status));
    }

    if (testcode) {
      whereConditions.push(eq(testResults.testcode, testcode));
    }

    if (iscritical === "true") {
      whereConditions.push(eq(testResults.iscritical, true));
    }

    if (isabormal === "true") {
      whereConditions.push(eq(testResults.isabormal, true));
    }

    const results = await db
      .select()
      .from(testResults)
      .where(and(...whereConditions))
      .orderBy(desc(testResults.createdat));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching test results:", error);
    return NextResponse.json(
      { error: "Failed to fetch test results" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/test-results - Create new result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = testResultCreateSchema.parse(body);

    // Check if result value is within normal range
    let isabormal = false;
    let iscritical = false;
    let flag = "normal";
    let interpretation = "Normal";

    if (validatedData.resultnumeric && validatedData.referencemin && validatedData.referencemax) {
      const value = validatedData.resultnumeric;
      const min = validatedData.referencemin;
      const max = validatedData.referencemax;

      if (value < min) {
        isabormal = true;
        flag = "L";
        interpretation = "Low";
        
        // Check if critically low (e.g., < 50% of min)
        if (value < min * 0.5) {
          iscritical = true;
          flag = "LL";
          interpretation = "Critically Low";
        }
      } else if (value > max) {
        isabormal = true;
        flag = "H";
        interpretation = "High";
        
        // Check if critically high (e.g., > 150% of max)
        if (value > max * 1.5) {
          iscritical = true;
          flag = "HH";
          interpretation = "Critically High";
        }
      }
    }

    // Create the result
    const newResult = await db.insert(testResults).values({
      sampleid: validatedData.sampleid,
      accessionsampleid: validatedData.accessionsampleid,
      worklistid: validatedData.worklistid,
      testcode: validatedData.testcode,
      testname: validatedData.testname,
      resultvalue: validatedData.resultvalue,
      resultnumeric: validatedData.resultnumeric?.toString(),
      resulttext: validatedData.resulttext,
      resultcode: validatedData.resultcode,
      unit: validatedData.unit,
      referencemin: validatedData.referencemin?.toString(),
      referencemax: validatedData.referencemax?.toString(),
      referencerange: validatedData.referencerange,
      flag: validatedData.flag || flag,
      isabormal: validatedData.isabormal ?? isabormal,
      iscritical: validatedData.iscritical ?? iscritical,
      interpretation: validatedData.interpretation || interpretation,
      status: "entered",
      enteredby: user.userid,
      entereddate: new Date(),
      entrymethod: validatedData.entrymethod || "manual",
      instrumentid: validatedData.instrumentid,
      comment: validatedData.comment,
      techniciannotes: validatedData.techniciannotes,
      isqc: validatedData.isqc || false,
      qclevel: validatedData.qclevel,
      analyzeddate: new Date(),
      createdby: user.userid,
      workspaceid,
    }).returning();

    // Create validation history entry
    await db.insert(resultValidationHistory).values({
      resultid: newResult[0].resultid,
      action: "entered",
      previousstatus: "draft",
      newstatus: "entered",
      newvalue: validatedData.resultvalue,
      validatedby: user.userid,
      validationlevel: "entry",
      comment: "Result entered",
      workspaceid,
    });

    // Update sample validation state to ANALYZED (only if all tests are complete)
    const { validationStates, accessionSamples, limsOrderTests, labTestCatalog } = await import("@/lib/db/schema");
    
    // Check if sample exists in accession_samples table
    const sampleExists = await db
      .select()
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, validatedData.sampleid))
      .limit(1);

    if (sampleExists.length > 0) {
      const sample = sampleExists[0];
      console.log(`Checking test completion for sample ${validatedData.sampleid}, orderid: ${sample.orderid}`);
      
      // Get the ordered tests from limsOrderTests table
      const orderedTests = await db
        .select({
          testcode: labTestCatalog.testcode,
        })
        .from(limsOrderTests)
        .innerJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
        .where(sql`${limsOrderTests.orderid}::text = ${sample.orderid}`);

      console.log(`Found ${orderedTests.length} ordered tests for order ${sample.orderid}`);

      if (orderedTests.length > 0) {
        // Get all test results for this sample
        const allResults = await db
          .select()
          .from(testResults)
          .where(eq(testResults.sampleid, validatedData.sampleid));

        const requestedTestCodes = orderedTests.map(t => t.testcode);
        const completedTestCodes = allResults.map(r => r.testcode);
        
        console.log(`Requested tests: ${requestedTestCodes.join(', ')}`);
        console.log(`Completed tests: ${completedTestCodes.join(', ')}`);
        
        // Check if all requested tests have results
        const allTestsComplete = requestedTestCodes.every(testCode => 
          completedTestCodes.includes(testCode)
        );

        console.log(`Sample ${validatedData.sampleid}: ${completedTestCodes.length}/${requestedTestCodes.length} tests completed - All complete: ${allTestsComplete}`);

        if (allTestsComplete) {
          // All tests are complete, update validation state to ANALYZED
          const existingValidationState = await db
            .select()
            .from(validationStates)
            .where(eq(validationStates.sampleid, validatedData.sampleid))
            .limit(1);

          if (existingValidationState.length > 0) {
            // Update existing state to ANALYZED if not already in a later stage
            if (!['TECH_VALIDATED', 'CLINICALLY_VALIDATED', 'RELEASED'].includes(existingValidationState[0].currentstate)) {
              await db
                .update(validationStates)
                .set({
                  currentstate: 'ANALYZED',
                  updatedat: new Date(),
                })
                .where(eq(validationStates.sampleid, validatedData.sampleid));
              console.log(`✅ Sample ${validatedData.sampleid} marked as ANALYZED - all tests complete`);
            }
          } else {
            // Create new validation state as ANALYZED
            await db.insert(validationStates).values({
              sampleid: validatedData.sampleid,
              currentstate: 'ANALYZED',
            });
            console.log(`✅ Sample ${validatedData.sampleid} marked as ANALYZED - all tests complete`);
          }

          // Check if all samples in the order are complete and update order status
          if (sample.orderid) {
            // Handle LIMS orders
            const { limsOrders } = await import("@/lib/db/schema");
            const allOrderSamples = await db
              .select()
              .from(accessionSamples)
              .where(eq(accessionSamples.orderid, sample.orderid));

            const allOrderSamplesComplete = await Promise.all(
              allOrderSamples.map(async (orderSample) => {
                const sampleState = await db
                  .select()
                  .from(validationStates)
                  .where(eq(validationStates.sampleid, orderSample.sampleid))
                  .limit(1);
                return sampleState.length > 0 && sampleState[0].currentstate === 'ANALYZED';
              })
            );

            if (allOrderSamplesComplete.every(complete => complete)) {
              // All samples in order are complete, update order status
              await db
                .update(limsOrders)
                .set({
                  status: 'COMPLETED',
                  updatedat: new Date(),
                })
                .where(sql`${limsOrders.orderid}::text = ${sample.orderid}`);
              console.log(`✅ LIMS Order ${sample.orderid} marked as COMPLETED - all samples analyzed`);
            }
          } else if (sample.openehrrequestid) {
            // Handle OpenEHR orders
            console.log(`📋 Sample ${validatedData.sampleid} is from OpenEHR request ${sample.openehrrequestid}`);
            
            // Import OpenEHR status utility
            const { getOpenEHROrderStatus, updateOpenEHROrderStatusInComposition } = await import("@/lib/openehr-order-status");
            
            // Get computed status for this OpenEHR order
            const orderStatus = await getOpenEHROrderStatus(sample.openehrrequestid);
            console.log(`📊 OpenEHR order ${sample.openehrrequestid} status: ${orderStatus}`);

            if (orderStatus === 'COMPLETED') {
              console.log(`✅ All samples for OpenEHR request ${sample.openehrrequestid} are ANALYZED - order COMPLETED`);
              // Update OpenEHR composition status
              await updateOpenEHROrderStatusInComposition(sample.openehrrequestid, 'COMPLETED');
            } else if (orderStatus === 'IN_PROGRESS') {
              console.log(`⏳ OpenEHR request ${sample.openehrrequestid} is IN_PROGRESS`);
            }
          } else {
            console.log(`⚠️ Sample ${validatedData.sampleid} has no orderid or openehrrequestid - cannot update order status`);
          }

          // Check if sample is part of a worklist and update worklist status if all samples complete
          const { worklistItems, worklists } = await import("@/lib/db/schema");
          const worklistItem = await db
            .select()
            .from(worklistItems)
            .where(eq(worklistItems.sampleid, validatedData.sampleid))
            .limit(1);

          if (worklistItem.length > 0) {
            const worklistId = worklistItem[0].worklistid;
            
            // Get all samples in this worklist
            const allWorklistItems = await db
              .select()
              .from(worklistItems)
              .where(eq(worklistItems.worklistid, worklistId));

            const allWorklistSamplesComplete = await Promise.all(
              allWorklistItems.map(async (item) => {
                if (!item.sampleid) return false;
                const sampleState = await db
                  .select()
                  .from(validationStates)
                  .where(eq(validationStates.sampleid, item.sampleid))
                  .limit(1);
                return sampleState.length > 0 && sampleState[0].currentstate === 'ANALYZED';
              })
            );

            if (allWorklistSamplesComplete.every(complete => complete)) {
              // All samples in worklist are complete, update worklist status
              await db
                .update(worklists)
                .set({
                  status: 'COMPLETED',
                  updatedat: new Date(),
                })
                .where(eq(worklists.worklistid, worklistId));
              console.log(`✅ Worklist ${worklistId} marked as COMPLETED - all samples analyzed`);
            }
          }
        } else {
          console.log(`⏳ Sample ${validatedData.sampleid} not yet complete - waiting for remaining tests`);
        }
      } else {
        // No ordered tests found - fallback to marking as ANALYZED immediately
        console.warn(`⚠️ No ordered tests found for order ${sample.orderid}. Marking sample as ANALYZED (fallback behavior)`);
        
        const existingValidationState = await db
          .select()
          .from(validationStates)
          .where(eq(validationStates.sampleid, validatedData.sampleid))
          .limit(1);

        if (existingValidationState.length > 0) {
          if (!['TECH_VALIDATED', 'CLINICALLY_VALIDATED', 'RELEASED'].includes(existingValidationState[0].currentstate)) {
            await db
              .update(validationStates)
              .set({
                currentstate: 'ANALYZED',
                updatedat: new Date(),
              })
              .where(eq(validationStates.sampleid, validatedData.sampleid));
          }
        } else {
          await db.insert(validationStates).values({
            sampleid: validatedData.sampleid,
            currentstate: 'ANALYZED',
          });
        }
      }
    } else {
      console.warn(`Sample ${validatedData.sampleid} does not exist in samples table. Skipping validation state update.`);
    }

    return NextResponse.json({ result: newResult[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating test result:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create test result" },
      { status: 500 }
    );
  }
}

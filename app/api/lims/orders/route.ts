/**
 * LIMS Orders API Route
 * POST /api/lims/orders
 * 
 * Handles test order creation with:
 * - Zod validation
 * - Test catalog validation
 * - Role-based access control
 * - openEHR composition creation
 * - FHIR ServiceRequest support
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  limsOrders,
  limsOrderTests,
  labTestCatalog,
  ORDER_STATUS,
  NewLimsOrder,
  NewLimsOrderTest,
  patients,
  users,
} from "@/lib/db/schema";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import {
  validateOrderCreation,
  validateFHIRServiceRequest,
  convertFHIRToOrder,
  checkOrderPermission,
  CreateOrderInput,
} from "@/lib/lims/order-validation";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";
import { getOpenEHRTestOrders } from "@/lib/openehr/openehr";
import { createAndSubmitLabOrder } from "@/lib/lims/openehr-order-service";
import { eq, and, inArray } from "drizzle-orm";

/**
 * POST /api/lims/orders
 * Create a new lab test order
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Order creation request:", body);

    // Detect if this is a FHIR ServiceRequest
    let orderData: Partial<CreateOrderInput>;
    
    if (body.resourceType === "ServiceRequest") {
      // Validate FHIR ServiceRequest
      const fhirValidation = validateFHIRServiceRequest(body);
      if (!fhirValidation.success) {
        return NextResponse.json(
          {
            error: "FHIR validation failed",
            errors: fhirValidation.errors,
          },
          { status: 400 }
        );
      }
      
      // Convert FHIR to internal format
      orderData = convertFHIRToOrder(fhirValidation.data!, body.workspaceId || "");
    } else {
      // Validate internal JSON format
      const validation = validateOrderCreation(body);
      if (!validation.success) {
        console.log("Validation errors:", validation.errors);
        return NextResponse.json(
          {
            error: "Validation failed",
            errors: validation.errors,
          },
          { status: 400 }
        );
      }
      orderData = validation.data!;
    }

    // Role-based access control
    const userRole = "clinician"; // TODO: Get actual role from workspace membership
    const permission = checkOrderPermission(userRole, orderData.subjectType!);
    if (!permission.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: permission.reason,
        },
        { status: 403 }
      );
    }

    // Validate requested tests against catalog
    const testValidation = await validateTestsInCatalog(
      orderData.requestedTests!,
      orderData.workspaceId!
    );
    
    if (!testValidation.valid) {
      console.error("Test validation failed:", {
        message: testValidation.message,
        invalidTests: testValidation.invalidTests,
        requestedTests: orderData.requestedTests
      });
      return NextResponse.json(
        {
          error: "Invalid tests",
          message: testValidation.message,
          invalidTests: testValidation.invalidTests,
        },
        { status: 400 }
      );
    }

    // Fetch patient's EHR ID if subject is a patient
    let patientEhrId: string | null = null;
    if (orderData.subjectType === 'patient') {
      const [patient] = await db
        .select({ ehrid: patients.ehrid })
        .from(patients)
        .where(eq(patients.patientid, orderData.subjectIdentifier!))
        .limit(1);
      
      if (patient) {
        patientEhrId = patient.ehrid;
        console.log(`[LIMS Order] Found patient EHR ID: ${patientEhrId || 'NONE'}`);
      }
    }

    // Create order in transaction
    const result = await db.transaction(async (tx) => {
      // Insert order
      const orderRecord: NewLimsOrder = {
        orderid: crypto.randomUUID(),
        subjecttype: orderData.subjectType!,
        subjectidentifier: orderData.subjectIdentifier!,
        encounterid: orderData.encounterId || null,
        studyprotocolid: orderData.studyProtocolId || null,
        priority: orderData.priority!,
        status: ORDER_STATUS.REQUESTED,
        orderingproviderid: orderData.orderingProviderId! as any, // UUID type
        orderingprovidername: orderData.orderingProviderName || null,
        sourcesystem: orderData.sourceSystem || "LIMS_UI",
        clinicalindication: orderData.clinicalIndication || null,
        clinicalnotes: orderData.clinicalNotes || null,
        statjustification: orderData.statJustification || null,
        ehrid: patientEhrId || orderData.ehrId || null,
        fhirservicerequestid: orderData.fhirServiceRequestId || null,
        workspaceid: orderData.workspaceId!,
        // Sample collection requirements
        sampletype: body.sampleType || null,
        containertype: body.containerType || null,
        volume: body.volume?.toString() || null,
        volumeunit: body.volumeUnit || "mL",
        samplerecommendations: body.sampleRecommendations || null,
      };

      const [order] = await tx.insert(limsOrders).values(orderRecord).returning();

      // Insert order tests
      const orderTestRecords: NewLimsOrderTest[] = testValidation.validTests!.map((test) => ({
        orderid: order.orderid,
        testid: test.testid || null, // UUID from labTestCatalog, or null for testReferenceRanges
        testcode: test.testcode, // Always include test code
        testname: test.testname, // Always include test name
        teststatus: "REQUESTED",
      }));

      await tx.insert(limsOrderTests).values(orderTestRecords);

      return { order, tests: testValidation.validTests! };
    });

    // Create OpenEHR lab order composition if patient has EHR ID
    console.log(`[LIMS Order] Order created with EHR ID: ${result.order.ehrid || 'NONE'}`);
    
    if (result.order.ehrid) {
      // Extract test names and categories for OpenEHR submission
      const testNames = result.tests.map((test: any) => test.testname);
      const categories = [...new Set(result.tests.map((t: any) => t.category).filter(Boolean))];
      const category = categories[0] || "";
      
      console.log(`[LIMS Order] Submitting to OpenEHR - Tests: ${testNames.join(', ')}, Category: ${category}`);
      
      // Submit lab order to OpenEHR with category metadata
      createAndSubmitLabOrder(
        result.order,
        testNames,
        orderData.orderingProviderName || user.name || "Unknown",
        result.order.ehrid,
        { category, labName: category || "Laboratory" }
      )
        .then((openEHRResult) => {
          if (openEHRResult) {
            // Update order with OpenEHR composition details
            db.update(limsOrders)
              .set({
                compositionuid: openEHRResult.compositionUid,
                timecommitted: openEHRResult.timeCommitted,
              })
              .where(eq(limsOrders.orderid, result.order.orderid))
              .execute()
              .catch((err: any) =>
                console.error("Failed to update order openEHR ids:", err)
              );
          }
        })
        .catch((err: any) =>
          console.error("OpenEHR lab order submission failed:", err)
        );
    }

    // Return success response
    return NextResponse.json({
      orderId: result.order.orderid,
      status: result.order.status,
      openEhr: result.order.ehrid
        ? {
            ehrId: result.order.ehrid,
            compositionUid: result.order.compositionuid || "pending",
          }
        : undefined,
      tests: result.tests.map((t) => ({
        testId: t.testid,
        testCode: t.testcode,
        testName: t.testname,
      })),
      createdAt: result.order.createdat,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lims/orders
 * List orders with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceid");
    const status = searchParams.get("status");
    const subjectIdentifier = searchParams.get("subjectIdentifier");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Build query conditions for local orders
    const conditions = [eq(limsOrders.workspaceid, workspaceId)];
    if (status) {
      conditions.push(eq(limsOrders.status, status));
    }
    if (subjectIdentifier) {
      conditions.push(eq(limsOrders.subjectidentifier, subjectIdentifier));
    }

    // Fetch local orders with test details
    const localOrdersRaw = await db
      .select()
      .from(limsOrders)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(limsOrders.createdat);

    // Fetch test details and patient name for each order
    const localOrders = await Promise.all(
      localOrdersRaw.map(async (order) => {
        // Get test details - handle both labTestCatalog and testReferenceRanges tests
        const orderTestsRaw = await db
          .select({
            // From limsOrderTests (always available)
            orderTestCode: limsOrderTests.testcode,
            orderTestName: limsOrderTests.testname,
            // From labTestCatalog (only if testid is not null)
            catalogTestCode: labTestCatalog.testcode,
            catalogTestName: labTestCatalog.testname,
            testcategory: labTestCatalog.testcategory,
            specimentype: labTestCatalog.specimentype,
            specimencontainer: labTestCatalog.specimencontainer,
            specimenvolume: labTestCatalog.specimenvolume,
          })
          .from(limsOrderTests)
          .leftJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
          .where(eq(limsOrderTests.orderid, order.orderid));
        
        // For tests without catalog data OR with missing specimen info, fetch from testReferenceRanges
        const testsNeedingReferenceData = orderTestsRaw
          .filter(t => (!t.catalogTestCode || !t.specimentype) && t.orderTestCode)
          .map(t => t.orderTestCode!);
        
        let referenceData: Record<string, any> = {};
        if (testsNeedingReferenceData.length > 0) {
          const refTests = await db
            .select({
              testcode: testReferenceRanges.testcode,
              sampletype: testReferenceRanges.sampletype,
              containertype: testReferenceRanges.containertype,
              labtype: testReferenceRanges.labtype,
            })
            .from(testReferenceRanges)
            .where(
              and(
                inArray(testReferenceRanges.testcode, testsNeedingReferenceData),
                eq(testReferenceRanges.workspaceid, order.workspaceid),
                eq(testReferenceRanges.isactive, "Y")
              )
            );
          
          referenceData = refTests.reduce((acc, test) => {
            acc[test.testcode] = test;
            return acc;
          }, {} as Record<string, any>);
        }
        
        // Use testcode/testname from limsOrderTests if catalog data is not available
        let testIndex = 0;
        const orderTests = orderTestsRaw.map(t => {
          const refData = referenceData[t.orderTestCode || ''];
          const testData = {
            testCode: t.catalogTestCode || t.orderTestCode || 'Unknown',
            testName: t.catalogTestName || t.orderTestName || 'Unknown Test',
            testcategory: t.testcategory || refData?.labtype,
            specimenType: t.specimentype || refData?.sampletype,
            containerType: t.specimencontainer || refData?.containertype,
            specimenvolume: t.specimenvolume,
          };
          
          testIndex++;
          
          return testData;
        });

        const categories = Array.from(
          new Set(
            (orderTests || [])
              .map((t) => t.testcategory)
              .filter((c): c is string => Boolean(c))
          )
        );

        // Get patient name, age, and sex
        let patientName = order.subjectidentifier;
        let patientAge = undefined;
        let patientSex = undefined;
        try {
          const patient = await db
            .select({
              firstname: patients.firstname,
              middlename: patients.middlename,
              lastname: patients.lastname,
              dateofbirth: patients.dateofbirth,
              gender: patients.gender,
            })
            .from(patients)
            .where(eq(patients.patientid, order.subjectidentifier))
            .limit(1);
          
          if (patient.length > 0) {
            patientName = [patient[0].firstname, patient[0].middlename, patient[0].lastname].filter(Boolean).join(' ');
            
            // Calculate age from date of birth
            if (patient[0].dateofbirth) {
              const today = new Date();
              const birthDate = new Date(patient[0].dateofbirth);
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              patientAge = age;
            }
            
            // Get gender/sex
            patientSex = patient[0].gender;
          }
        } catch (error) {
          console.error("Error fetching patient details:", error);
        }

        // Resolve canceller name if order was cancelled
        let cancelledbyname: string | null = null;
        if (order.cancelledby) {
          try {
            const [canceller] = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.userid, order.cancelledby))
              .limit(1);
            cancelledbyname = canceller?.name || null;
          } catch { /* ignore */ }
        }

        const orderData = {
          ...order,
          tests: orderTests,
          test_category: categories[0] || null,
          patientName,
          patientage: patientAge,
          patientsex: patientSex,
          cancelledbyname,
        };
        
        
        return orderData;
      })
    );

    // Try to fetch openEHR orders, but don't fail if OpenEHR is unavailable
    const openEHROrders: any[] = [];
    try {
      // Get all patients in workspace with EHR IDs
      const patientsQuery = await db
        .select()
        .from(patients)
        .where(eq(patients.workspaceid, workspaceId));
      
      const patientsWithEhr = patientsQuery.filter(p => p.ehrid);

      // Limit concurrent OpenEHR requests to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < patientsWithEhr.length; i += batchSize) {
        const batch = patientsWithEhr.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (patient) => {
            try {
              const orders = await getOpenEHRTestOrders(patient.ehrid!);
              
              // Calculate age from date of birth
              let patientAge = undefined;
              if (patient.dateofbirth) {
                const today = new Date();
                const birthDate = new Date(patient.dateofbirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                patientAge = age;
              }
              
              const ordersWithPatient = orders.map(order => ({
                ...order,
                source: "openEHR",
                patientId: patient.patientid,
                patientName: [patient.firstname, patient.middlename, patient.lastname].filter(Boolean).join(' '),
                subjectidentifier: patient.patientid,
                patientage: patientAge,
                patientsex: patient.gender,
              }));
              openEHROrders.push(...ordersWithPatient);
            } catch (error) {
              // Silently continue if OpenEHR fetch fails for a patient
            }
          })
        );
      }
    } catch (error) {
      console.error("Error fetching openEHR orders (continuing with local orders only):", error);
      // Don't throw - continue with local orders only
    }

    // Combine and deduplicate by order ID + composition UID + request_id
    // Strategy: Keep local orders, filter out OpenEHR orders that match local orders
    const localOrderIds = new Set(localOrders.map(o => o.orderid).filter(Boolean));
    const localCompositionUids = new Set(localOrders.map(o => o.compositionuid).filter(Boolean));
    
    // Filter OpenEHR orders to exclude those that match local orders
    const uniqueOpenEHROrders = openEHROrders.filter(o => {
      // Exclude if request_id matches a local order ID (same order submitted to OpenEHR)
      if (o.request_id && localOrderIds.has(o.request_id)) return false;
      // Exclude if composition_uid matches a local order's composition UID
      if (o.composition_uid && localCompositionUids.has(o.composition_uid)) return false;
      return true;
    });
    
    // Combine local orders with unique OpenEHR orders
    const combined = [
      ...localOrders.map(o => ({ ...o, source: "local" })),
      ...uniqueOpenEHROrders,
    ];
    
    // Final deduplication pass to remove any remaining duplicates
    const seen = new Set<string>();
    const allOrders = combined.filter(o => {
      const key = o.orderid || o.composition_uid || o.request_id || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      orders: allOrders,
      pagination: {
        limit,
        offset,
        total: allOrders.length,
        localCount: localOrders.length,
        openEHRCount: openEHROrders.length,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

/**
 * Validate requested tests against lab test catalog
 */
async function validateTestsInCatalog(
  testCodes: string[],
  workspaceId: string
): Promise<{
  valid: boolean;
  message?: string;
  invalidTests?: string[];
  validTests?: Array<{ testid: string | null; testcode: string; testname: string; category?: string }>;
}> {
  // Normalize test codes to lowercase for case-insensitive matching
  const normalizedTestCodes = testCodes.map(code => code.toLowerCase());
  
  // First try labTestCatalog - fetch all active tests and filter in memory for case-insensitive match
  const allCatalogTests = await db
    .select()
    .from(labTestCatalog)
    .where(
      and(
        eq(labTestCatalog.workspaceid, workspaceId),
        eq(labTestCatalog.isactive, true)
      )
    );

  // Case-insensitive matching for catalog tests
  const catalogTests = allCatalogTests.filter(t => 
    normalizedTestCodes.includes(t.testcode.toLowerCase())
  );

  const foundTestCodes = catalogTests.map((t) => t.testcode.toLowerCase());
  const remainingTestCodes = normalizedTestCodes.filter((code) => !foundTestCodes.includes(code));

  // If some tests not found in labTestCatalog, check testReferenceRanges
  let referenceTests: any[] = [];
  if (remainingTestCodes.length > 0) {
    const allReferenceTests = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceId),
          eq(testReferenceRanges.isactive, "Y")
        )
      );
    
    // Case-insensitive matching for reference tests
    referenceTests = allReferenceTests.filter(t => 
      remainingTestCodes.includes(t.testcode.toLowerCase())
    );
  }

  const foundReferenceTestCodes = referenceTests.map((t) => t.testcode.toLowerCase());
  const allFoundTestCodes = [...foundTestCodes, ...foundReferenceTestCodes];
  const invalidTests = normalizedTestCodes.filter((code) => !allFoundTestCodes.includes(code));

  if (invalidTests.length > 0) {
    console.log('Test validation details:', {
      requestedTests: testCodes,
      foundInCatalog: foundTestCodes,
      foundInReferences: foundReferenceTestCodes,
      invalidTests
    });
    
    return {
      valid: false,
      message: "Some requested tests are not available in the catalog",
      invalidTests,
    };
  }

  // Combine results from both tables
  const validTests = [
    ...catalogTests.map((t) => ({
      testid: t.testid, // UUID from labTestCatalog
      testcode: t.testcode,
      testname: t.testname,
      category: t.testcategory || undefined,
    })),
    ...referenceTests.map((t) => ({
      testid: null, // No UUID for tests from testReferenceRanges
      testcode: t.testcode,
      testname: t.testname,
      category: t.labtype || undefined,
    })),
  ];

  return {
    valid: true,
    validTests,
  };
}

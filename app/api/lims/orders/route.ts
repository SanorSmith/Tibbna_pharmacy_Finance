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
} from "@/lib/db/schema";
import {
  validateOrderCreation,
  validateFHIRServiceRequest,
  convertFHIRToOrder,
  checkOrderPermission,
  CreateOrderInput,
} from "@/lib/lims/order-validation";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";
import { getOpenEHRTestOrders } from "@/lib/openehr/openehr";
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
    const testValidation = await validateTestsAgainstCatalog(
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
        ehrid: orderData.ehrId || null,
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
        testid: test.testid,
        teststatus: "REQUESTED",
      }));

      await tx.insert(limsOrderTests).values(orderTestRecords);

      return { order, tests: testValidation.validTests! };
    });

    // Create openEHR composition using same FLAT structure as patient test-orders (best-effort)
    if (result.order.ehrid) {
      const requestId = `testreq-${Date.now()}`;

      const serviceName =
        (body.service_name as string) ||
        (body.serviceName as string) ||
        (result.tests.length === 1
          ? result.tests[0].testname
          : `${result.tests.length} Laboratory Tests`);

      const categories = Array.from(
        new Set(
          (result.tests || [])
            .map((t: any) => t.testcategory)
            .filter((c: any): c is string => Boolean(c))
        )
      );
      const testCategory = categories[0] || "Laboratory";

      const urgency =
        (orderData.priority || "ROUTINE").toString().toLowerCase() === "stat"
          ? "stat"
          : (orderData.priority || "ROUTINE").toString().toLowerCase() ===
              "urgent" ||
            (orderData.priority || "ROUTINE").toString().toLowerCase() ===
              "asap"
          ? "urgent"
          : "routine";

      const selectedTests = (result.tests || []).map((t: any) => t.testname);
      const totalTests = selectedTests.length;

      const description =
        `Test Group: ${serviceName} | ` +
        `Category: ${testCategory} | ` +
        `Laboratory: ${testCategory} | ` +
        `Selected Tests (${totalTests}/${totalTests}): ${selectedTests.join(", ")} | ` +
        `Urgency: ${urgency}`;

      const clinicalIndication =
        (orderData.clinicalIndication as string) || "";

      const narrative =
        `${serviceName} ordered (${urgency})` +
        (clinicalIndication ? ` due to ${clinicalIndication}` : "");

      const eventTime = new Date().toISOString();

      const compositionData: Record<string, unknown> = {
        "template_clinical_encounter_v1/language|code": "en",
        "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
        "template_clinical_encounter_v1/territory|code": "US",
        "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
        "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
        "template_clinical_encounter_v1/context/start_time": eventTime,
        "template_clinical_encounter_v1/context/setting|code": "238",
        "template_clinical_encounter_v1/context/setting|value": "other care",
        "template_clinical_encounter_v1/context/setting|terminology": "openehr",
        "template_clinical_encounter_v1/category|code": "433",
        "template_clinical_encounter_v1/category|value": "event",
        "template_clinical_encounter_v1/category|terminology": "openehr",

        // Service request
        "template_clinical_encounter_v1/service_request/request/service_name|other":
          serviceName,
        "template_clinical_encounter_v1/service_request/request/description":
          description,
        "template_clinical_encounter_v1/service_request/request/clinical_indication":
          clinicalIndication,
        "template_clinical_encounter_v1/service_request/request/requested_date":
          eventTime,
        "template_clinical_encounter_v1/service_request/request/requesting_provider":
          orderData.orderingProviderName || user.name || "Dr. Unknown",
        "template_clinical_encounter_v1/service_request/request/receiving_provider":
          testCategory,
        "template_clinical_encounter_v1/service_request/request/timing": eventTime,
        "template_clinical_encounter_v1/service_request/request_id": requestId,
        "template_clinical_encounter_v1/service_request/narrative": narrative,
        "template_clinical_encounter_v1/service_request/language|code": "en",
        "template_clinical_encounter_v1/service_request/language|terminology":
          "ISO_639-1",
        "template_clinical_encounter_v1/service_request/encoding|code": "UTF-8",
        "template_clinical_encounter_v1/service_request/encoding|terminology":
          "IANA_character-sets",
      };

      createOpenEHRComposition(result.order.ehrid, "template_clinical_encounter_v1", compositionData)
        .then((compositionUid) => {
          db.update(limsOrders)
            .set({
              compositionuid: compositionUid,
              openehrrequestid: requestId,
              timecommitted: new Date(),
            })
            .where(eq(limsOrders.orderid, result.order.orderid))
            .execute()
            .catch((err) =>
              console.error("Failed to update order openEHR ids:", err)
            );
        })
        .catch((err) =>
          console.error("openEHR composition creation failed:", err)
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
        // Get test details
        const orderTests = await db
          .select({
            testCode: labTestCatalog.testcode,
            testName: labTestCatalog.testname,
            testcategory: labTestCatalog.testcategory,
          })
          .from(limsOrderTests)
          .innerJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
          .where(eq(limsOrderTests.orderid, order.orderid));

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
              lastname: patients.lastname,
              dateofbirth: patients.dateofbirth,
              gender: patients.gender,
            })
            .from(patients)
            .where(eq(patients.patientid, order.subjectidentifier))
            .limit(1);
          
          if (patient.length > 0) {
            patientName = `${patient[0].firstname} ${patient[0].lastname}`;
            
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

        return {
          ...order,
          tests: orderTests,
          test_category: categories[0] || null,
          patientName,
          patientage: patientAge,
          patientsex: patientSex,
        };
      })
    );

    // Always fetch openEHR orders
    const openEHROrders: any[] = [];
    try {
      // Get all patients in workspace with EHR IDs
      const patientsQuery = await db
        .select()
        .from(patients)
        .where(eq(patients.workspaceid, workspaceId));
      
      const patientsWithEhr = patientsQuery.filter(p => p.ehrid);

      console.log(`Fetching openEHR orders for ${patientsWithEhr.length} patients with EHR IDs`);

      for (const patient of patientsWithEhr) {
        try {
          const orders = await getOpenEHRTestOrders(patient.ehrid!);
          const ordersWithPatient = orders.map(order => ({
            ...order,
            source: "openEHR",
            patientId: patient.patientid,
            patientName: `${patient.firstname} ${patient.lastname}`,
            subjectidentifier: patient.patientid,
          }));
          openEHROrders.push(...ordersWithPatient);
        } catch (error) {
          console.error(`Error fetching openEHR orders for patient ${patient.patientid}:`, error);
        }
      }
    } catch (error) {
      console.error("Error fetching openEHR orders:", error);
    }

    // Combine and return
    const allOrders = [
      ...localOrders.map(o => ({ ...o, source: "local" })),
      ...openEHROrders,
    ];

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
async function validateTestsAgainstCatalog(
  testCodes: string[],
  workspaceId: string
): Promise<{
  valid: boolean;
  message?: string;
  invalidTests?: string[];
  validTests?: Array<{ testid: string; testcode: string; testname: string }>;
}> {
  // Query catalog for requested tests
  const catalogTests = await db
    .select()
    .from(labTestCatalog)
    .where(
      and(
        inArray(labTestCatalog.testcode, testCodes),
        eq(labTestCatalog.workspaceid, workspaceId),
        eq(labTestCatalog.isactive, true)
      )
    );

  const foundTestCodes = catalogTests.map((t) => t.testcode);
  const invalidTests = testCodes.filter((code) => !foundTestCodes.includes(code));

  if (invalidTests.length > 0) {
    return {
      valid: false,
      message: "Some requested tests are not available in the catalog",
      invalidTests,
    };
  }

  return {
    valid: true,
    validTests: catalogTests.map((t) => ({
      testid: t.testid,
      testcode: t.testcode,
      testname: t.testname,
    })),
  };
}

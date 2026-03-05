/**
 * Sample Accessioning API Route
 * POST /api/lims/accession
 * 
 * Handles sample registration (accessioning) in LIMS
 * - Validates input data
 * - Generates sample ID, barcode, and QR code
 * - Creates sample record
 * - Logs audit trail
 * - Creates initial status history
 * - Integrates with openEHR (composition creation)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { 
  accessionSamples, 
  sampleStatusHistory, 
  sampleAccessionAuditLog,
  SAMPLE_STATUS,
  ACCESSION_AUDIT_ACTIONS,
  NewAccessionSample,
  limsOrders,
  ORDER_STATUS,
  patients,
  labTestCatalog,
  limsOrderTests,
  worklistItems,
  worklists,
} from "@/lib/db/schema";
import { createWorkspaceNotification } from "@/lib/notifications";
import { 
  generateSampleNumber, 
  generateBarcode, 
  generateQRCodePayload,
  validateAccessionData,
} from "@/lib/lims/accession-utils";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const {
      sampleType,
      containerType,
      volume,
      volumeUnit,
      collectionDate,
      accessionNumber,
      labCategory,
      collectorId,
      collectorName,
      orderId,
      patientId,
      ehrId,
      subjectIdentifier,
      workspaceId,
      currentLocation,
      tests,
    } = body;

    // Validate input data
    const validationErrors = validateAccessionData({
      sampleType,
      containerType,
      volume: volume ? parseFloat(volume) : undefined,
      volumeUnit,
      collectionDate: new Date(collectionDate),
      orderId,
      patientId,
      ehrId,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors: validationErrors },
        { status: 400 }
      );
    }

    // Generate sample identifiers
    const sampleNumber = await generateSampleNumber();
    const sampleId = crypto.randomUUID();
    const barcode = generateBarcode(sampleId);
    const qrcode = generateQRCodePayload(
      sampleId,
      sampleNumber,
      new Date(collectionDate),
      sampleType,
      workspaceId
    );

    // Determine if orderId is a UUID (local LIMS order) or text (OpenEHR order)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuidOrder = orderId && uuidRegex.test(orderId);
    
    // Check if this specific sample type has already been collected for this order
    // (Allow multiple different specimen types, but prevent duplicate collection of the same type)
    if (orderId && sampleType) {
      const existingSamples = await db
        .select({ sampleid: accessionSamples.sampleid, sampletype: accessionSamples.sampletype })
        .from(accessionSamples)
        .where(
          and(
            isUuidOrder
              ? eq(accessionSamples.orderid, orderId)
              : eq(accessionSamples.openehrrequestid, orderId),
            eq(accessionSamples.sampletype, sampleType)
          )
        )
        .limit(1);

      if (existingSamples.length > 0) {
        return NextResponse.json(
          { 
            error: "Sample already collected", 
            message: `A ${sampleType} sample has already been collected for this order. Please select a different specimen type or create a new order.`
          },
          { status: 400 }
        );
      }
    }
    
    // Create sample record in transaction
    const result = await db.transaction(async (tx) => {
      let resolvedLabCategory: string | null = null;

      try {
        const categories = new Set<string>();

        if (isUuidOrder && orderId) {
          const rows = await tx
            .select({ testcategory: labTestCatalog.testcategory })
            .from(limsOrderTests)
            .leftJoin(
              labTestCatalog,
              eq(limsOrderTests.testid, labTestCatalog.testid)
            )
            .where(
              and(
                eq(limsOrderTests.orderid, orderId),
                eq(labTestCatalog.workspaceid, workspaceId)
              )
            );

          for (const r of rows) {
            if (r.testcategory) categories.add(r.testcategory);
          }
        } else if (Array.isArray(tests) && tests.length > 0) {
          const normalizedTestCodes = tests
            .map((t: unknown) => String(t || "").trim())
            .filter(Boolean);

          if (normalizedTestCodes.length > 0) {
            const rows = await tx
              .select({ testcategory: labTestCatalog.testcategory })
              .from(labTestCatalog)
              .where(
                and(
                  eq(labTestCatalog.workspaceid, workspaceId),
                  inArray(labTestCatalog.testcode, normalizedTestCodes)
                )
              );

            for (const r of rows) {
              if (r.testcategory) categories.add(r.testcategory);
            }
          }
        }

        if (categories.size === 0 && labCategory) {
          const trimmed = String(labCategory).trim();
          if (trimmed) categories.add(trimmed);
        }

        if (categories.size > 0) {
          resolvedLabCategory = Array.from(categories)[0] || null;
        }
      } catch (e) {
        // Best-effort only
      }

      // Insert sample
      const sampleData: NewAccessionSample = {
        sampleid: sampleId,
        samplenumber: sampleNumber,
        accessionnumber: accessionNumber ? String(accessionNumber).trim() : null,
        sampletype: sampleType,
        containertype: containerType,
        volume: volume ? volume.toString() : null,
        volumeunit: volumeUnit || null,
        collectiondate: new Date(collectionDate),
        collectorid: collectorId || null,
        collectorname: collectorName || null,
        orderid: isUuidOrder ? orderId : null, // Only set if UUID (local LIMS order)
        openehrrequestid: !isUuidOrder ? orderId : null, // Set if text-based (OpenEHR order)
        patientid: patientId || null,
        ehrid: ehrId || null,
        subjectidentifier: subjectIdentifier || null,
        tests: tests || null, // Store ordered tests as JSONB
        labcategory: resolvedLabCategory,
        barcode,
        qrcode,
        currentstatus: SAMPLE_STATUS.RECEIVED,
        currentlocation: currentLocation || "Accessioning Desk",
        accessionedby: user.userid,
        workspaceid: workspaceId,
      };

      const [sample] = await tx.insert(accessionSamples).values(sampleData).returning();

      // Create initial status history
      await tx.insert(sampleStatusHistory).values({
        sampleid: sample.sampleid,
        previousstatus: null,
        newstatus: SAMPLE_STATUS.RECEIVED,
        previouslocation: null,
        newlocation: currentLocation || "Accessioning Desk",
        changedby: user.userid,
        changereason: "Initial accessioning",
      });

      // Create audit log
      await tx.insert(sampleAccessionAuditLog).values({
        sampleid: sample.sampleid,
        action: ACCESSION_AUDIT_ACTIONS.SAMPLE_ACCESSIONED,
        userid: user.userid,
        userrole: "lab_technician", // TODO: Get actual role from workspace membership
        previousdata: null,
        newdata: JSON.stringify(sampleData),
        reason: "Sample received and accessioned",
        metadata: JSON.stringify({
          workspaceId,
          orderId,
          patientId,
        }),
      });

      return sample;
    });

    // AUTO-TRANSITION: Update order status (REQUESTED → ACCEPTED → IN_PROGRESS)
    // Only for local LIMS orders (UUID-based), not OpenEHR orders
    if (isUuidOrder && orderId) {
      try {
        const { StatusTransitionService } = await import("@/lib/lims/status-transition-service");
        
        // Step 1: Accept the order (REQUESTED → ACCEPTED)
        const acceptResult = await StatusTransitionService.acceptOrder({
          orderid: orderId,
          acceptedby: user.userid,
          workspaceid: workspaceId,
          reason: "Sample collected and accessioned",
        });
        
        if (acceptResult.success) {
          console.log(`[Accession] Order auto-accepted: ${acceptResult.message}`);
        }

        // Step 2: Start order processing (ACCEPTED → IN_PROGRESS)
        const progressResult = await StatusTransitionService.startOrderProcessing({
          orderid: orderId,
          sampleid: result.sampleid,
          userid: user.userid,
        });
        
        if (progressResult.success) {
          console.log(`[Accession] Order processing started: ${progressResult.message}`);
        }
      } catch (transitionError) {
        console.error("[Accession] Status transition error:", transitionError);
        // Don't fail the accession if status transition fails
      }
    }

    // Create notification for sample registration
    try {
      const notificationResult = await createWorkspaceNotification({
        workspaceid: workspaceId,
        type: "SAMPLE_REGISTERED",
        title: "New Sample Registered",
        message: `Sample ${result.samplenumber} (${result.sampletype}) has been registered and is ready for processing.`,
        relatedentityid: result.sampleid,
        relatedentitytype: "sample",
        metadata: {
          sampleNumber: result.samplenumber,
          sampleType: result.sampletype,
          CollectionDate: result.collectiondate,
        },
        priority: "medium",
      });
    } catch (notificationError) {
      // Don't fail the request if notification fails
    }

    // Check TAT thresholds (e.g. order-to-accession may already be breached)
    try {
      const { checkAndAlertTAT } = await import("@/lib/lims/tat-service");
      await checkAndAlertTAT(workspaceId, result.sampleid);
    } catch (tatError) {
      // Don't fail the request if TAT check fails
    }

    // Best-effort: update openEHR order status when sample is collected
    if (!isUuidOrder && orderId) {
      try {
        const { updateOpenEHROrderStatusInComposition } = await import(
          "@/lib/openehr-order-status"
        );
        await updateOpenEHROrderStatusInComposition(orderId, "IN_PROGRESS");
      } catch (e) {
        // Best-effort only
      }
    }

    // TODO: Create openEHR composition
    // This would be done asynchronously or as part of the transaction
    // For now, we'll leave openehrcompositionuid as null
    // In production, call openEHR API to create composition and update the record

    return NextResponse.json({
      success: true,
      sample: {
        sampleId: result.sampleid,
        sampleNumber: result.samplenumber,
        accessionNumber: result.accessionnumber,
        barcode: result.barcode,
        qrcode: result.qrcode,
        status: result.currentstatus,
        accessionedAt: result.accessionedat,
      },
    });
  } catch (error) {
    console.error("[Accession POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to accession sample", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lims/accession
 * Retrieve list of accessioned samples
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
    const orderId = searchParams.get("orderid");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(accessionSamples.workspaceid, workspaceId)];
    if (status) {
      conditions.push(eq(accessionSamples.currentstatus, status));
    }
    
    // Filter by order ID if provided (supports both LIMS and OpenEHR orders)
    if (orderId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuidOrder = uuidRegex.test(orderId);
      
      if (isUuidOrder) {
        conditions.push(eq(accessionSamples.orderid, orderId));
      } else {
        conditions.push(eq(accessionSamples.openehrrequestid, orderId));
      }
    }

    // Join with patients table to get patient names and demographics
    // Note: Cast patientid from text to uuid for the join
    const samples = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
        accessionnumber: accessionSamples.accessionnumber,
        sampletype: accessionSamples.sampletype,
        containertype: accessionSamples.containertype,
        volume: accessionSamples.volume,
        volumeunit: accessionSamples.volumeunit,
        collectiondate: accessionSamples.collectiondate,
        collectorid: accessionSamples.collectorid,
        collectorname: accessionSamples.collectorname,
        orderid: accessionSamples.orderid,
        patientid: accessionSamples.patientid,
        ehrid: accessionSamples.ehrid,
        subjectidentifier: accessionSamples.subjectidentifier,
        tests: accessionSamples.tests,
        labcategory: accessionSamples.labcategory,
        barcode: accessionSamples.barcode,
        qrcode: accessionSamples.qrcode,
        openehrcompositionuid: accessionSamples.openehrcompositionuid,
        currentstatus: accessionSamples.currentstatus,
        currentlocation: accessionSamples.currentlocation,
        accessionedby: accessionSamples.accessionedby,
        accessionedat: accessionSamples.accessionedat,
        workspaceid: accessionSamples.workspaceid,
        createdat: accessionSamples.createdat,
        updatedat: accessionSamples.updatedat,
        openehrrequestid: accessionSamples.openehrrequestid,
        patientname: sql<string>`COALESCE(
          CASE 
            WHEN ${patients.middlename} IS NOT NULL AND TRIM(${patients.middlename}) != '' 
            THEN ${patients.firstname} || ' ' || ${patients.middlename} || ' ' || ${patients.lastname}
            ELSE ${patients.firstname} || ' ' || ${patients.lastname}
          END, 
          null
        )`.as('patientname'),
        patientage: sql<number>`COALESCE(EXTRACT(YEAR FROM AGE(${patients.dateofbirth})), null)`.as('patientage'),
        patientsex: sql<string>`COALESCE(${patients.gender}, null)`.as('patientsex'),
        nationalid: sql<string>`${patients.nationalid}`.as('nationalid'),
      })
      .from(accessionSamples)
      .leftJoin(patients, sql`${accessionSamples.patientid}::uuid = ${patients.patientid}`)
      .where(and(...conditions))
      .orderBy(desc(accessionSamples.accessionedat))
      .limit(limit)
      .offset(offset);

    // Best-effort: derive labcategory for older rows / missing values
    // Keep this robust (avoid complex SQL array bindings that can cause 500s)
    const missing = samples.filter((s: any) => !s.labcategory);
    const derivedBySampleId = new Map<string, string>();

    // 1) Derive from local LIMS order tests (per-sample query, only for missing)
    for (const s of missing) {
      if (!s.orderid) continue;
      try {
        const [row] = await db
          .select({ testcategory: labTestCatalog.testcategory })
          .from(limsOrderTests)
          .leftJoin(
            labTestCatalog,
            eq(limsOrderTests.testid, labTestCatalog.testid)
          )
          .where(
            and(
              eq(limsOrderTests.orderid, s.orderid),
              eq(labTestCatalog.workspaceid, workspaceId)
            )
          )
          .limit(1);

        if (row?.testcategory) {
          derivedBySampleId.set(String(s.sampleid), String(row.testcategory));
        }
      } catch (e) {
        // Best-effort only
      }
    }

    // 2) Derive from stored tests array by matching catalog testcode/testname
    // Build one lookup table for the whole batch to avoid N+1 catalog queries.
    const tokens = Array.from(
      new Set(
        missing
          .filter((s: any) => !derivedBySampleId.has(String(s.sampleid)))
          .flatMap((s: any) => (Array.isArray(s.tests) ? s.tests : []))
          .map((t: unknown) => String(t || "").trim())
          .filter(Boolean)
      )
    );

    if (tokens.length > 0) {
      const byCode = await db
        .select({
          key: labTestCatalog.testcode,
          testcategory: labTestCatalog.testcategory,
        })
        .from(labTestCatalog)
        .where(
          and(
            eq(labTestCatalog.workspaceid, workspaceId),
            inArray(labTestCatalog.testcode, tokens)
          )
        );

      const byName = await db
        .select({
          key: labTestCatalog.testname,
          testcategory: labTestCatalog.testcategory,
        })
        .from(labTestCatalog)
        .where(
          and(
            eq(labTestCatalog.workspaceid, workspaceId),
            inArray(labTestCatalog.testname, tokens)
          )
        );

      const categoryByToken = new Map<string, string>();
      for (const r of [...byCode, ...byName]) {
        const key = r.key ? String(r.key) : "";
        const cat = r.testcategory ? String(r.testcategory) : "";
        if (!key || !cat) continue;
        if (!categoryByToken.has(key)) categoryByToken.set(key, cat);
      }

      for (const s of missing) {
        const sid = String(s.sampleid);
        if (derivedBySampleId.has(sid)) continue;
        const arr = Array.isArray(s.tests) ? s.tests : [];
        for (const raw of arr) {
          const token = String(raw || "").trim();
          if (!token) continue;
          const cat = categoryByToken.get(token);
          if (cat) {
            derivedBySampleId.set(sid, cat);
            break;
          }
        }
      }
    }

    const samplesWithDerived = samples.map((s: any) => {
      if (s.labcategory) return s;
      const derived = derivedBySampleId.get(String(s.sampleid));
      return derived ? { ...s, labcategory: derived } : s;
    });

    // Batch lookup: which samples are already assigned to an active worklist?
    const allSampleIds = samplesWithDerived.map((s: any) => String(s.sampleid)).filter(Boolean);
    const worklistBySampleId = new Map<string, { worklistid: string; worklistname: string; workliststatus: string }>();

    if (allSampleIds.length > 0) {
      try {
        const wlRows = await db
          .select({
            sampleid: worklistItems.sampleid,
            worklistid: worklists.worklistid,
            worklistname: worklists.worklistname,
            workliststatus: worklists.status,
          })
          .from(worklistItems)
          .innerJoin(worklists, eq(worklistItems.worklistid, worklists.worklistid))
          .where(
            and(
              inArray(worklistItems.sampleid, allSampleIds),
              // Only consider active worklists (not completed/cancelled)
              sql`${worklists.status} NOT IN ('completed', 'cancelled')`
            )
          );

        for (const row of wlRows) {
          if (row.sampleid) {
            worklistBySampleId.set(String(row.sampleid), {
              worklistid: row.worklistid,
              worklistname: row.worklistname,
              workliststatus: row.workliststatus,
            });
          }
        }
      } catch (e) {
        // Best-effort: don't fail the whole request if worklist lookup fails
      }
    }

    const samplesWithWorklist = samplesWithDerived.map((s: any) => {
      const wl = worklistBySampleId.get(String(s.sampleid));
      return {
        ...s,
        worklistid: wl?.worklistid || null,
        worklistname: wl?.worklistname || null,
        workliststatus: wl?.workliststatus || null,
      };
    });

    return NextResponse.json({
      samples: samplesWithWorklist,
      pagination: {
        limit,
        offset,
        total: samplesWithDerived.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch samples" },
      { status: 500 }
    );
  }
}

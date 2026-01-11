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
} from "@/lib/db/schema";
import { 
  generateSampleNumber, 
  generateBarcode, 
  generateQRCodePayload,
  validateAccessionData,
} from "@/lib/lims/accession-utils";
import { eq, and, desc, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Accession request body:", body);
    
    const {
      sampleType,
      containerType,
      volume,
      volumeUnit,
      collectionDate,
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
      console.log("Validation errors:", validationErrors);
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
    
    // Create sample record in transaction
    const result = await db.transaction(async (tx) => {
      // Insert sample
      const sampleData: NewAccessionSample = {
        sampleid: sampleId,
        samplenumber: sampleNumber,
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
        tests: tests ? JSON.stringify(tests) : null, // Store ordered tests as JSON
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

      // Update order status to IN_PROGRESS when sample is collected (only for local LIMS orders)
      if (isUuidOrder) {
        await tx
          .update(limsOrders)
          .set({ 
            status: ORDER_STATUS.IN_PROGRESS,
            updatedat: new Date(),
          })
          .where(eq(limsOrders.orderid, orderId));
      }
      // Note: OpenEHR order status updates would be handled via openEHR API

      return sample;
    });

    // TODO: Create openEHR composition
    // This would be done asynchronously or as part of the transaction
    // For now, we'll leave openehrcompositionuid as null
    // In production, call openEHR API to create composition and update the record

    return NextResponse.json({
      success: true,
      sample: {
        sampleId: result.sampleid,
        sampleNumber: result.samplenumber,
        barcode: result.barcode,
        qrcode: result.qrcode,
        status: result.currentstatus,
        accessionedAt: result.accessionedat,
      },
    });
  } catch (error) {
    console.error("Sample accessioning error:", error);
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

    // Join with patients table to get patient names and demographics
    // Note: Cast patientid from text to uuid for the join
    const samples = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
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
        // Patient information
        patientName: sql<string>`CONCAT(${patients.firstname}, ' ', ${patients.lastname})`.as('patientName'),
        patientage: sql<number>`EXTRACT(YEAR FROM AGE(${patients.dateofbirth}))`.as('patientage'),
        patientsex: patients.gender,
      })
      .from(accessionSamples)
      .leftJoin(patients, sql`${accessionSamples.patientid}::uuid = ${patients.patientid}`)
      .where(and(...conditions))
      .orderBy(desc(accessionSamples.accessionedat))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      samples,
      pagination: {
        limit,
        offset,
        total: samples.length,
      },
    });
  } catch (error) {
    console.error("Error fetching samples:", error);
    return NextResponse.json(
      { error: "Failed to fetch samples" },
      { status: 500 }
    );
  }
}

/**
 * Sample Storage API Routes
 * 
 * Endpoints for managing sample storage with retention periods
 * - GET: List stored samples with filtering
 * - POST: Move finished sample to storage
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sampleStorage, accessionSamples, storageLocations, users } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for creating storage record
const storageCreateSchema = z.object({
  sampleid: z.string().uuid(),
  locationid: z.string().uuid(),
  retentiondays: z.number().int().min(1).max(365).default(3),
  storagenotes: z.string().optional(),
  workspaceid: z.string(),
});

// GET: List stored samples
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const status = searchParams.get("status") || "stored";
    const locationid = searchParams.get("locationid");
    const expiringSoon = searchParams.get("expiringSoon") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(sampleStorage.workspaceid, workspaceid)];
    
    if (status !== "all") {
      conditions.push(eq(sampleStorage.status, status));
    }
    
    if (locationid) {
      conditions.push(eq(sampleStorage.locationid, locationid));
    }
    
    if (expiringSoon) {
      // Samples expiring in next 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(lte(sampleStorage.expirydate, tomorrow));
      conditions.push(gte(sampleStorage.expirydate, new Date()));
    }

    // Fetch stored samples with related data
    const storedSamples = await db
      .select({
        storageid: sampleStorage.storageid,
        sampleid: sampleStorage.sampleid,
        locationid: sampleStorage.locationid,
        storagedate: sampleStorage.storagedate,
        expirydate: sampleStorage.expirydate,
        retentiondays: sampleStorage.retentiondays,
        status: sampleStorage.status,
        retrieveddate: sampleStorage.retrieveddate,
        retrievalreason: sampleStorage.retrievalreason,
        disposeddate: sampleStorage.disposeddate,
        disposalmethod: sampleStorage.disposalmethod,
        storagenotes: sampleStorage.storagenotes,
        createdat: sampleStorage.createdat,
        // Sample info
        samplenumber: accessionSamples.samplenumber,
        sampletype: accessionSamples.sampletype,
        containertype: accessionSamples.containertype,
        barcode: accessionSamples.barcode,
        patientid: accessionSamples.patientid,
        collectiondate: accessionSamples.collectiondate,
        // Location info
        locationname: storageLocations.name,
        locationcode: storageLocations.code,
        locationtype: storageLocations.type,
        // User info
        storedbyname: users.name,
      })
      .from(sampleStorage)
      .leftJoin(accessionSamples, eq(sampleStorage.sampleid, accessionSamples.sampleid))
      .leftJoin(storageLocations, eq(sampleStorage.locationid, storageLocations.locationid))
      .leftJoin(users, eq(sampleStorage.storedby, users.userid))
      .where(and(...conditions))
      .orderBy(desc(sampleStorage.storagedate))
      .limit(limit);

    return NextResponse.json({
      success: true,
      samples: storedSamples,
      count: storedSamples.length,
    });
  } catch (error) {
    console.error("Error fetching stored samples:", error);
    return NextResponse.json(
      { error: "Failed to fetch stored samples" },
      { status: 500 }
    );
  }
}

// POST: Move sample to storage
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storageCreateSchema.parse(body);

    // Check if sample exists and is in a valid state for storage
    const sample = await db
      .select()
      .from(accessionSamples)
      .where(
        and(
          eq(accessionSamples.sampleid, validatedData.sampleid),
          eq(accessionSamples.workspaceid, validatedData.workspaceid)
        )
      )
      .limit(1);

    if (!sample || sample.length === 0) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Check if sample is already in storage
    const existingStorage = await db
      .select()
      .from(sampleStorage)
      .where(
        and(
          eq(sampleStorage.sampleid, validatedData.sampleid),
          eq(sampleStorage.status, "stored")
        )
      )
      .limit(1);

    if (existingStorage && existingStorage.length > 0) {
      return NextResponse.json(
        { error: "Sample is already in storage" },
        { status: 400 }
      );
    }

    // Verify storage location exists
    const location = await db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.locationid, validatedData.locationid))
      .limit(1);

    if (!location || location.length === 0) {
      return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
    }

    // Calculate expiry date based on retention days
    const storageDate = new Date();
    const expiryDate = new Date(storageDate);
    expiryDate.setDate(expiryDate.getDate() + validatedData.retentiondays);

    // Create storage record
    const [newStorage] = await db
      .insert(sampleStorage)
      .values({
        sampleid: validatedData.sampleid,
        locationid: validatedData.locationid,
        retentiondays: validatedData.retentiondays,
        storagedate: storageDate,
        expirydate: expiryDate,
        storagenotes: validatedData.storagenotes,
        status: "stored",
        storedby: user.userid,
        workspaceid: validatedData.workspaceid,
      })
      .returning();

    // Update sample status and location
    await db
      .update(accessionSamples)
      .set({
        currentstatus: "IN_STORAGE",
        currentlocation: location[0].code,
        updatedat: new Date(),
      })
      .where(eq(accessionSamples.sampleid, validatedData.sampleid));

    return NextResponse.json({
      success: true,
      storage: newStorage,
      message: "Sample moved to storage successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating storage record:", error);
    return NextResponse.json(
      { error: "Failed to move sample to storage" },
      { status: 500 }
    );
  }
}

// PATCH: Dispose or retrieve a stored sample
const storagePatchSchema = z.object({
  storageid: z.string().uuid(),
  action: z.enum(["dispose", "retrieve"]),
  disposalmethod: z.string().optional(),
  disposalnotes: z.string().optional(),
  retrievalreason: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storagePatchSchema.parse(body);

    // Check storage record exists and is currently stored
    const existing = await db
      .select()
      .from(sampleStorage)
      .where(eq(sampleStorage.storageid, validatedData.storageid))
      .limit(1);

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Storage record not found" }, { status: 404 });
    }

    if (existing[0].status !== "stored") {
      return NextResponse.json(
        { error: `Sample is already ${existing[0].status}, cannot ${validatedData.action}` },
        { status: 400 }
      );
    }

    const now = new Date();

    if (validatedData.action === "dispose") {
      await db
        .update(sampleStorage)
        .set({
          status: "disposed",
          disposeddate: now,
          disposedby: user.userid,
          disposalmethod: validatedData.disposalmethod || "standard",
          disposalnotes: validatedData.disposalnotes || null,
        })
        .where(eq(sampleStorage.storageid, validatedData.storageid));

      // Update sample status
      await db
        .update(accessionSamples)
        .set({
          currentstatus: "DISPOSED",
          updatedat: now,
        })
        .where(eq(accessionSamples.sampleid, existing[0].sampleid));

      return NextResponse.json({
        success: true,
        message: "Sample disposed successfully",
      });
    }

    if (validatedData.action === "retrieve") {
      await db
        .update(sampleStorage)
        .set({
          status: "retrieved",
          retrieveddate: now,
          retrievedby: user.userid,
          retrievalreason: validatedData.retrievalreason || null,
        })
        .where(eq(sampleStorage.storageid, validatedData.storageid));

      // Update sample status
      await db
        .update(accessionSamples)
        .set({
          currentstatus: "RETRIEVED",
          currentlocation: "Laboratory",
          updatedat: now,
        })
        .where(eq(accessionSamples.sampleid, existing[0].sampleid));

      return NextResponse.json({
        success: true,
        message: "Sample retrieved from storage",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating storage record:", error);
    return NextResponse.json(
      { error: "Failed to update storage record" },
      { status: 500 }
    );
  }
}

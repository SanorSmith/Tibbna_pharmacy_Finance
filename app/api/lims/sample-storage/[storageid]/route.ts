/**
 * Sample Storage Individual Record API Routes
 * 
 * Endpoints for managing individual storage records
 * - PATCH: Update storage record (retrieve or dispose)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sampleStorage, accessionSamples } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for updating storage record
const storageUpdateSchema = z.object({
  action: z.enum(["retrieve", "dispose"]),
  reason: z.string().optional(),
  disposalmethod: z.string().optional(),
  disposalnotes: z.string().optional(),
});

// PATCH: Update storage record (retrieve or dispose)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { storageid: string } }
) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storageUpdateSchema.parse(body);
    const { storageid } = params;

    // Fetch existing storage record
    const [existingStorage] = await db
      .select()
      .from(sampleStorage)
      .where(eq(sampleStorage.storageid, storageid))
      .limit(1);

    if (!existingStorage) {
      return NextResponse.json({ error: "Storage record not found" }, { status: 404 });
    }

    if (existingStorage.status !== "stored") {
      return NextResponse.json(
        { error: "Sample is not in stored status" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (validatedData.action === "retrieve") {
      // Retrieve sample from storage
      const [updatedStorage] = await db
        .update(sampleStorage)
        .set({
          status: "retrieved",
          retrieveddate: now,
          retrievedby: user.userid,
          retrievalreason: validatedData.reason,
          updatedat: now,
        })
        .where(eq(sampleStorage.storageid, storageid))
        .returning();

      // Update sample status
      await db
        .update(accessionSamples)
        .set({
          currentstatus: "RETRIEVED",
          updatedat: now,
        })
        .where(eq(accessionSamples.sampleid, existingStorage.sampleid));

      return NextResponse.json({
        success: true,
        storage: updatedStorage,
        message: "Sample retrieved from storage successfully",
      });
    } else if (validatedData.action === "dispose") {
      // Dispose sample
      const [updatedStorage] = await db
        .update(sampleStorage)
        .set({
          status: "disposed",
          disposeddate: now,
          disposedby: user.userid,
          disposalmethod: validatedData.disposalmethod,
          disposalnotes: validatedData.disposalnotes,
          updatedat: now,
        })
        .where(eq(sampleStorage.storageid, storageid))
        .returning();

      // Update sample status
      await db
        .update(accessionSamples)
        .set({
          currentstatus: "DISPOSED",
          updatedat: now,
        })
        .where(eq(accessionSamples.sampleid, existingStorage.sampleid));

      return NextResponse.json({
        success: true,
        storage: updatedStorage,
        message: "Sample disposed successfully",
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

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  accessionSamples,
  sampleStatusHistory,
  sampleAccessionAuditLog,
  ACCESSION_AUDIT_ACTIONS,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH - Update sample status and location
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;
    const body = await request.json();
    const { status, location, reason } = body;

    if (!status && !location) {
      return NextResponse.json(
        { error: "Status or location required" },
        { status: 400 }
      );
    }

    // Get current sample data
    const [currentSample] = await db
      .select()
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleid))
      .limit(1);

    if (!currentSample) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Update sample in transaction
    const result = await db.transaction(async (tx) => {
      // Update sample status and/or location
      const updateData: any = {
        updatedat: new Date(),
      };

      if (status) {
        updateData.currentstatus = status;
      }

      if (location) {
        updateData.currentlocation = location;
      }

      const [updatedSample] = await tx
        .update(accessionSamples)
        .set(updateData)
        .where(eq(accessionSamples.sampleid, sampleid))
        .returning();

      // Create status history entry
      await tx.insert(sampleStatusHistory).values({
        sampleid: sampleid,
        previousstatus: currentSample.currentstatus,
        newstatus: status || currentSample.currentstatus,
        previouslocation: currentSample.currentlocation,
        newlocation: location || currentSample.currentlocation,
        changedby: user.userid,
        changereason: reason || "Status/location update",
      });

      // Create audit log entry
      await tx.insert(sampleAccessionAuditLog).values({
        sampleid: sampleid,
        action: ACCESSION_AUDIT_ACTIONS.STATUS_CHANGED,
        userid: user.userid,
        userrole: "lab_technician",
        previousdata: JSON.stringify({
          status: currentSample.currentstatus,
          location: currentSample.currentlocation,
        }),
        newdata: JSON.stringify({
          status: status || currentSample.currentstatus,
          location: location || currentSample.currentlocation,
        }),
        reason: reason || "Status/location update",
        metadata: JSON.stringify({
          updatedBy: user.name,
          updatedAt: new Date().toISOString(),
        }),
      });

      return updatedSample;
    });

    return NextResponse.json({
      success: true,
      sample: result,
    });
  } catch (error) {
    console.error("Sample status update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update sample status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

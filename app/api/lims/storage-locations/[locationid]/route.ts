import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { storageLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PUT - Update storage location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationid } = await params;
    const body = await request.json();
    const {
      name,
      description,
      type,
      category,
      building,
      room,
      equipment,
      section,
      position,
      capacity,
      temperaturemin,
      temperaturemax,
      humiditymin,
      humiditymax,
      restrictedaccess,
      accessrequirements,
      status,
      isavailable,
      parentlocationid,
    } = body;

    // Validation
    if (!name || !type || !category) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Check if location exists
    const existingLocation = await db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.locationid, locationid))
      .limit(1);

    if (existingLocation.length === 0) {
      return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || null,
      type,
      category,
      building: building?.trim() || null,
      room: room?.trim() || null,
      equipment: equipment?.trim() || null,
      section: section?.trim() || null,
      position: position?.trim() || null,
      capacity: capacity || null,
      temperaturemin: temperaturemin || null,
      temperaturemax: temperaturemax || null,
      humiditymin: humiditymin || null,
      humiditymax: humiditymax || null,
      restrictedaccess: restrictedaccess || false,
      accessrequirements: accessrequirements?.trim() || null,
      status: status || "active",
      isavailable: isavailable !== undefined ? isavailable : true,
      parentlocationid: parentlocationid || null,
      updatedby: user.userid,
      updatedat: new Date().toISOString(),
    };

    const [updatedLocation] = await db
      .update(storageLocations)
      .set(updateData)
      .where(eq(storageLocations.locationid, locationid))
      .returning();

    return NextResponse.json({
      success: true,
      location: updatedLocation,
    });
  } catch (error) {
    console.error("Storage location update error:", error);
    return NextResponse.json(
      { error: "Failed to update storage location", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove storage location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationid } = await params;

    // Check if location exists
    const existingLocation = await db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.locationid, locationid))
      .limit(1);

    if (existingLocation.length === 0) {
      return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
    }

    // Check if location has samples stored
    // This would require checking accession_samples table for currentlocation matches
    // For now, we'll allow deletion but in production you might want to prevent it

    await db
      .delete(storageLocations)
      .where(eq(storageLocations.locationid, locationid));

    return NextResponse.json({
      success: true,
      message: "Storage location deleted successfully",
    });
  } catch (error) {
    console.error("Storage location deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete storage location", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

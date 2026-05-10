import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { storageLocations } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET - Fetch storage locations
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    if (!workspaceid) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(storageLocations.workspaceid, workspaceid)];
    
    if (type && type !== "all") {
      conditions.push(eq(storageLocations.type, type));
    }
    
    if (status && status !== "all") {
      conditions.push(eq(storageLocations.status, status));
    }

    const locations = await db
      .select()
      .from(storageLocations)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(storageLocations.sortorder, storageLocations.name);

    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Storage locations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch storage locations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Create new storage location
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
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
      parentlocationid,
      workspaceid,
    } = body;

    // Validation
    if (!name || !code || !type || !category || !workspaceid) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Check if code already exists
    const existingLocation = await db
      .select()
      .from(storageLocations)
      .where(eq(storageLocations.code, code))
      .limit(1);

    if (existingLocation.length > 0) {
      return NextResponse.json({ error: "Location code already exists" }, { status: 409 });
    }

    const newLocation = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      type,
      category,
      building: building?.trim() || null,
      room: room?.trim() || null,
      equipment: equipment?.trim() || null,
      section: section?.trim() || null,
      position: position?.trim() || null,
      capacity: capacity || null,
      currentcount: 0,
      availableslots: capacity || null,
      temperaturemin: temperaturemin || null,
      temperaturemax: temperaturemax || null,
      humiditymin: humiditymin || null,
      humiditymax: humiditymax || null,
      restrictedaccess: restrictedaccess || false,
      accessrequirements: accessrequirements?.trim() || null,
      status: "active",
      isavailable: true,
      sortorder: 0,
      parentlocationid: parentlocationid || null,
      createdby: user.userid,
      createdat: new Date().toISOString(),
      updatedby: user.userid,
      updatedat: new Date().toISOString(),
      workspaceid,
    };

    const [createdLocation] = await db
      .insert(storageLocations)
      .values(newLocation)
      .returning();

    return NextResponse.json({
      success: true,
      location: createdLocation,
    });
  } catch (error) {
    console.error("Storage location creation error:", error);
    return NextResponse.json(
      { error: "Failed to create storage location", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

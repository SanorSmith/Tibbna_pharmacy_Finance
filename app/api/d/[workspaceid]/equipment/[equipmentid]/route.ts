/**
 * Individual Equipment API Route
 * 
 * Provides CRUD operations for individual equipment items
 * Supports equipment reading, updating, and deletion by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for equipment updates
const equipmentUpdateSchema = z.object({
  model: z.string().min(1, "Model is required").optional(),
  equipmentidcode: z.string().min(1, "Equipment ID is required").optional(),
  serialnumber: z.string().min(1, "Serial number is required").optional(),
  vendor: z.string().min(1, "Vendor is required").optional(),
  vendoremail: z.string().email().optional().or(z.literal("")),
  vendorphone: z.string().optional(),
  lastservicedate: z.string().datetime().optional().or(z.literal("")),
  nextservicedate: z.string().datetime().optional().or(z.literal("")),
  serviceinterval: z.number().int().positive().optional(),
  warrantyexpiry: z.string().datetime().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required").optional(),
  type: z.string().min(1, "Type is required").optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  calibrationdate: z.string().datetime().optional().or(z.literal("")),
  nextcalibrationdate: z.string().datetime().optional().or(z.literal("")),
  calibrationinterval: z.number().int().positive().optional(),
  purchaseprice: z.number().positive().optional(),
  currentvalue: z.number().positive().optional(),
  notes: z.string().optional(),
  manualurl: z.string().url().optional().or(z.literal("")),
  specifications: z.string().optional(),
});

// GET /api/d/[workspaceid]/equipment/[equipmentid] - Get specific equipment
export async function GET(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; equipmentid: string }> 
  }
) {
  try {
    const { workspaceid, equipmentid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const equipmentItem = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentid, equipmentid)
        )
      )
      .limit(1);

    if (equipmentItem.length === 0) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json({ equipment: equipmentItem[0] });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

// PUT /api/d/[workspaceid]/equipment/[equipmentid] - Update equipment
export async function PUT(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; equipmentid: string }> 
  }
) {
  try {
    const { workspaceid, equipmentid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = equipmentUpdateSchema.parse(body);

    const toDateOrUndefined = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return new Date(trimmed);
    };

    // Check if equipment exists
    const existingEquipment = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentid, equipmentid)
        )
      )
      .limit(1);

    if (existingEquipment.length === 0) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Check for duplicate equipment ID or serial number if being updated
    if (validatedData.equipmentidcode) {
      const duplicateId = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.workspaceid, workspaceid),
            eq(equipment.equipmentidcode, validatedData.equipmentidcode),
            ne(equipment.equipmentid, equipmentid) // Exclude current record
          )
        )
        .limit(1);

      if (duplicateId.length > 0) {
        return NextResponse.json(
          { error: "Equipment ID already exists" },
          { status: 400 }
        );
      }
    }

    if (validatedData.serialnumber) {
      const duplicateSerial = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.workspaceid, workspaceid),
            eq(equipment.serialnumber, validatedData.serialnumber),
            ne(equipment.equipmentid, equipmentid) // Exclude current record
          )
        )
        .limit(1);

      if (duplicateSerial.length > 0) {
        return NextResponse.json(
          { error: "Serial number already exists" },
          { status: 400 }
        );
      }
    }

    const updatedEquipment = await db
      .update(equipment)
      .set({
        ...validatedData,
        vendoremail:
          validatedData.vendoremail && validatedData.vendoremail.trim()
            ? validatedData.vendoremail
            : undefined,
        manualurl:
          validatedData.manualurl && validatedData.manualurl.trim()
            ? validatedData.manualurl
            : undefined,
        lastservicedate: toDateOrUndefined(validatedData.lastservicedate || undefined),
        nextservicedate: toDateOrUndefined(validatedData.nextservicedate || undefined),
        warrantyexpiry: toDateOrUndefined(validatedData.warrantyexpiry || undefined),
        calibrationdate: toDateOrUndefined(validatedData.calibrationdate || undefined),
        nextcalibrationdate: toDateOrUndefined(validatedData.nextcalibrationdate || undefined),
        purchaseprice:
          validatedData.purchaseprice !== undefined && validatedData.purchaseprice !== null
            ? validatedData.purchaseprice.toString()
            : undefined,
        currentvalue:
          validatedData.currentvalue !== undefined && validatedData.currentvalue !== null
            ? validatedData.currentvalue.toString()
            : undefined,
        updatedby: user.userid,
        updatedat: new Date().toISOString(),
      })
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentid, equipmentid)
        )
      )
      .returning();

    return NextResponse.json({ equipment: updatedEquipment[0] });
  } catch (error) {
    console.error("Error updating equipment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

// DELETE /api/d/[workspaceid]/equipment/[equipmentid] - Delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; equipmentid: string }> 
  }
) {
  try {
    const { workspaceid, equipmentid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if equipment exists
    const existingEquipment = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentid, equipmentid)
        )
      )
      .limit(1);

    if (existingEquipment.length === 0) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    await db
      .delete(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentid, equipmentid)
        )
      );

    return NextResponse.json({ message: "Equipment deleted successfully" });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}

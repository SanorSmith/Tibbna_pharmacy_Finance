/**
 * Equipment API Route
 * 
 * Provides CRUD operations for laboratory equipment management
 * Supports equipment creation, reading, updating, and deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for equipment
const equipmentSchema = z.object({
  model: z.string().min(1, "Model is required"),
  equipmentidcode: z.string().min(1, "Equipment ID is required"),
  serialnumber: z.string().min(1, "Serial number is required"),
  vendor: z.string().min(1, "Vendor is required"),
  vendoremail: z.string().email().optional().or(z.literal("")),
  vendorphone: z.string().optional(),
  lastservicedate: z.string().datetime().optional().or(z.literal("")),
  nextservicedate: z.string().datetime().optional().or(z.literal("")),
  serviceinterval: z.number().int().positive().optional(),
  warrantyexpiry: z.string().datetime().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  status: z.string().default("active"),
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

// GET /api/d/[workspaceid]/equipment - Get all equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const whereConditions = [eq(equipment.workspaceid, workspaceid)];

    if (search) {
      whereConditions.push(ilike(equipment.model, `%${search}%`));
    }

    if (category) {
      whereConditions.push(eq(equipment.category, category));
    }

    if (status) {
      whereConditions.push(eq(equipment.status, status));
    }

    const equipmentList = await db
      .select()
      .from(equipment)
      .where(and(...whereConditions))
      .orderBy(desc(equipment.createdat));

    return NextResponse.json({ equipment: equipmentList });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/equipment - Create new equipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = equipmentSchema.parse(body);

    const toDateOrUndefined = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return new Date(trimmed);
    };

    // Check if equipment ID or serial number already exists
    const existingEquipment = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.equipmentidcode, validatedData.equipmentidcode)
        )
      )
      .limit(1);

    if (existingEquipment.length > 0) {
      return NextResponse.json(
        { error: "Equipment ID already exists" },
        { status: 400 }
      );
    }

    const existingSerial = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.workspaceid, workspaceid),
          eq(equipment.serialnumber, validatedData.serialnumber)
        )
      )
      .limit(1);

    if (existingSerial.length > 0) {
      return NextResponse.json(
        { error: "Serial number already exists" },
        { status: 400 }
      );
    }

    const newEquipment = await db
      .insert(equipment)
      .values({
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
        createdby: user.userid,
        createdat: new Date().toISOString(),
        workspaceid,
      })
      .returning();

    return NextResponse.json({ equipment: newEquipment[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating equipment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
}

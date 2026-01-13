/**
 * Materials API Route
 * 
 * Provides CRUD operations for laboratory materials management
 * Supports materials creation, reading, updating, and deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { materials } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for materials
const materialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  lotnumber: z.string().min(1, "Lot number is required"),
  batchnumber: z.string().optional(),
  manufacturedate: z.string().datetime().optional().or(z.literal("")),
  expirydate: z.string().datetime().optional().or(z.literal("")),
  supplierid: z.string().uuid().optional(),
  suppliername: z.string().min(1, "Supplier name is required"),
  suppliernumber: z.string().optional(),
  size: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.number().positive("Quantity must be positive"),
  minquantity: z.number().positive().optional(),
  maxquantity: z.number().positive().optional(),
  storage: z.string().min(1, "Storage requirements are required"),
  storagelocation: z.string().optional(),
  storageconditions: z.string().optional(),
  price: z.number().positive().optional(),
  totalcost: z.number().positive().optional(),
  currency: z.string().default("USD"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  hazardlevel: z.string().optional(),
  casnumber: z.string().optional(),
  qualitygrade: z.string().optional(),
  certificatenumber: z.string().optional(),
  testrequired: z.boolean().default(false),
  status: z.string().default("active"),
  isavailable: z.boolean().default(true),
  notes: z.string().optional(),
  msdsurl: z.string().url().optional().or(z.literal("")),
  specifications: z.string().optional(),
});

// GET /api/d/[workspaceid]/materials - Get all materials
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
    const supplier = searchParams.get("supplier");
    const status = searchParams.get("status");

    const whereConditions = [eq(materials.workspaceid, workspaceid)];

    if (search) {
      whereConditions.push(ilike(materials.name, `%${search}%`));
    }

    if (category) {
      whereConditions.push(eq(materials.category, category));
    }

    if (supplier) {
      whereConditions.push(eq(materials.suppliername, supplier));
    }

    if (status) {
      whereConditions.push(eq(materials.status, status));
    }

    const query = db
      .select({
        materialid: materials.materialid,
        name: materials.name,
        code: materials.code,
        description: materials.description,
        lotnumber: materials.lotnumber,
        batchnumber: materials.batchnumber,
        manufacturedate: materials.manufacturedate,
        expirydate: materials.expirydate,
        supplierid: materials.supplierid,
        suppliername: materials.suppliername,
        suppliernumber: materials.suppliernumber,
        size: materials.size,
        unit: materials.unit,
        quantity: materials.quantity,
        minquantity: materials.minquantity,
        maxquantity: materials.maxquantity,
        storage: materials.storage,
        storagelocation: materials.storagelocation,
        storageconditions: materials.storageconditions,
        price: materials.price,
        totalcost: materials.totalcost,
        currency: materials.currency,
        category: materials.category,
        type: materials.type,
        hazardlevel: materials.hazardlevel,
        casnumber: materials.casnumber,
        qualitygrade: materials.qualitygrade,
        certificatenumber: materials.certificatenumber,
        testrequired: materials.testrequired,
        status: materials.status,
        isavailable: materials.isavailable,
        notes: materials.notes,
        msdsurl: materials.msdsurl,
        specifications: materials.specifications,
        createdat: materials.createdat,
        updatedat: materials.updatedat,
      })
      .from(materials)
      .where(and(...whereConditions));

    const materialsList = await query.orderBy(desc(materials.createdat));

    return NextResponse.json({ materials: materialsList });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/materials - Create new material
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
    const validatedData = materialSchema.parse(body);

    // Check if material code already exists
    const existingMaterial = await db
      .select()
      .from(materials)
      .where(
        and(
          eq(materials.workspaceid, workspaceid),
          eq(materials.code, validatedData.code)
        )
      )
      .limit(1);

    if (existingMaterial.length > 0) {
      return NextResponse.json(
        { error: "Material code already exists" },
        { status: 400 }
      );
    }

    // Calculate total cost if price and quantity provided
    let totalCost = validatedData.totalcost;
    if (validatedData.price && validatedData.quantity) {
      totalCost = validatedData.price * validatedData.quantity;
    }

    const toDateOrUndefined = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return new Date(trimmed);
    };

    const newMaterial = await db
      .insert(materials)
      .values({
        ...validatedData,
        manufacturedate: toDateOrUndefined(validatedData.manufacturedate || undefined),
        expirydate: toDateOrUndefined(validatedData.expirydate || undefined),
        msdsurl: validatedData.msdsurl && validatedData.msdsurl.trim() ? validatedData.msdsurl : undefined,
        quantity: validatedData.quantity.toString(),
        minquantity:
          validatedData.minquantity !== undefined && validatedData.minquantity !== null
            ? validatedData.minquantity.toString()
            : undefined,
        maxquantity:
          validatedData.maxquantity !== undefined && validatedData.maxquantity !== null
            ? validatedData.maxquantity.toString()
            : undefined,
        price:
          validatedData.price !== undefined && validatedData.price !== null
            ? validatedData.price.toString()
            : undefined,
        totalcost:
          totalCost !== undefined && totalCost !== null ? totalCost.toString() : undefined,
        createdby: user.userid,
        createdat: new Date().toISOString(),
        workspaceid,
      })
      .returning();

    return NextResponse.json({ material: newMaterial[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}

/**
 * Suppliers API Route
 * 
 * Provides CRUD operations for laboratory suppliers management
 * Supports suppliers creation, reading, updating, and deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for suppliers
const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  phonenumber: z.string().optional(),
  phonenumber2: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  email2: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  addressline1: z.string().optional(),
  addressline2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalcode: z.string().optional(),
  country: z.string().optional(),
  taxid: z.string().optional(),
  licensenumber: z.string().optional(),
  establishedyear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  contactperson: z.string().optional(),
  contacttitle: z.string().optional(),
  contactphone: z.string().optional(),
  contactemail: z.string().email().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  specialization: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  ispreferred: z.boolean().default(false),
  isactive: z.boolean().default(true),
  paymentterms: z.string().optional(),
  creditlimit: z.number().positive().optional(),
  currency: z.string().default("USD"),
  supportphone: z.string().optional(),
  supportemail: z.string().email().optional().or(z.literal("")),
  technicalcontact: z.string().optional(),
  notes: z.string().optional(),
  contracturl: z.string().url().optional().or(z.literal("")),
  catalogurl: z.string().url().optional().or(z.literal("")),
});

// GET /api/d/[workspaceid]/suppliers - Get all suppliers
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
    const type = searchParams.get("type");
    const isactive = searchParams.get("isactive");

    const whereConditions = [eq(suppliers.workspaceid, workspaceid)];

    if (search) {
      whereConditions.push(ilike(suppliers.name, `%${search}%`));
    }

    if (category) {
      whereConditions.push(eq(suppliers.category, category));
    }

    if (type) {
      whereConditions.push(eq(suppliers.type, type));
    }

    if (isactive !== null && isactive !== undefined) {
      whereConditions.push(eq(suppliers.isactive, isactive === "true"));
    }

    const suppliersList = await db
      .select()
      .from(suppliers)
      .where(and(...whereConditions))
      .orderBy(desc(suppliers.ispreferred), desc(suppliers.name));

    return NextResponse.json({ suppliers: suppliersList });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/suppliers - Create new supplier
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
    const validatedData = supplierSchema.parse(body);

    // Check if supplier code already exists
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.workspaceid, workspaceid),
          eq(suppliers.code, validatedData.code)
        )
      )
      .limit(1);

    if (existingSupplier.length > 0) {
      return NextResponse.json(
        { error: "Supplier code already exists" },
        { status: 400 }
      );
    }

    const newSupplier = await db
      .insert(suppliers)
      .values({
        ...validatedData,
        rating:
          validatedData.rating !== undefined && validatedData.rating !== null
            ? validatedData.rating.toString()
            : undefined,
        creditlimit:
          validatedData.creditlimit !== undefined && validatedData.creditlimit !== null
            ? validatedData.creditlimit.toString()
            : undefined,
        createdby: user.userid,
        createdat: new Date().toISOString(),
        workspaceid,
      })
      .returning();

    return NextResponse.json({ supplier: newSupplier[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}

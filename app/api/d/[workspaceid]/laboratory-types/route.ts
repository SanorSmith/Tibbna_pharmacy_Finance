/**
 * Laboratory Types API Route
 * 
 * Provides CRUD operations for laboratory types management
 * Supports laboratory types creation, reading, updating, and deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { laboratoryTypes } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for laboratory types
const laboratoryTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  specialization: z.string().optional(),
  parenttypeid: z.string().uuid().optional(),
  sortorder: z.number().int().min(0).default(0),
  isactive: z.boolean().default(true),
});

// GET /api/d/[workspaceid]/laboratory-types - Get all laboratory types
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
    const isactive = searchParams.get("isactive");

    const whereConditions = [eq(laboratoryTypes.workspaceid, workspaceid)];

    if (search) {
      whereConditions.push(ilike(laboratoryTypes.name, `%${search}%`));
    }

    if (category) {
      whereConditions.push(eq(laboratoryTypes.category, category));
    }

    if (isactive !== null && isactive !== undefined) {
      whereConditions.push(eq(laboratoryTypes.isactive, isactive === "true"));
    }

    const laboratoryTypesList = await db
      .select()
      .from(laboratoryTypes)
      .where(and(...whereConditions))
      .orderBy(desc(laboratoryTypes.sortorder), desc(laboratoryTypes.name));

    return NextResponse.json({ laboratoryTypes: laboratoryTypesList });
  } catch (error) {
    console.error("Error fetching laboratory types:", error);
    return NextResponse.json(
      { error: "Failed to fetch laboratory types" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/laboratory-types - Create new laboratory type
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
    const validatedData = laboratoryTypeSchema.parse(body);

    // Check if laboratory type code already exists
    const existingType = await db
      .select()
      .from(laboratoryTypes)
      .where(
        and(
          eq(laboratoryTypes.workspaceid, workspaceid),
          eq(laboratoryTypes.code, validatedData.code)
        )
      )
      .limit(1);

    if (existingType.length > 0) {
      return NextResponse.json(
        { error: "Laboratory type code already exists" },
        { status: 400 }
      );
    }

    const newLaboratoryType = await db.insert(laboratoryTypes).values({
      ...validatedData,
      createdby: user.userid,
      createdat: new Date().toISOString(),
      workspaceid,
    }).returning();

    return NextResponse.json({ laboratoryType: newLaboratoryType[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating laboratory type:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create laboratory type" },
      { status: 500 }
    );
  }
}

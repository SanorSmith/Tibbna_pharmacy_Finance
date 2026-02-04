import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema
const testReferenceRangeSchema = z.object({
  testcode: z.string().min(1),
  testname: z.string().min(1),
  unit: z.string().min(1),
  agegroup: z.enum(["NEO", "PED", "ADULT", "ALL"]).default("ALL"),
  sex: z.enum(["M", "F", "ANY"]).default("ANY"),
  referencemin: z.number().optional(),
  referencemax: z.number().optional(),
  referencetext: z.string().optional(),
  paniclow: z.number().optional(),
  panichigh: z.number().optional(),
  panictext: z.string().optional(),
  labtype: z.string().optional(),
  grouptests: z.string().optional(),
  sampletype: z.string().optional(),
  containertype: z.string().optional(),
  bodysite: z.string().optional(),
  clinicalindication: z.string().optional(),
  additionalinformation: z.string().optional(),
  notes: z.string().optional(),
  isactive: z.enum(["Y", "N"]).default("Y"),
});

// GET - Fetch all reference ranges for a workspace
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
    const testcode = searchParams.get("testcode");
    const category = searchParams.get("category");
    const agegroup = searchParams.get("agegroup");
    const sex = searchParams.get("sex");
    const isactive = searchParams.get("isactive") || "Y";

    const whereConditions: any[] = [
      eq(testReferenceRanges.workspaceid, workspaceid),
      eq(testReferenceRanges.isactive, isactive),
    ];

    if (testcode) {
      whereConditions.push(eq(testReferenceRanges.testcode, testcode));
    }
    if (category) {
      whereConditions.push(eq(testReferenceRanges.category, category));
    }
    if (agegroup) {
      whereConditions.push(eq(testReferenceRanges.agegroup, agegroup));
    }
    if (sex) {
      whereConditions.push(eq(testReferenceRanges.sex, sex));
    }

    const ranges = await db
      .select()
      .from(testReferenceRanges)
      .where(and(...whereConditions))
      .orderBy(
        testReferenceRanges.testcode,
        testReferenceRanges.agegroup,
        testReferenceRanges.sex
      );

    return NextResponse.json({ ranges });
  } catch (error) {
    console.error("Error fetching test reference ranges:", error);
    return NextResponse.json(
      { error: "Failed to fetch test reference ranges" },
      { status: 500 }
    );
  }
}

// POST - Create new reference range
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
    const validatedData = testReferenceRangeSchema.parse(body);

    const newRange = await db
      .insert(testReferenceRanges)
      .values({
        workspaceid,
        testcode: validatedData.testcode,
        testname: validatedData.testname,
        unit: validatedData.unit,
        agegroup: validatedData.agegroup,
        sex: validatedData.sex,
        referencemin: validatedData.referencemin?.toString(),
        referencemax: validatedData.referencemax?.toString(),
        referencetext: validatedData.referencetext,
        paniclow: validatedData.paniclow?.toString(),
        panichigh: validatedData.panichigh?.toString(),
        panictext: validatedData.panictext,
        labtype: validatedData.labtype,
        grouptests: validatedData.grouptests,
        sampletype: validatedData.sampletype,
        containertype: validatedData.containertype,
        bodysite: validatedData.bodysite,
        clinicalindication: validatedData.clinicalindication,
        additionalinformation: validatedData.additionalinformation,
        notes: validatedData.notes,
        isactive: validatedData.isactive,
        createdby: user.userid,
      })
      .returning();

    return NextResponse.json({ range: newRange[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating test reference range:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create test reference range" },
      { status: 500 }
    );
  }
}

// PUT - Update reference range
export async function PUT(
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
    const { rangeid, ...updateData } = body;

    if (!rangeid) {
      return NextResponse.json(
        { error: "rangeid is required" },
        { status: 400 }
      );
    }

    const validatedData = testReferenceRangeSchema.partial().parse(updateData);

    const updated = await db
      .update(testReferenceRanges)
      .set({
        ...validatedData,
        referencemin: validatedData.referencemin?.toString(),
        referencemax: validatedData.referencemax?.toString(),
        paniclow: validatedData.paniclow?.toString(),
        panichigh: validatedData.panichigh?.toString(),
        updatedby: user.userid,
        updatedat: new Date(),
      })
      .where(
        and(
          eq(testReferenceRanges.rangeid, rangeid),
          eq(testReferenceRanges.workspaceid, workspaceid)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Reference range not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ range: updated[0] });
  } catch (error) {
    console.error("Error updating test reference range:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update test reference range" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete reference range
export async function DELETE(
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
    const rangeid = searchParams.get("rangeid");

    if (!rangeid) {
      return NextResponse.json(
        { error: "rangeid is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .update(testReferenceRanges)
      .set({
        isactive: "N",
        updatedby: user.userid,
        updatedat: new Date(),
      })
      .where(
        and(
          eq(testReferenceRanges.rangeid, rangeid),
          eq(testReferenceRanges.workspaceid, workspaceid)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Reference range not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test reference range:", error);
    return NextResponse.json(
      { error: "Failed to delete test reference range" },
      { status: 500 }
    );
  }
}

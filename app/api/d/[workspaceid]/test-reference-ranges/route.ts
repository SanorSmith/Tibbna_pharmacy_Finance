import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { testReferenceRanges, testReferenceAuditLog, users } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Fields to track for audit diffs
const AUDITABLE_FIELDS = [
  "testcode", "testname", "unit", "agegroup", "sex",
  "referencemin", "referencemax", "referencetext",
  "paniclow", "panichigh", "panictext",
  "labtype", "grouptests", "sampletype", "containertype", "bodysite",
  "clinicalindication", "additionalinformation", "notes", "isactive",
] as const;

function computeChanges(oldRecord: any, newData: any): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  for (const field of AUDITABLE_FIELDS) {
    const oldVal = oldRecord[field] ?? "";
    const newVal = newData[field] ?? "";
    if (String(oldVal) !== String(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  return changes;
}

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

    const rawRanges = await db
      .select()
      .from(testReferenceRanges)
      .where(and(...whereConditions))
      .orderBy(
        testReferenceRanges.testcode,
        testReferenceRanges.agegroup,
        testReferenceRanges.sex
      );

    // Collect unique user IDs for name lookup
    const userIds = [...new Set([
      ...rawRanges.map(r => r.createdby).filter(Boolean),
      ...rawRanges.map(r => r.updatedby).filter(Boolean),
    ])] as string[];

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const userRows = await db
        .select({ userid: users.userid, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.userid, userIds));
      for (const u of userRows) {
        userMap[u.userid] = u.name || u.email || "Unknown";
      }
    }

    const ranges = rawRanges.map(r => ({
      ...r,
      createdbyname: r.createdby ? userMap[r.createdby] || undefined : undefined,
      updatedbyname: r.updatedby ? userMap[r.updatedby] || undefined : undefined,
    }));

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

    // Audit log: CREATE
    await db.insert(testReferenceAuditLog).values({
      rangeid: newRange[0].rangeid,
      workspaceid,
      action: "CREATE",
      userid: user.userid,
      username: user.name || user.email || "Unknown",
      reason: "Initial creation",
      snapshot: newRange[0] as any,
    });

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
    const { rangeid, updateReason, ...updateData } = body;

    if (!rangeid) {
      return NextResponse.json(
        { error: "rangeid is required" },
        { status: 400 }
      );
    }

    // Fetch the old record for diff comparison
    const [oldRecord] = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.rangeid, rangeid),
          eq(testReferenceRanges.workspaceid, workspaceid)
        )
      )
      .limit(1);

    if (!oldRecord) {
      return NextResponse.json(
        { error: "Reference range not found" },
        { status: 404 }
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

    // Audit log: UPDATE with field-level diffs
    const changes = computeChanges(oldRecord, updated[0]);
    if (Object.keys(changes).length > 0) {
      await db.insert(testReferenceAuditLog).values({
        rangeid,
        workspaceid,
        action: "UPDATE",
        userid: user.userid,
        username: user.name || user.email || "Unknown",
        reason: updateReason || "No reason provided",
        changes: changes as any,
        snapshot: updated[0] as any,
      });
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

    // Audit log: DELETE (soft)
    const reason = searchParams.get("reason") || "Deleted by user";
    await db.insert(testReferenceAuditLog).values({
      rangeid,
      workspaceid,
      action: "DELETE",
      userid: user.userid,
      username: user.name || user.email || "Unknown",
      reason,
      snapshot: deleted[0] as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test reference range:", error);
    return NextResponse.json(
      { error: "Failed to delete test reference range" },
      { status: 500 }
    );
  }
}

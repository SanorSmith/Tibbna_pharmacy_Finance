import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getUser } from "@/lib/user";
import { qcRuns } from "@/lib/db/schema";

const qcRunCreateSchema = z.object({
  workspaceid: z.string().min(1),
  qctype: z.enum(["QC", "CALIBRATION"]),
  equipmentid: z.string().uuid().optional().nullable(),
  equipmentname: z.string().optional().nullable(),
  qclevel: z.string().optional().nullable(),
  lotnumber: z.string().optional().nullable(),
  analyte: z.string().optional().nullable(),
  resultvalue: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  expectedmin: z.number().optional().nullable(),
  expectedmax: z.number().optional().nullable(),
  pass: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  runat: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const qctype = searchParams.get("qctype");
    const equipmentid = searchParams.get("equipmentid");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }

    const conditions: any[] = [eq(qcRuns.workspaceid, workspaceid)];
    if (qctype) conditions.push(eq(qcRuns.qctype, qctype));
    if (equipmentid) conditions.push(eq(qcRuns.equipmentid, equipmentid));

    const rows = await db
      .select()
      .from(qcRuns)
      .where(and(...conditions))
      .orderBy(desc(qcRuns.runat))
      .limit(limit);

    return NextResponse.json({ runs: rows });
  } catch (error) {
    console.error("Error fetching QC runs:", error);
    return NextResponse.json({ error: "Failed to fetch QC runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = qcRunCreateSchema.parse(body);

    const [created] = await db
      .insert(qcRuns)
      .values({
        workspaceid: data.workspaceid,
        qctype: data.qctype,
        equipmentid: data.equipmentid || null,
        equipmentname: data.equipmentname || null,
        qclevel: data.qclevel || null,
        lotnumber: data.lotnumber || null,
        analyte: data.analyte || null,
        resultvalue:
          data.resultvalue !== undefined && data.resultvalue !== null
            ? data.resultvalue.toString()
            : null,
        unit: data.unit || null,
        expectedmin:
          data.expectedmin !== undefined && data.expectedmin !== null
            ? data.expectedmin.toString()
            : null,
        expectedmax:
          data.expectedmax !== undefined && data.expectedmax !== null
            ? data.expectedmax.toString()
            : null,
        pass: data.pass ?? true,
        notes: data.notes || null,
        runat: data.runat ? new Date(data.runat) : new Date(),
        performedby: user.userid,
        performedbyname: user.name || null,
      })
      .returning();

    return NextResponse.json({ success: true, run: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating QC run:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create QC run" }, { status: 500 });
  }
}

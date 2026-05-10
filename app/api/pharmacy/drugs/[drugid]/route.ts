/**
 * Single Drug API — GET, PATCH, DELETE (global catalog)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; drugid: string }> }
) {
  try {
    const { drugid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [drug] = await db
      .select()
      .from(drugs)
      .where(eq(drugs.drugid, drugid))
      .limit(1);

    if (!drug) return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    return NextResponse.json({ drug });
  } catch (error) {
    console.error("[Drug GET]", error);
    return NextResponse.json({ error: "Failed to fetch drug" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; drugid: string }> }
) {
  try {
    const { drugid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const [updated] = await db
      .update(drugs)
      .set({
        name: body.name,
        genericname: body.genericname ?? undefined,
        atccode: body.atccode ?? undefined,
        form: body.form,
        strength: body.strength,
        unit: body.unit ?? undefined,
        barcode: body.barcode ?? undefined,
        manufacturer: body.manufacturer ?? undefined,
        nationalcode: body.nationalcode ?? undefined,
        category: body.category ?? undefined,
        description: body.description ?? undefined,
        interaction: body.interaction ?? undefined,
        warning: body.warning ?? undefined,
        pregnancy: body.pregnancy ?? undefined,
        sideeffect: body.sideeffect ?? undefined,
        storagetype: body.storagetype ?? undefined,
        indication: body.indication ?? undefined,
        traffic: body.traffic ?? undefined,
        notes: body.notes ?? undefined,
        insuranceapproved: body.insuranceapproved ?? undefined,
        requiresprescription: body.requiresprescription ?? undefined,
        metadata: body.metadata ?? undefined,
        updatedat: new Date(),
      })
      .where(eq(drugs.drugid, drugid))
      .returning();

    if (!updated) return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    return NextResponse.json({ drug: updated });
  } catch (error) {
    console.error("[Drug PATCH]", error);
    return NextResponse.json({ error: "Failed to update drug" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; drugid: string }> }
) {
  try {
    const { drugid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [deleted] = await db
      .delete(drugs)
      .where(eq(drugs.drugid, drugid))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    return NextResponse.json({ message: "Drug deleted" });
  } catch (error) {
    console.error("[Drug DELETE]", error);
    return NextResponse.json({ error: "Failed to delete drug" }, { status: 500 });
  }
}

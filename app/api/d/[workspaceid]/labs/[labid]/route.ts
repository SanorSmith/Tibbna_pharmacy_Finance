/**
 * API: /api/d/[workspaceid]/labs/[labid]
 * - PATCH: update lab information
 * - DELETE: delete lab
 * - Role: authenticated users
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; labid: string }> },
) {
  const { workspaceid, labid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const payload: Record<string, unknown> = {};
  
  if (body.name) payload.name = String(body.name);
  if ("phone" in body) payload.phone = body.phone || null;
  if ("email" in body) payload.email = body.email || null;
  if ("address" in body) payload.address = body.address || null;
  
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  try {
    const res = await db
      .update(labs)
      .set(payload)
      .where(and(eq(labs.workspaceid, workspaceid), eq(labs.labid, labid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }
    
    return NextResponse.json({ lab: res[0] });
  } catch (e) {
    console.error("[labs][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update lab" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; labid: string }> },
) {
  const { workspaceid, labid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await db
      .delete(labs)
      .where(and(eq(labs.workspaceid, workspaceid), eq(labs.labid, labid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (e) {
    console.error("[labs][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete lab" }, { status: 500 });
  }
}

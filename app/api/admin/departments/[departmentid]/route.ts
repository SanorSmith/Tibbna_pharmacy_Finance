/**
 * API: /api/d/[workspaceid]/departments/[departmentid]
 * - PATCH: update department information
 * - DELETE: delete department
 * - Role: authenticated users
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; departmentid: string }> },
) {
  const { workspaceid, departmentid } = await params;
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
      .update(departments)
      .set(payload)
      .where(and(eq(departments.workspaceid, workspaceid), eq(departments.departmentid, departmentid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    
    return NextResponse.json({ department: res[0] });
  } catch (e) {
    console.error("[departments][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; departmentid: string }> },
) {
  const { workspaceid, departmentid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await db
      .delete(departments)
      .where(and(eq(departments.workspaceid, workspaceid), eq(departments.departmentid, departmentid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (e) {
    console.error("[departments][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

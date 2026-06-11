import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReminders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

// PATCH — update/complete a reminder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; reminderid: string }> }
) {
  try {
    const { workspaceid, reminderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedat: new Date() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.completed !== undefined) updates.completed = body.completed;
    if (body.isread !== undefined) updates.isread = body.isread;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.reminderdate !== undefined) updates.reminderdate = body.reminderdate ? new Date(body.reminderdate) : null;
    if (body.patientname !== undefined) updates.patientname = body.patientname;

    const [row] = await db
      .update(patientReminders)
      .set(updates)
      .where(and(eq(patientReminders.reminderid, reminderid), eq(patientReminders.workspaceid, workspaceid)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ reminder: row });
  } catch (err) {
    console.error("[patient-reminders PATCH]", err);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}

// DELETE — delete a reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; reminderid: string }> }
) {
  try {
    const { workspaceid, reminderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db
      .delete(patientReminders)
      .where(and(eq(patientReminders.reminderid, reminderid), eq(patientReminders.workspaceid, workspaceid)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[patient-reminders DELETE]", err);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}

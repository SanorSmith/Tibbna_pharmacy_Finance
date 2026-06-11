import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReminders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

// GET — list reminders for workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(patientReminders)
      .where(eq(patientReminders.workspaceid, workspaceid))
      .orderBy(desc(patientReminders.createdat));

    return NextResponse.json({ reminders: rows });
  } catch (err) {
    console.error("[patient-reminders GET]", err);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST — create a new reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, patientid, patientname, reminderdate, priority } = body;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const [row] = await db
      .insert(patientReminders)
      .values({
        workspaceid,
        title,
        description: description || null,
        patientid: patientid || null,
        patientname: patientname || null,
        reminderdate: reminderdate ? new Date(reminderdate) : null,
        priority: priority || "medium",
        createdby: user.name || user.email || null,
        completed: false,
      })
      .returning();

    return NextResponse.json({ reminder: row });
  } catch (err) {
    console.error("[patient-reminders POST]", err);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

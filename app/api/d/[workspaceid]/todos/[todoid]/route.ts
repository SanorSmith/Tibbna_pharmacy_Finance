/**
 * API: /api/d/[workspaceid]/todos/[todoid]
 * - PATCH: update todo
 * - DELETE: delete todo
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; todoid: string }> }
) {
  const { workspaceid, todoid } = await params;
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, description, priority, duedate, completed } = body;

    const updateData: {
      updatedat: Date;
      title?: string;
      description?: string | null;
      priority?: string;
      duedate?: Date | null;
      completed?: boolean;
    } = {
      updatedat: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (duedate !== undefined) updateData.duedate = duedate ? new Date(duedate) : null;
    if (completed !== undefined) updateData.completed = completed;

    const [updatedTodo] = await db
      .update(todos)
      .set(updateData)
      .where(
        and(
          eq(todos.todoid, todoid),
          eq(todos.workspaceid, workspaceid),
          eq(todos.userid, user.userid)
        )
      )
      .returning();

    if (!updatedTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ todo: updatedTodo });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; todoid: string }> }
) {
  const { workspaceid, todoid } = await params;
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [deletedTodo] = await db
      .delete(todos)
      .where(
        and(
          eq(todos.todoid, todoid),
          eq(todos.workspaceid, workspaceid),
          eq(todos.userid, user.userid)
        )
      )
      .returning();

    if (!deletedTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}

/**
 * API: /api/d/[workspaceid]/todos
 * - GET: list all todos for the current user in workspace
 * - POST: create new todo
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
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
    const userTodos = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.workspaceid, workspaceid),
          eq(todos.userid, user.userid)
        )
      )
      .orderBy(desc(todos.createdat));

    return NextResponse.json({ todos: userTodos });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
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
    const { title, description, priority, duedate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const [newTodo] = await db
      .insert(todos)
      .values({
        workspaceid,
        userid: user.userid,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        duedate: duedate ? new Date(duedate) : null,
        completed: false,
      })
      .returning();

    return NextResponse.json({ todo: newTodo }, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}

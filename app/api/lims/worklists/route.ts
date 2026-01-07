import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  worklists,
  worklistItems,
  WORKLIST_STATUS,
  WORKLIST_ITEM_STATUS,
  NewWorklist,
  NewWorklistItem,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// GET - Fetch worklists
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceid");
    const status = searchParams.get("status");
    const department = searchParams.get("department");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(worklists.workspaceid, workspaceId)];
    if (status) {
      conditions.push(eq(worklists.status, status));
    }
    if (department) {
      conditions.push(eq(worklists.department, department));
    }

    // Fetch worklists with item counts
    const worklistsData = await db
      .select({
        worklistid: worklists.worklistid,
        worklistname: worklists.worklistname,
        worklisttype: worklists.worklisttype,
        department: worklists.department,
        analyzer: worklists.analyzer,
        priority: worklists.priority,
        status: worklists.status,
        createdby: worklists.createdby,
        createdbyname: worklists.createdbyname,
        assignedto: worklists.assignedto,
        assignedtoname: worklists.assignedtoname,
        description: worklists.description,
        createdat: worklists.createdat,
        updatedat: worklists.updatedat,
        completedat: worklists.completedat,
        workspaceid: worklists.workspaceid,
        itemCount: sql<number>`COUNT(${worklistItems.worklistitemid})`.as('itemCount'),
      })
      .from(worklists)
      .leftJoin(worklistItems, eq(worklists.worklistid, worklistItems.worklistid))
      .where(and(...conditions))
      .groupBy(worklists.worklistid)
      .orderBy(desc(worklists.createdat));

    return NextResponse.json({ worklists: worklistsData });
  } catch (error) {
    console.error("Error fetching worklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklists", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Create new worklist
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      worklistname,
      worklisttype,
      department,
      analyzer,
      priority = "routine",
      description,
      workspaceId,
      assignedto,
      assignedtoname,
    } = body;

    // Validation
    if (!worklistname || !worklisttype || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields: worklistname, worklisttype, workspaceId" },
        { status: 400 }
      );
    }

    // Create worklist
    const worklistData: NewWorklist = {
      worklistname,
      worklisttype,
      department: department || null,
      analyzer: analyzer || null,
      priority,
      status: WORKLIST_STATUS.PENDING,
      createdby: user.userid,
      createdbyname: user.name || null,
      assignedto: assignedto || null,
      assignedtoname: assignedtoname || null,
      description: description || null,
      workspaceid: workspaceId,
    };

    const [newWorklist] = await db.insert(worklists).values(worklistData).returning();

    return NextResponse.json({
      success: true,
      worklist: newWorklist,
    });
  } catch (error) {
    console.error("Worklist creation error:", error);
    return NextResponse.json(
      { error: "Failed to create worklist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH - Update worklist status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { worklistid, status, assignedto, assignedtoname } = body;

    if (!worklistid) {
      return NextResponse.json({ error: "Worklist ID required" }, { status: 400 });
    }

    const updateData: any = {
      updatedat: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === WORKLIST_STATUS.COMPLETED) {
        updateData.completedat = new Date();
      }
    }

    if (assignedto !== undefined) {
      updateData.assignedto = assignedto;
    }

    if (assignedtoname !== undefined) {
      updateData.assignedtoname = assignedtoname;
    }

    const [updatedWorklist] = await db
      .update(worklists)
      .set(updateData)
      .where(eq(worklists.worklistid, worklistid))
      .returning();

    return NextResponse.json({
      success: true,
      worklist: updatedWorklist,
    });
  } catch (error) {
    console.error("Worklist update error:", error);
    return NextResponse.json(
      { error: "Failed to update worklist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  worklistItems,
  worklists,
  WORKLIST_ITEM_STATUS,
  NewWorklistItem,
  accessionSamples,
  limsOrders,
  patients,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// GET - Fetch worklist items with order, patient, and sample details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { worklistid } = await params;

    // Join with orders, samples, and patients to get complete information
    const items = await db
      .select({
        worklistitemid: worklistItems.worklistitemid,
        worklistid: worklistItems.worklistid,
        orderid: worklistItems.orderid,
        sampleid: worklistItems.sampleid,
        testcode: worklistItems.testcode,
        testname: worklistItems.testname,
        status: worklistItems.status,
        position: worklistItems.position,
        addedby: worklistItems.addedby,
        addedbyname: worklistItems.addedbyname,
        addedat: worklistItems.addedat,
        startedat: worklistItems.startedat,
        completedat: worklistItems.completedat,
        notes: worklistItems.notes,
        // Sample information
        samplenumber: accessionSamples.samplenumber,
        accessionnumber: accessionSamples.accessionnumber,
        sampletype: accessionSamples.sampletype,
        tests: accessionSamples.tests,
        currentlocation: accessionSamples.currentlocation,
        barcode: accessionSamples.barcode,
        // Order information
        orderstatus: limsOrders.status,
        priority: limsOrders.priority,
        // Patient information
        patientid: accessionSamples.patientid,
        patientName: sql<string>`CONCAT(${patients.firstname}, ' ', ${patients.lastname})`.as('patientName'),
      })
      .from(worklistItems)
      .leftJoin(accessionSamples, sql`${worklistItems.sampleid}::text = ${accessionSamples.sampleid}::text`)
      .leftJoin(limsOrders, sql`${worklistItems.orderid}::text = ${limsOrders.orderid}::text`)
      .leftJoin(patients, sql`${accessionSamples.patientid}::text = ${patients.patientid}::text`)
      .where(eq(worklistItems.worklistid, worklistid))
      .orderBy(desc(worklistItems.addedat));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching worklist items:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklist items", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Add item to worklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { worklistid } = await params;
    const body = await request.json();
    const {
      orderid,
      sampleid,
      testcode,
      testname,
      position,
      notes,
    } = body;

    // Validation - require either orderid or sampleid
    if (!orderid && !sampleid) {
      return NextResponse.json(
        { error: "Either Order ID or Sample ID is required" },
        { status: 400 }
      );
    }

    // Check if worklist exists
    const [worklist] = await db
      .select()
      .from(worklists)
      .where(eq(worklists.worklistid, worklistid))
      .limit(1);

    if (!worklist) {
      return NextResponse.json({ error: "Worklist not found" }, { status: 404 });
    }

    // Block adding sample if it is already in any active worklist
    if (sampleid) {
      const existingAssignment = await db
        .select({
          worklistitemid: worklistItems.worklistitemid,
          worklistid: worklists.worklistid,
          worklistname: worklists.worklistname,
          workliststatus: worklists.status,
        })
        .from(worklistItems)
        .innerJoin(worklists, eq(worklistItems.worklistid, worklists.worklistid))
        .where(
          and(
            eq(worklistItems.sampleid, sampleid),
            sql`${worklists.status} NOT IN ('completed', 'cancelled')`
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        const existing = existingAssignment[0];
        return NextResponse.json(
          {
            error: `Sample is already assigned to worklist "${existing.worklistname}". Remove it from that worklist first before adding to a new one.`,
            existingWorklist: {
              worklistid: existing.worklistid,
              worklistname: existing.worklistname,
              status: existing.workliststatus,
            },
          },
          { status: 409 }
        );
      }
    }

    // Create worklist item
    const itemData: NewWorklistItem = {
      worklistid,
      orderid,
      sampleid: sampleid || null,
      testcode: testcode || null,
      testname: testname || null,
      status: WORKLIST_ITEM_STATUS.PENDING,
      position: position || null,
      addedby: user.userid,
      addedbyname: user.name || null,
      notes: notes || null,
    };

    const [newItem] = await db.insert(worklistItems).values(itemData).returning();

    // AUTO-TRANSITION: Sample RECEIVED/IN_STORAGE → IN_PROCESS when added to worklist
    if (sampleid) {
      try {
        const { StatusTransitionService } = await import("@/lib/lims/status-transition-service");
        
        const transitionResult = await StatusTransitionService.startSampleProcessing({
          sampleid: sampleid,
          userid: user.userid,
          worklistid: worklistid,
        });
        
        if (transitionResult.success) {
          console.log(`[Worklist] Sample status transitioned: ${transitionResult.message}`);
        }
      } catch (transitionError) {
        console.error("[Worklist] Sample status transition error:", transitionError);
        // Don't fail the worklist addition if status transition fails
      }
    }

    return NextResponse.json({
      success: true,
      item: newItem,
    });
  } catch (error) {
    console.error("Worklist item creation error:", error);
    return NextResponse.json(
      { error: "Failed to add item to worklist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH - Update worklist item status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params;

    const body = await request.json();
    const { worklistitemid, status, position, notes } = body;

    if (!worklistitemid) {
      return NextResponse.json({ error: "Worklist item ID required" }, { status: 400 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === WORKLIST_ITEM_STATUS.IN_PROGRESS && !updateData.startedat) {
        updateData.startedat = new Date();
      }
      if (status === WORKLIST_ITEM_STATUS.COMPLETED || status === WORKLIST_ITEM_STATUS.FAILED) {
        updateData.completedat = new Date();
      }
    }

    if (position !== undefined) {
      updateData.position = position;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updatedItem] = await db
      .update(worklistItems)
      .set(updateData)
      .where(eq(worklistItems.worklistitemid, worklistitemid))
      .returning();

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error("Worklist item update error:", error);
    return NextResponse.json(
      { error: "Failed to update worklist item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from worklist
export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await _params;

    const { searchParams } = new URL(request.url);
    const worklistitemid = searchParams.get("worklistitemid");

    if (!worklistitemid) {
      return NextResponse.json({ error: "Worklist item ID required" }, { status: 400 });
    }

    await db
      .delete(worklistItems)
      .where(eq(worklistItems.worklistitemid, worklistitemid));

    return NextResponse.json({
      success: true,
      message: "Item removed from worklist",
    });
  } catch (error) {
    console.error("Worklist item deletion error:", error);
    return NextResponse.json(
      { error: "Failed to remove item from worklist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { worklists, worklistItems, validationStates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if all items in a worklist are released and update status to COMPLETED if so
 */
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

    // Get all worklist items
    const items = await db
      .select({
        sampleid: worklistItems.sampleid,
      })
      .from(worklistItems)
      .where(eq(worklistItems.worklistid, worklistid));

    if (items.length === 0) {
      return NextResponse.json({ 
        message: "No items in worklist",
        allReleased: false 
      });
    }

    // Check validation state for each sample
    let allReleased = true;
    for (const item of items) {
      if (!item.sampleid) {
        allReleased = false;
        break;
      }

      const [validationState] = await db
        .select({ currentstate: validationStates.currentstate })
        .from(validationStates)
        .where(eq(validationStates.sampleid, item.sampleid))
        .limit(1);

      if (!validationState || validationState.currentstate !== "RELEASED") {
        allReleased = false;
        break;
      }
    }

    // If all items are released, update worklist status to COMPLETED
    if (allReleased) {
      await db
        .update(worklists)
        .set({ 
          status: "completed",
          completedat: new Date(),
          updatedat: new Date()
        })
        .where(eq(worklists.worklistid, worklistid));

      return NextResponse.json({
        success: true,
        message: "Worklist status updated to COMPLETED",
        allReleased: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Not all items are released yet",
      allReleased: false,
    });
  } catch (error) {
    console.error("Error checking worklist completion:", error);
    return NextResponse.json(
      { 
        error: "Failed to check worklist completion", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

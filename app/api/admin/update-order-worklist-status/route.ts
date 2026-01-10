import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessionSamples, validationStates, limsOrders, worklists, worklistItems } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  try {
    const updatedOrders = [];
    const updatedWorklists = [];

    // Get all unique order IDs from accession samples
    const allSamples = await db
      .select()
      .from(accessionSamples);

    const orderIds = [...new Set(allSamples.map(s => s.orderid))];

    // Check and update each order
    for (const orderId of orderIds) {
      const orderSamples = allSamples.filter(s => s.orderid === orderId);
      
      const samplesComplete = await Promise.all(
        orderSamples.map(async (sample) => {
          const state = await db
            .select()
            .from(validationStates)
            .where(eq(validationStates.sampleid, sample.sampleid))
            .limit(1);
          return state.length > 0 && state[0].currentstate === 'ANALYZED';
        })
      );

      if (samplesComplete.every(complete => complete) && samplesComplete.length > 0) {
        // All samples in order are complete, update order status
        await db
          .update(limsOrders)
          .set({
            status: 'COMPLETED',
            updatedat: new Date(),
          })
          .where(sql`${limsOrders.orderid}::text = ${orderId}`);
        
        updatedOrders.push({
          orderid: orderId,
          totalSamples: orderSamples.length,
          completedSamples: samplesComplete.filter(c => c).length,
        });
      }
    }

    // Get all worklists
    const allWorklists = await db
      .select()
      .from(worklists);

    // Check and update each worklist
    for (const worklist of allWorklists) {
      const items = await db
        .select()
        .from(worklistItems)
        .where(eq(worklistItems.worklistid, worklist.worklistid));

      const worklistSamplesComplete = await Promise.all(
        items.map(async (item) => {
          if (!item.sampleid) return false;
          const state = await db
            .select()
            .from(validationStates)
            .where(eq(validationStates.sampleid, item.sampleid))
            .limit(1);
          return state.length > 0 && state[0].currentstate === 'ANALYZED';
        })
      );

      if (worklistSamplesComplete.every(complete => complete) && worklistSamplesComplete.length > 0) {
        // All samples in worklist are complete, update worklist status
        await db
          .update(worklists)
          .set({
            status: 'COMPLETED',
            updatedat: new Date(),
          })
          .where(eq(worklists.worklistid, worklist.worklistid));
        
        updatedWorklists.push({
          worklistid: worklist.worklistid,
          worklistname: worklist.worklistname,
          totalSamples: items.length,
          completedSamples: worklistSamplesComplete.filter(c => c).length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedOrders.length} orders and ${updatedWorklists.length} worklists`,
      updatedOrders,
      updatedWorklists,
    });
  } catch (error) {
    console.error("Update order/worklist status error:", error);
    return NextResponse.json(
      { error: "Failed to update statuses", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

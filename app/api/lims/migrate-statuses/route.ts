import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  limsOrders,
  accessionSamples,
  worklistItems,
  validationStates,
  sampleStatusHistory,
  sampleAccessionAuditLog,
  ORDER_STATUS,
  SAMPLE_STATUS,
  ACCESSION_AUDIT_ACTIONS,
  VALIDATION_STATES,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface OrderUpdate {
  orderid: string;
  currentStatus: string;
  newStatus: string;
  reason: string;
}

interface SampleUpdate {
  sampleid: string;
  samplenumber: string;
  currentStatus: string;
  newStatus: string;
  reason: string;
}

interface MigrationStats {
  ordersAnalyzed: number;
  ordersUpdated: number;
  samplesAnalyzed: number;
  samplesUpdated: number;
  errors: string[];
}

async function analyzeOrderStatus(order: any): Promise<OrderUpdate | null> {
  const orderid = order.orderid;
  const currentStatus = order.status;

  if (currentStatus === ORDER_STATUS.COMPLETED || currentStatus === ORDER_STATUS.CANCELLED) {
    return null;
  }

  const samples = await db
    .select()
    .from(accessionSamples)
    .where(eq(accessionSamples.orderid, orderid));

  if (samples.length === 0) {
    if (currentStatus !== ORDER_STATUS.REQUESTED) {
      return {
        orderid,
        currentStatus,
        newStatus: ORDER_STATUS.REQUESTED,
        reason: "No samples found - reverting to REQUESTED",
      };
    }
    return null;
  }

  const allAnalyzed = samples.every((s) => s.currentstatus === SAMPLE_STATUS.ANALYZED);
  if (allAnalyzed) {
    if (currentStatus !== ORDER_STATUS.COMPLETED) {
      return {
        orderid,
        currentStatus,
        newStatus: ORDER_STATUS.COMPLETED,
        reason: "All samples have released results",
      };
    }
    return null;
  }

  const hasProcessingSamples = samples.some(
    (s) => s.currentstatus === SAMPLE_STATUS.IN_PROCESS || s.currentstatus === SAMPLE_STATUS.ANALYZED
  );
  if (hasProcessingSamples) {
    if (currentStatus !== ORDER_STATUS.IN_PROGRESS) {
      return {
        orderid,
        currentStatus,
        newStatus: ORDER_STATUS.IN_PROGRESS,
        reason: "Samples are being processed",
      };
    }
    return null;
  }

  const hasReceivedSamples = samples.some(
    (s) => s.currentstatus === SAMPLE_STATUS.RECEIVED || s.currentstatus === SAMPLE_STATUS.IN_STORAGE
  );
  if (hasReceivedSamples) {
    if (currentStatus !== ORDER_STATUS.ACCEPTED) {
      return {
        orderid,
        currentStatus,
        newStatus: ORDER_STATUS.ACCEPTED,
        reason: "Samples have been collected",
      };
    }
    return null;
  }

  return null;
}

async function analyzeSampleStatus(sample: any): Promise<SampleUpdate | null> {
  const sampleid = sample.sampleid;
  const currentStatus = sample.currentstatus;

  if (currentStatus === SAMPLE_STATUS.ANALYZED || currentStatus === SAMPLE_STATUS.DISPOSED) {
    return null;
  }

  const validationState = await db.query.validationStates.findFirst({
    where: eq(validationStates.sampleid, sampleid),
  });

  if (validationState?.currentstate === VALIDATION_STATES.RELEASED) {
    if (currentStatus !== SAMPLE_STATUS.ANALYZED) {
      return {
        sampleid,
        samplenumber: sample.samplenumber,
        currentStatus,
        newStatus: SAMPLE_STATUS.ANALYZED,
        reason: "Results have been released",
      };
    }
    return null;
  }

  const worklistAssignment = await db
    .select()
    .from(worklistItems)
    .where(eq(worklistItems.sampleid, sampleid))
    .limit(1);

  if (worklistAssignment.length > 0) {
    if (currentStatus === SAMPLE_STATUS.RECEIVED || currentStatus === SAMPLE_STATUS.IN_STORAGE) {
      return {
        sampleid,
        samplenumber: sample.samplenumber,
        currentStatus,
        newStatus: SAMPLE_STATUS.IN_PROCESS,
        reason: "Sample is on a worklist",
      };
    }
    return null;
  }

  return null;
}

async function applyOrderUpdate(update: OrderUpdate, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }

  await db
    .update(limsOrders)
    .set({
      status: update.newStatus,
      updatedat: new Date(),
    })
    .where(eq(limsOrders.orderid, update.orderid));
}

async function applySampleUpdate(update: SampleUpdate, dryRun: boolean, userid: string): Promise<void> {
  if (dryRun) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accessionSamples)
      .set({
        currentstatus: update.newStatus,
        updatedat: new Date(),
      })
      .where(eq(accessionSamples.sampleid, update.sampleid));

    await tx.insert(sampleStatusHistory).values({
      sampleid: update.sampleid,
      previousstatus: update.currentStatus,
      newstatus: update.newStatus,
      previouslocation: null,
      newlocation: null,
      changedby: userid,
      changereason: `Migration: ${update.reason}`,
    });

    await tx.insert(sampleAccessionAuditLog).values({
      sampleid: update.sampleid,
      action: ACCESSION_AUDIT_ACTIONS.STATUS_CHANGED,
      userid: userid,
      userrole: "admin",
      previousdata: JSON.stringify({ status: update.currentStatus }),
      newdata: JSON.stringify({ status: update.newStatus }),
      reason: `Migration: ${update.reason}`,
      metadata: JSON.stringify({
        migration: true,
        migrationDate: new Date().toISOString(),
      }),
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dryRun = true } = body;

    const stats: MigrationStats = {
      ordersAnalyzed: 0,
      ordersUpdated: 0,
      samplesAnalyzed: 0,
      samplesUpdated: 0,
      errors: [],
    };

    const orders = await db.select().from(limsOrders);
    stats.ordersAnalyzed = orders.length;

    const orderUpdates: OrderUpdate[] = [];
    for (const order of orders) {
      try {
        const update = await analyzeOrderStatus(order);
        if (update) {
          orderUpdates.push(update);
        }
      } catch (error) {
        stats.errors.push(`Order ${order.orderid}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    for (const update of orderUpdates) {
      try {
        await applyOrderUpdate(update, dryRun);
        if (!dryRun) {
          stats.ordersUpdated++;
        }
      } catch (error) {
        stats.errors.push(`Failed to update order ${update.orderid}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    const samples = await db.select().from(accessionSamples);
    stats.samplesAnalyzed = samples.length;

    const sampleUpdates: SampleUpdate[] = [];
    for (const sample of samples) {
      try {
        const update = await analyzeSampleStatus(sample);
        if (update) {
          sampleUpdates.push(update);
        }
      } catch (error) {
        stats.errors.push(`Sample ${sample.samplenumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    for (const update of sampleUpdates) {
      try {
        await applySampleUpdate(update, dryRun, user.userid);
        if (!dryRun) {
          stats.samplesUpdated++;
        }
      } catch (error) {
        stats.errors.push(`Failed to update sample ${update.samplenumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      stats,
      orderUpdates,
      sampleUpdates,
      message: dryRun 
        ? `Preview: ${orderUpdates.length} orders and ${sampleUpdates.length} samples would be updated`
        : `Migration complete: ${stats.ordersUpdated} orders and ${stats.samplesUpdated} samples updated`,
    });

  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

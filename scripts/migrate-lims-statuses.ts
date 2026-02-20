/**
 * LIMS Status Migration Script
 * 
 * This script updates existing orders and samples to their correct statuses
 * based on their current workflow state. It applies the same business rules
 * as the automated status transition service.
 * 
 * Usage:
 *   npx tsx scripts/migrate-lims-statuses.ts --dry-run    # Preview changes
 *   npx tsx scripts/migrate-lims-statuses.ts --apply      # Apply changes
 */

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
import { eq, sql, and, inArray } from "drizzle-orm";

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

const stats: MigrationStats = {
  ordersAnalyzed: 0,
  ordersUpdated: 0,
  samplesAnalyzed: 0,
  samplesUpdated: 0,
  errors: [],
};

/**
 * Determine correct order status based on current workflow state
 */
async function analyzeOrderStatus(order: any): Promise<OrderUpdate | null> {
  const orderid = order.orderid;
  const currentStatus = order.status;

  // Skip if already COMPLETED or CANCELLED
  if (currentStatus === ORDER_STATUS.COMPLETED || currentStatus === ORDER_STATUS.CANCELLED) {
    return null;
  }

  // Get all samples for this order
  const samples = await db
    .select()
    .from(accessionSamples)
    .where(eq(accessionSamples.orderid, orderid));

  // If no samples, order should stay REQUESTED
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

  // Check if all samples are ANALYZED (results released)
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

  // Check if any sample is IN_PROCESS or ANALYZED
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

  // If samples exist and are RECEIVED/IN_STORAGE, order should be ACCEPTED
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

/**
 * Determine correct sample status based on current workflow state
 */
async function analyzeSampleStatus(sample: any): Promise<SampleUpdate | null> {
  const sampleid = sample.sampleid;
  const currentStatus = sample.currentstatus;

  // Skip if already ANALYZED or DISPOSED
  if (currentStatus === SAMPLE_STATUS.ANALYZED || currentStatus === SAMPLE_STATUS.DISPOSED) {
    return null;
  }

  // Check if results have been released (validation state is RELEASED)
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

  // Check if sample is on any active worklist
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

/**
 * Apply order status update
 */
async function applyOrderUpdate(update: OrderUpdate, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Order ${update.orderid}: ${update.currentStatus} → ${update.newStatus}`);
    console.log(`  Reason: ${update.reason}`);
    return;
  }

  await db
    .update(limsOrders)
    .set({
      status: update.newStatus,
      updatedat: new Date(),
    })
    .where(eq(limsOrders.orderid, update.orderid));

  console.log(`✅ Order ${update.orderid}: ${update.currentStatus} → ${update.newStatus}`);
  stats.ordersUpdated++;
}

/**
 * Apply sample status update with audit trail
 */
async function applySampleUpdate(update: SampleUpdate, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Sample ${update.samplenumber}: ${update.currentStatus} → ${update.newStatus}`);
    console.log(`  Reason: ${update.reason}`);
    return;
  }

  await db.transaction(async (tx) => {
    // Update sample status
    await tx
      .update(accessionSamples)
      .set({
        currentstatus: update.newStatus,
        updatedat: new Date(),
      })
      .where(eq(accessionSamples.sampleid, update.sampleid));

    // Create status history entry
    await tx.insert(sampleStatusHistory).values({
      sampleid: update.sampleid,
      previousstatus: update.currentStatus,
      newstatus: update.newStatus,
      previouslocation: null,
      newlocation: null,
      changedby: "00000000-0000-0000-0000-000000000000", // System user
      changereason: `Migration: ${update.reason}`,
    });

    // Create audit log entry
    await tx.insert(sampleAccessionAuditLog).values({
      sampleid: update.sampleid,
      action: ACCESSION_AUDIT_ACTIONS.STATUS_CHANGED,
      userid: "00000000-0000-0000-0000-000000000000", // System user
      userrole: "system",
      previousdata: JSON.stringify({ status: update.currentStatus }),
      newdata: JSON.stringify({ status: update.newStatus }),
      reason: `Migration: ${update.reason}`,
      metadata: JSON.stringify({
        migration: true,
        migrationDate: new Date().toISOString(),
      }),
    });
  });

  console.log(`✅ Sample ${update.samplenumber}: ${update.currentStatus} → ${update.newStatus}`);
  stats.samplesUpdated++;
}

/**
 * Main migration function
 */
async function migrateStatuses(dryRun: boolean = true): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("LIMS Status Migration Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (Preview Only)" : "APPLY CHANGES"}`);
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Analyze and update orders
    console.log("📋 Step 1: Analyzing Orders...\n");
    
    const orders = await db.select().from(limsOrders);
    stats.ordersAnalyzed = orders.length;
    console.log(`Found ${orders.length} orders to analyze\n`);

    const orderUpdates: OrderUpdate[] = [];
    for (const order of orders) {
      const update = await analyzeOrderStatus(order);
      if (update) {
        orderUpdates.push(update);
      }
    }

    console.log(`Orders requiring updates: ${orderUpdates.length}\n`);

    for (const update of orderUpdates) {
      try {
        await applyOrderUpdate(update, dryRun);
      } catch (error) {
        const errorMsg = `Failed to update order ${update.orderid}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Step 2: Analyze and update samples
    console.log("\n🧪 Step 2: Analyzing Samples...\n");
    
    const samples = await db.select().from(accessionSamples);
    stats.samplesAnalyzed = samples.length;
    console.log(`Found ${samples.length} samples to analyze\n`);

    const sampleUpdates: SampleUpdate[] = [];
    for (const sample of samples) {
      const update = await analyzeSampleStatus(sample);
      if (update) {
        sampleUpdates.push(update);
      }
    }

    console.log(`Samples requiring updates: ${sampleUpdates.length}\n`);

    for (const update of sampleUpdates) {
      try {
        await applySampleUpdate(update, dryRun);
      } catch (error) {
        const errorMsg = `Failed to update sample ${update.samplenumber}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`Orders analyzed: ${stats.ordersAnalyzed}`);
    console.log(`Orders updated: ${dryRun ? orderUpdates.length + " (would be updated)" : stats.ordersUpdated}`);
    console.log(`Samples analyzed: ${stats.samplesAnalyzed}`);
    console.log(`Samples updated: ${dryRun ? sampleUpdates.length + " (would be updated)" : stats.samplesUpdated}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log("=".repeat(60) + "\n");

    if (stats.errors.length > 0) {
      console.log("Errors encountered:");
      stats.errors.forEach((error) => console.log(`  - ${error}`));
      console.log();
    }

    if (dryRun) {
      console.log("ℹ️  This was a DRY RUN. No changes were made to the database.");
      console.log("ℹ️  Run with --apply flag to apply these changes.\n");
    } else {
      console.log("✅ Migration completed successfully!\n");
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");

// Run migration
migrateStatuses(dryRun)
  .then(() => {
    console.log("Migration script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });

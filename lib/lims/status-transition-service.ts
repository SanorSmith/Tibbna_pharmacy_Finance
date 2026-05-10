import { db } from "@/lib/db";
import {
  limsOrders,
  accessionSamples,
  testResults,
  ORDER_STATUS,
  SAMPLE_STATUS,
  sampleStatusHistory,
  sampleAccessionAuditLog,
  ACCESSION_AUDIT_ACTIONS,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Automated Status Transition Service for LIMS
 * Handles all automated state transitions based on business rules
 */

export interface TransitionResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  message?: string;
  error?: string;
}

export class StatusTransitionService {
  /**
   * AUTO-TRANSITION 1: Order REQUESTED → ACCEPTED
   * Triggered when: Lab accepts the order (manual action or auto-accept)
   */
  static async acceptOrder(params: {
    orderid: string;
    acceptedby: string;
    workspaceid: string;
    reason?: string;
  }): Promise<TransitionResult> {
    const { orderid, acceptedby, reason } = params;

    try {
      return await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(limsOrders)
          .where(eq(limsOrders.orderid, orderid))
          .limit(1);

        if (!order) {
          return { success: false, error: "Order not found" };
        }

        if (order.status !== ORDER_STATUS.REQUESTED) {
          return {
            success: false,
            error: `Cannot accept order with status ${order.status}`,
          };
        }

        await tx
          .update(limsOrders)
          .set({
            status: ORDER_STATUS.ACCEPTED,
            updatedat: new Date(),
          })
          .where(eq(limsOrders.orderid, orderid));

        console.log(
          `[StatusTransition] Order ${orderid}: REQUESTED → ACCEPTED by ${acceptedby}`
        );

        return {
          success: true,
          previousStatus: ORDER_STATUS.REQUESTED,
          newStatus: ORDER_STATUS.ACCEPTED,
          message: reason || "Order accepted by lab",
        };
      });
    } catch (error) {
      console.error("[StatusTransition] Error accepting order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * AUTO-TRANSITION 2: Order ACCEPTED → IN_PROGRESS
   * Triggered when: Sample is accessioned (collected)
   */
  static async startOrderProcessing(params: {
    orderid: string;
    sampleid: string;
    userid: string;
  }): Promise<TransitionResult> {
    const { orderid, userid } = params;

    try {
      return await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(limsOrders)
          .where(eq(limsOrders.orderid, orderid))
          .limit(1);

        if (!order) {
          return { success: false, error: "Order not found" };
        }

        if (
          order.status !== ORDER_STATUS.REQUESTED &&
          order.status !== ORDER_STATUS.ACCEPTED
        ) {
          return {
            success: false,
            error: `Cannot start processing order with status ${order.status}`,
          };
        }

        await tx
          .update(limsOrders)
          .set({
            status: ORDER_STATUS.IN_PROGRESS,
            updatedat: new Date(),
          })
          .where(eq(limsOrders.orderid, orderid));

        console.log(
          `[StatusTransition] Order ${orderid}: ${order.status} → IN_PROGRESS (sample accessioned)`
        );

        return {
          success: true,
          previousStatus: order.status,
          newStatus: ORDER_STATUS.IN_PROGRESS,
          message: "Sample accessioned, order processing started",
        };
      });
    } catch (error) {
      console.error("[StatusTransition] Error starting order processing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * AUTO-TRANSITION 3: Order IN_PROGRESS → COMPLETED
   * Triggered when: All test results are released
   */
  static async completeOrder(params: {
    orderid: string;
    userid: string;
  }): Promise<TransitionResult> {
    const { orderid } = params;

    try {
      return await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(limsOrders)
          .where(eq(limsOrders.orderid, orderid))
          .limit(1);

        if (!order) {
          return { success: false, error: "Order not found" };
        }

        if (order.status !== ORDER_STATUS.IN_PROGRESS) {
          return {
            success: false,
            error: `Cannot complete order with status ${order.status}`,
          };
        }

        const samples = await tx
          .select()
          .from(accessionSamples)
          .where(eq(accessionSamples.orderid, orderid));

        if (samples.length === 0) {
          return { success: false, error: "No samples found for order" };
        }

        const allAnalyzed = samples.every(
          (s) => s.currentstatus === SAMPLE_STATUS.ANALYZED
        );

        if (!allAnalyzed) {
          return {
            success: false,
            error: "Not all samples have released results",
          };
        }

        await tx
          .update(limsOrders)
          .set({
            status: ORDER_STATUS.COMPLETED,
            updatedat: new Date(),
          })
          .where(eq(limsOrders.orderid, orderid));

        console.log(
          `[StatusTransition] Order ${orderid}: IN_PROGRESS → COMPLETED (all results released)`
        );

        return {
          success: true,
          previousStatus: ORDER_STATUS.IN_PROGRESS,
          newStatus: ORDER_STATUS.COMPLETED,
          message: "All test results released, order completed",
        };
      });
    } catch (error) {
      console.error("[StatusTransition] Error completing order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * AUTO-TRANSITION 4: Sample RECEIVED → IN_PROCESS
   * Triggered when: Sample is added to a worklist
   */
  static async startSampleProcessing(params: {
    sampleid: string;
    userid: string;
    worklistid?: string;
  }): Promise<TransitionResult> {
    const { sampleid, userid, worklistid } = params;

    try {
      return await db.transaction(async (tx) => {
        const [sample] = await tx
          .select()
          .from(accessionSamples)
          .where(eq(accessionSamples.sampleid, sampleid))
          .limit(1);

        if (!sample) {
          return { success: false, error: "Sample not found" };
        }

        if (
          sample.currentstatus !== SAMPLE_STATUS.RECEIVED &&
          sample.currentstatus !== SAMPLE_STATUS.IN_STORAGE
        ) {
          return {
            success: false,
            error: `Cannot start processing sample with status ${sample.currentstatus}`,
          };
        }

        await tx
          .update(accessionSamples)
          .set({
            currentstatus: SAMPLE_STATUS.IN_PROCESS,
            updatedat: new Date(),
          })
          .where(eq(accessionSamples.sampleid, sampleid));

        await tx.insert(sampleStatusHistory).values({
          sampleid: sampleid,
          previousstatus: sample.currentstatus,
          newstatus: SAMPLE_STATUS.IN_PROCESS,
          previouslocation: sample.currentlocation,
          newlocation: sample.currentlocation,
          changedby: userid,
          changereason: worklistid
            ? `Added to worklist ${worklistid}`
            : "Sample processing started",
        });

        await tx.insert(sampleAccessionAuditLog).values({
          sampleid: sampleid,
          action: ACCESSION_AUDIT_ACTIONS.STATUS_CHANGED,
          userid: userid,
          userrole: "lab_technician",
          previousdata: JSON.stringify({ status: sample.currentstatus }),
          newdata: JSON.stringify({ status: SAMPLE_STATUS.IN_PROCESS }),
          reason: worklistid
            ? `Added to worklist ${worklistid}`
            : "Sample processing started",
          metadata: JSON.stringify({
            worklistid,
            automatedTransition: true,
          }),
        });

        console.log(
          `[StatusTransition] Sample ${sampleid}: ${sample.currentstatus} → IN_PROCESS`
        );

        return {
          success: true,
          previousStatus: sample.currentstatus,
          newStatus: SAMPLE_STATUS.IN_PROCESS,
          message: "Sample processing started",
        };
      });
    } catch (error) {
      console.error("[StatusTransition] Error starting sample processing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * AUTO-TRANSITION 5: Sample IN_PROCESS → COMPLETED (ANALYZED)
   * Triggered when: All tests for the sample have results entered
   */
  static async completeSampleTesting(params: {
    sampleid: string;
    userid: string;
  }): Promise<TransitionResult> {
    const { sampleid } = params;

    try {
      return await db.transaction(async (tx) => {
        const [sample] = await tx
          .select()
          .from(accessionSamples)
          .where(eq(accessionSamples.sampleid, sampleid))
          .limit(1);

        if (!sample) {
          return { success: false, error: "Sample not found" };
        }

        if (sample.currentstatus !== SAMPLE_STATUS.IN_PROCESS) {
          return {
            success: false,
            error: `Cannot complete sample with status ${sample.currentstatus}`,
          };
        }

        const results = await tx
          .select()
          .from(testResults)
          .where(eq(testResults.sampleid, sampleid));

        if (results.length === 0) {
          return {
            success: false,
            error: "No test results found for sample",
          };
        }

        const allResultsEntered = results.every(
          (r) => r.status && r.status !== "draft" && r.resultvalue
        );

        if (!allResultsEntered) {
          return {
            success: false,
            error: "Not all test results have been entered",
          };
        }

        return {
          success: true,
          previousStatus: sample.currentstatus,
          newStatus: sample.currentstatus,
          message: "All test results entered, awaiting validation and release",
        };
      });
    } catch (error) {
      console.error("[StatusTransition] Error completing sample testing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check and trigger order completion after sample results are released
   * This should be called after ValidationService.releaseResults()
   */
  static async checkAndCompleteOrder(params: {
    orderid: string;
    userid: string;
  }): Promise<TransitionResult> {
    return await this.completeOrder(params);
  }
}

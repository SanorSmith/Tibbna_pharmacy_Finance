import { db } from "@/lib/db";
import { testResults, validationStates, ValidationStateType, VALIDATION_STATES, NewValidationState } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { AuditService } from "./audit-service";
import { AUDIT_ACTIONS } from "@/lib/db/tables/audit-log";

/**
 * Validation Service - Core business logic for clinical validation
 * Enforces validation rules and state transitions
 * All operations are transactional and audited
 */

export interface ValidationRuleViolation {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export class ValidationService {
  /**
   * Validate business rules before allowing state transition
   * Returns array of violations (empty if valid)
   */
  static async validateBusinessRules(
    sampleid: string,
    targetState: ValidationStateType
  ): Promise<ValidationRuleViolation[]> {
    const violations: ValidationRuleViolation[] = [];

    const results = await db.query.testResults.findMany({
      where: eq(testResults.sampleid, sampleid),
    });

    if (results.length === 0) {
      violations.push({
        field: "results",
        message: "No test results found for this sample",
        severity: "error",
      });
      return violations;
    }

    // Rule: Critical values must have comments
    const criticalWithoutComments = results.filter(
      (r) => r.iscritical && !r.validationcomment
    );
    if (criticalWithoutComments.length > 0 && targetState === VALIDATION_STATES.CLINICALLY_VALIDATED) {
      violations.push({
        field: "validationcomment",
        message: `${criticalWithoutComments.length} critical result(s) require validation comments`,
        severity: "error",
      });
    }

    // Rule: Results marked for rerun cannot be validated
    const markedForRerun = results.filter((r) => r.markedforrerun);
    if (markedForRerun.length > 0 && targetState === VALIDATION_STATES.CLINICALLY_VALIDATED) {
      violations.push({
        field: "rerun",
        message: `${markedForRerun.length} result(s) marked for rerun must be resolved first`,
        severity: "error",
      });
    }

    // Rule: All results must be validated before release
    if (targetState === VALIDATION_STATES.RELEASED) {
      const currentState = await db.query.validationStates.findFirst({
        where: eq(validationStates.sampleid, sampleid),
      });

      if (currentState?.currentstate !== VALIDATION_STATES.CLINICALLY_VALIDATED) {
        violations.push({
          field: "state",
          message: "Sample must be clinically validated before release",
          severity: "error",
        });
      }
    }

    return violations;
  }

  /**
   * Transition sample to new validation state
   * Enforces state machine rules and creates audit trail
   */
  static async transitionState(params: {
    sampleid: string;
    targetState: ValidationStateType;
    userid: string;
    userrole: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; violations?: ValidationRuleViolation[] }> {
    const { sampleid, targetState, userid, userrole, reason, metadata } = params;

    return await db.transaction(async (tx) => {
      // Validate business rules
      const violations = await this.validateBusinessRules(sampleid, targetState);
      if (violations.some((v) => v.severity === "error")) {
        return { success: false, violations };
      }

      // Get current state
      const currentStateRecord = await tx.query.validationStates.findFirst({
        where: eq(validationStates.sampleid, sampleid),
      });

      const previousState = currentStateRecord?.currentstate || null;

      // Update validation state
      const updateData: Record<string, unknown> = {
        currentstate: targetState,
        previousstate: previousState,
        updatedat: new Date(),
      };

      // Set specific fields based on target state
      if (targetState === VALIDATION_STATES.CLINICALLY_VALIDATED) {
        updateData.validatedby = userid;
        updateData.validateddate = new Date();
      } else if (targetState === VALIDATION_STATES.RELEASED) {
        updateData.releasedby = userid;
        updateData.releaseddate = new Date();
      } else if (targetState === VALIDATION_STATES.REJECTED) {
        updateData.rejectedby = userid;
        updateData.rejecteddate = new Date();
        updateData.rejectionreason = reason;
      } else if (targetState === VALIDATION_STATES.RERUN_REQUESTED) {
        updateData.rerunrequestedby = userid;
        updateData.rerunrequesteddate = new Date();
        updateData.rerunreason = reason;
      }

      if (currentStateRecord) {
        await tx
          .update(validationStates)
          .set(updateData)
          .where(eq(validationStates.sampleid, sampleid));
      } else {
        await tx.insert(validationStates).values({
          sampleid,
          ...updateData,
        } as NewValidationState);
      }

      // Create audit log
      await AuditService.logAction({
        sampleid,
        userid,
        userrole,
        action: AUDIT_ACTIONS.STATE_CHANGED,
        previousstate: previousState,
        newstate: targetState,
        reason,
        metadata,
      });

      return { success: true };
    });
  }

  /**
   * Validate selected test results
   * Updates validation state and creates audit trail
   */
  static async validateResults(params: {
    sampleid: string;
    resultids: string[];
    userid: string;
    userrole: string;
    comments?: Record<string, string>;
  }): Promise<{ success: boolean; violations?: ValidationRuleViolation[] }> {
    const { sampleid, resultids, userid, userrole, comments } = params;

    return await db.transaction(async (tx) => {
      // Update test results with validation comments
      if (comments) {
        for (const [resultid, comment] of Object.entries(comments)) {
          await tx
            .update(testResults)
            .set({
              validationcomment: comment,
              updatedat: new Date(),
            })
            .where(eq(testResults.resultid, resultid));
        }
      }

      // Log validation action
      await AuditService.logAction({
        sampleid,
        userid,
        userrole,
        action: AUDIT_ACTIONS.CLINICALLY_VALIDATED,
        previousstate: null,
        newstate: "VALIDATED",
        metadata: { resultids, comments },
      });

      return { success: true };
    });
  }

  /**
   * Request rerun for specific test results
   */
  static async requestRerun(params: {
    sampleid: string;
    resultids: string[];
    userid: string;
    userrole: string;
    reason: string;
  }): Promise<{ success: boolean }> {
    const { sampleid, resultids, userid, userrole, reason } = params;

    return await db.transaction(async (tx) => {
      // Mark results for rerun
      await tx
        .update(testResults)
        .set({
          markedforrerun: true,
          rerunreason: reason,
          updatedat: new Date(),
        })
        .where(inArray(testResults.resultid, resultids));

      // Transition to RERUN_REQUESTED state
      await this.transitionState({
        sampleid,
        targetState: VALIDATION_STATES.RERUN_REQUESTED,
        userid,
        userrole,
        reason,
        metadata: { resultids },
      });

      return { success: true };
    });
  }

  /**
   * Reject validation
   */
  static async rejectValidation(params: {
    sampleid: string;
    userid: string;
    userrole: string;
    reason: string;
  }): Promise<{ success: boolean }> {
    const { sampleid, userid, userrole, reason } = params;

    return await this.transitionState({
      sampleid,
      targetState: VALIDATION_STATES.REJECTED,
      userid,
      userrole,
      reason,
    });
  }

  /**
   * Release validated results
   * This triggers the domain event for openEHR integration
   */
  static async releaseResults(params: {
    sampleid: string;
    userid: string;
    userrole: string;
  }): Promise<{ success: boolean; violations?: ValidationRuleViolation[] }> {
    const { sampleid, userid, userrole } = params;

    const result = await this.transitionState({
      sampleid,
      targetState: VALIDATION_STATES.RELEASED,
      userid,
      userrole,
    });

    if (result.success) {
      // Emit domain event for openEHR integration
      // This would be handled by a separate integration service
      await this.emitResultsReleasedEvent(sampleid);
    }

    return result;
  }

  /**
   * Emit domain event for results release
   * This is where openEHR integration would be triggered
   */
  private static async emitResultsReleasedEvent(sampleid: string): Promise<void> {
    // In production, this would publish to a message queue or event bus
    // For now, we'll just log it
    console.log(`[ValidationService] ResultsReleased event emitted for sample ${sampleid}`);
    
    // TODO: Implement actual event publishing
    // Example: await eventBus.publish('ResultsReleased', { sampleid, timestamp: new Date() });
  }
}

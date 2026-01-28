import { db } from "@/lib/db";
import { testResults, validationStates, ValidationStateType, VALIDATION_STATES, NewValidationState, accessionSamples, SAMPLE_STATUS, limsOrders, patients } from "@/lib/db/schema";
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

    return await db.transaction(async (tx) => {
      // Transition validation state to RELEASED
      const result = await this.transitionState({
        sampleid,
        targetState: VALIDATION_STATES.RELEASED,
        userid,
        userrole,
      });

      if (!result.success) {
        return result;
      }

      // Update sample status to ANALYZED
      await tx
        .update(accessionSamples)
        .set({
          currentstatus: SAMPLE_STATUS.ANALYZED,
          updatedat: new Date(),
        })
        .where(eq(accessionSamples.sampleid, sampleid));

      // Emit domain event for openEHR integration
      // This would be handled by a separate integration service
      await this.emitResultsReleasedEvent(sampleid);

      return result;
    });
  }

  /**
   * Emit domain event for results release
   * This triggers OpenEHR integration by submitting lab results
   */
  private static async emitResultsReleasedEvent(sampleid: string): Promise<void> {
    try {
      // Fetch sample details to submit to OpenEHR
      const sample = await db.query.accessionSamples.findFirst({
        where: eq(accessionSamples.sampleid, sampleid),
      });

      if (!sample || !sample.orderid) {
        console.log(`[ValidationService] Cannot submit to OpenEHR - missing sample/order data for sample ${sampleid}`);
        return;
      }

      // Fetch the LIMS order
      const limsOrder = await db.query.limsOrders.findFirst({
        where: eq(limsOrders.orderid, sample.orderid)
      });

      if (!limsOrder) {
        console.log(`[ValidationService] Cannot submit to OpenEHR - missing order data for sample ${sampleid}`);
        return;
      }

      // Fetch the patient
      const patient = await db.query.patients.findFirst({
        where: eq(patients.patientid, limsOrder.subjectidentifier)
      });

      if (!patient) {
        console.log(`[ValidationService] Cannot submit to OpenEHR - missing patient data for sample ${sampleid}`);
        return;
      }
      if (!patient.ehrid) {
        console.log(`[ValidationService] Cannot submit to OpenEHR - patient ${patient.patientid} has no EHR ID`);
        return;
      }

      // Fetch test results for this sample
      const testResults = await db.query.testResults.findMany({
        where: eq(testResults.sampleid, sampleid)
      });

      if (testResults.length === 0) {
        console.log(`[ValidationService] No test results to submit to OpenEHR for sample ${sampleid}`);
        return;
      }

      // Prepare data for OpenEHR submission
      const submitData = {
        sampleId: sampleid,
        workspaceId: sample.workspaceid,
        results: testResults.map(result => ({
          testCode: result.testcode,
          testName: result.testname,
          resultValue: result.resultvalue,
          unit: result.unit,
          referenceMin: result.referencemin,
          referenceMax: result.referencemax,
          referenceRange: result.referencerange,
          flag: result.resultflag,
          isAbnormal: result.isabormal,
          isCritical: result.iscritical,
        })),
        overallStatus: "final",
        conclusion: "Results released from LIMS",
        composerName: "LIMS System"
      };

      // Submit to OpenEHR
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/lims/submit-to-openehr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to submit to OpenEHR');
      }

      const result = await response.json();
      console.log(`[ValidationService] Successfully submitted results to OpenEHR for sample ${sampleid}`, result);

    } catch (error) {
      console.error(`[ValidationService] Failed to submit results to OpenEHR for sample ${sampleid}:`, error);
      // Don't fail the release process if OpenEHR submission fails
      // Just log the error and continue
    }
  }
}

import { db } from "@/lib/db";
import { auditLogs, NewAuditLog, AuditAction } from "@/lib/db/tables/audit-log";
import { headers } from "next/headers";

/**
 * Audit Service - Immutable logging for all validation actions
 * Critical for compliance, traceability, and regulatory requirements
 */
export class AuditService {
  /**
   * Log a validation action to the immutable audit trail
   * This function should NEVER throw - audit failures should be logged but not block operations
   */
  static async logAction(params: {
    sampleid: string;
    userid: string;
    userrole: string;
    action: AuditAction;
    previousstate: string | null;
    newstate: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const headersList = await headers();
      const ipaddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
      const useragent = headersList.get("user-agent") || "unknown";

      const auditEntry: NewAuditLog = {
        sampleid: params.sampleid,
        userid: params.userid,
        userrole: params.userrole,
        action: params.action,
        previousstate: params.previousstate,
        newstate: params.newstate,
        reason: params.reason,
        metadata: params.metadata || {},
        ipaddress,
        useragent,
      };

      await db.insert(auditLogs).values(auditEntry);
    } catch (error) {
      // Log to console but don't throw - audit failures should not block operations
      // In production, this should go to a monitoring service
      console.error("[AuditService] Failed to log action:", error, params);
    }
  }

  /**
   * Retrieve audit trail for a specific sample
   * Used for compliance reviews and investigation
   */
  static async getAuditTrail(sampleid: string) {
    return db.query.auditLogs.findMany({
      where: (auditLogs, { eq }) => eq(auditLogs.sampleid, sampleid),
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
      with: {
        userid: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get audit summary for a date range
   * Used for compliance reporting
   */
  static async getAuditSummary(_params: {
    workspaceid: string;
    startDate: Date;
    endDate: Date;
    action?: AuditAction;
  }) {
    // Implementation would use complex queries for reporting
    // Placeholder for now
    return [];
  }
}

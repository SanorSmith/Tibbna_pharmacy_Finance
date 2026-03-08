import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { testReferenceAuditLog } from "@/lib/db/schema";
import { getUser } from "@/lib/user";

// GET - Fetch audit logs for a specific range or all ranges in a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rangeid = searchParams.get("rangeid");

    const whereConditions: any[] = [
      eq(testReferenceAuditLog.workspaceid, workspaceid),
    ];

    if (rangeid) {
      whereConditions.push(eq(testReferenceAuditLog.rangeid, rangeid));
    }

    const logs = await db
      .select()
      .from(testReferenceAuditLog)
      .where(and(...whereConditions))
      .orderBy(desc(testReferenceAuditLog.createdat))
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

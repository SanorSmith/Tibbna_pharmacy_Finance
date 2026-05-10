/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await db
      .select()
      .from(insuranceCompanies)
      .where(
        and(
          eq(insuranceCompanies.workspaceid, workspaceid),
          eq(insuranceCompanies.isactive, true)
        )
      );

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}

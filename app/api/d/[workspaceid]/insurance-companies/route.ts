/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 *
 * Returns the active insurance companies from the Finance-managed master
 * list ("insurance_companies"). This list is shared across all workspaces —
 * Finance decides which insurance companies are available in the system.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await db
      .select()
      .from(insuranceCompanies)
      .where(eq(insuranceCompanies.isactive, true))
      .orderBy(insuranceCompanies.name);

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}

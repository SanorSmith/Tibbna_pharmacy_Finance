/**
 * Worklists API Route
 * Provides CRUD operations for worklists
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { worklists } from "@/lib/db/schema";
import { getUser } from "@/lib/user";

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
    const status = searchParams.get("status");

    const whereConditions: any[] = [eq(worklists.workspaceid, workspaceid)];

    if (status) {
      whereConditions.push(eq(worklists.status, status));
    }

    const worklistsData = await db
      .select()
      .from(worklists)
      .where(and(...whereConditions))
      .orderBy(desc(worklists.createdat));

    return NextResponse.json({ worklists: worklistsData });
  } catch (error) {
    console.error("Error fetching worklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklists" },
      { status: 500 }
    );
  }
}

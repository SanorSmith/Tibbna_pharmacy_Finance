/**
 * Test Results API Route
 * 
 * Provides CRUD operations for laboratory test results
 * Supports result entry, validation workflow, and status management
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { testResults, resultValidationHistory } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { createWorkspaceNotification } from "@/lib/notifications";
import { z } from "zod";

// Validation schema for test result creation
const testResultCreateSchema = z.object({
  sampleid: z.string().uuid(),
  accessionsampleid: z.string().uuid().optional(),
  worklistid: z.string().uuid().optional(),
  testcode: z.string().min(1),
  testname: z.string().min(1),
  resultvalue: z.string().min(1),
  resultnumeric: z.number().optional(),
  resulttext: z.string().optional(),
  resultcode: z.string().optional(),
  unit: z.string().optional(),
  referencemin: z.number().optional(),
  referencemax: z.number().optional(),
  referencerange: z.string().optional(),
  flag: z.string().optional(),
  isabormal: z.boolean().optional(),
  iscritical: z.boolean().optional(),
  interpretation: z.string().optional(),
  entrymethod: z.string().optional(),
  instrumentid: z.string().optional(),
  comment: z.string().optional(),
  techniciannotes: z.string().optional(),
  isqc: z.boolean().optional(),
  qclevel: z.string().optional(),
});

// GET /api/d/[workspaceid]/test-results - Get all results with filters
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
    const sampleid = searchParams.get("sampleid");
    const worklistid = searchParams.get("worklistid");
    const status = searchParams.get("status");
    const testcode = searchParams.get("testcode");
    const iscritical = searchParams.get("iscritical");
    const isabormal = searchParams.get("isabormal");

    const whereConditions: any[] = [eq(testResults.workspaceid, workspaceid)];

    if (sampleid) {
      whereConditions.push(eq(testResults.sampleid, sampleid));
    }

    if (worklistid) {
      whereConditions.push(eq(testResults.worklistid, worklistid));
    }

    if (status) {
      whereConditions.push(eq(testResults.status, status));
    }

    if (testcode) {
      whereConditions.push(eq(testResults.testcode, testcode));
    }

    if (iscritical === "true") {
      whereConditions.push(eq(testResults.iscritical, true));
    }

    if (isabormal === "true") {
      whereConditions.push(eq(testResults.isabormal, true));
    }

    const results = await db
      .select()
      .from(testResults)
      .where(and(...whereConditions))
      .orderBy(desc(testResults.createdat));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching test results:", error);
    return NextResponse.json(
      { error: "Failed to fetch test results" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/test-results - Create new result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Results entry has been removed from LIMS." },
    { status: 410 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { samples, validationStates, testResults } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

/**
 * GET /api/lims/worklist
 * Fetch samples pending clinical validation with filters
 * Server-side filtering for performance
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const analyzer = searchParams.get("analyzer");
    const testGroup = searchParams.get("testGroup");
    const abnormalOnly = searchParams.get("abnormalOnly") === "true";
    const criticalOnly = searchParams.get("criticalOnly") === "true";
    const status = searchParams.get("status");

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(samples.workspaceid, workspaceid)];

    if (startDate) {
      conditions.push(gte(samples.collectiondate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(samples.collectiondate, new Date(endDate)));
    }
    if (analyzer) {
      conditions.push(eq(samples.analyzer, analyzer));
    }
    if (testGroup) {
      conditions.push(eq(samples.testgroup, testGroup));
    }

    // Fetch samples with validation states and test results
    const samplesData = await db
      .select({
        sample: samples,
        validationState: validationStates,
      })
      .from(samples)
      .leftJoin(validationStates, eq(samples.sampleid, validationStates.sampleid))
      .where(and(...conditions))
      .orderBy(desc(samples.collectiondate));

    // Filter by validation status if specified
    let filteredSamples = samplesData;
    if (status) {
      filteredSamples = samplesData.filter(
        (s) => s.validationState?.currentstate === status
      );
    }

    // Fetch test results for each sample to apply abnormal/critical filters
    const enrichedSamples = await Promise.all(
      filteredSamples.map(async (item) => {
        const results = await db.query.testResults.findMany({
          where: eq(testResults.sampleid, item.sample.sampleid),
        });

        const hasCritical = results.some((r) => r.iscritical);
        const hasAbnormal = results.some((r) => r.flag !== "normal");

        return {
          ...item,
          results,
          hasCritical,
          hasAbnormal,
          criticalCount: results.filter((r) => r.iscritical).length,
          abnormalCount: results.filter((r) => r.flag !== "normal").length,
        };
      })
    );

    // Apply abnormal/critical filters
    let finalSamples = enrichedSamples;
    if (criticalOnly) {
      finalSamples = enrichedSamples.filter((s) => s.hasCritical);
    } else if (abnormalOnly) {
      finalSamples = enrichedSamples.filter((s) => s.hasAbnormal);
    }

    // Sort: Critical first
    finalSamples.sort((a, b) => {
      if (a.hasCritical && !b.hasCritical) return -1;
      if (!a.hasCritical && b.hasCritical) return 1;
      return 0;
    });

    return NextResponse.json({
      samples: finalSamples,
      total: finalSamples.length,
    });
  } catch (error) {
    console.error("[API] Error fetching worklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklist" },
      { status: 500 }
    );
  }
}

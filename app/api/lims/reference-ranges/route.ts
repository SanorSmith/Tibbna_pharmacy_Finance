/**
 * Test Reference Data API Route
 * Provides reference data (units, ranges) for laboratory tests
 * Updated to use database-driven system with fallback to static data
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { TEST_REFERENCE_DATA, getTestReferenceData, getTestReferenceDataByName } from "@/lib/test-reference-data";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// GET /api/d/[workspaceid]/test-reference - Get test reference data
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
    const testcode = searchParams.get("testcode");
    const testname = searchParams.get("testname");
    const agegroup = searchParams.get("agegroup") || "ALL";
    const sex = searchParams.get("sex") || "ANY";
    const useFallback = searchParams.get("fallback") === "true";

    // Try database first unless fallback is explicitly requested
    if (!useFallback) {
      try {
        if (testcode) {
          // Get specific test from database with age/sex filters (case-insensitive)
          const dbResults = await db
            .select()
            .from(testReferenceRanges)
            .where(
              and(
                eq(testReferenceRanges.workspaceid, workspaceid),
                sql`UPPER(${testReferenceRanges.testcode}) = UPPER(${testcode})`,
                eq(testReferenceRanges.agegroup, agegroup),
                eq(testReferenceRanges.sex, sex),
                eq(testReferenceRanges.isactive, "Y")
              )
            )
            .limit(1);

          if (dbResults.length > 0) {
            const result = dbResults[0];
            const referenceData = {
              testcode: result.testcode,
              testname: result.testname,
              unit: result.unit,
              referencemin: result.referencemin ? parseFloat(result.referencemin) : undefined,
              referencemax: result.referencemax ? parseFloat(result.referencemax) : undefined,
              referencerange: result.referencetext || 
                (result.referencemin && result.referencemax ? 
                  `${result.referencemin}-${result.referencemax} ${result.unit}` : undefined),
              category: result.category,
              agegroup: result.agegroup,
              sex: result.sex,
              paniclow: result.paniclow ? parseFloat(result.paniclow) : undefined,
              panichigh: result.panichigh ? parseFloat(result.panichigh) : undefined,
            };
            return NextResponse.json({ referenceData, source: "database" });
          }
          // No match found in database, return null to allow frontend fallback logic
          console.log(`No database match for ${testcode} with ${agegroup}/${sex}`);
          return NextResponse.json({ referenceData: null, source: "database" });
        }

        if (testname) {
          // Get by test name from database
          const dbResults = await db
            .select()
            .from(testReferenceRanges)
            .where(
              and(
                eq(testReferenceRanges.workspaceid, workspaceid),
                eq(testReferenceRanges.testname, testname),
                eq(testReferenceRanges.agegroup, agegroup),
                eq(testReferenceRanges.sex, sex),
                eq(testReferenceRanges.isactive, "Y")
              )
            )
            .limit(1);

          if (dbResults.length > 0) {
            const result = dbResults[0];
            const referenceData = {
              testcode: result.testcode,
              testname: result.testname,
              unit: result.unit,
              referencemin: result.referencemin ? parseFloat(result.referencemin) : undefined,
              referencemax: result.referencemax ? parseFloat(result.referencemax) : undefined,
              referencerange: result.referencetext || 
                (result.referencemin && result.referencemax ? 
                  `${result.referencemin}-${result.referencemax} ${result.unit}` : undefined),
              category: result.category,
              agegroup: result.agegroup,
              sex: result.sex,
              paniclow: result.paniclow ? parseFloat(result.paniclow) : undefined,
              panichigh: result.panichigh ? parseFloat(result.panichigh) : undefined,
            };
            return NextResponse.json({ referenceData, source: "database" });
          }
          // No match found for specific test name, return empty
          return NextResponse.json({ referenceData: null, source: "database" });
        }

        // Only return all database reference data if no specific test was requested
        const allDbResults = await db
          .select()
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.workspaceid, workspaceid),
              eq(testReferenceRanges.isactive, "Y")
            )
          )
          .orderBy(
            testReferenceRanges.category,
            testReferenceRanges.testcode,
            testReferenceRanges.agegroup,
            testReferenceRanges.sex
          );

        if (allDbResults.length > 0) {
          const referenceData = allDbResults.map(result => ({
            testcode: result.testcode,
            testname: result.testname,
            unit: result.unit,
            referencemin: result.referencemin ? parseFloat(result.referencemin) : undefined,
            referencemax: result.referencemax ? parseFloat(result.referencemax) : undefined,
            referencerange: result.referencetext || 
              (result.referencemin && result.referencemax ? 
                `${result.referencemin}-${result.referencemax} ${result.unit}` : undefined),
            category: result.category,
            agegroup: result.agegroup,
            sex: result.sex,
            paniclow: result.paniclow ? parseFloat(result.paniclow) : undefined,
            panichigh: result.panichigh ? parseFloat(result.panichigh) : undefined,
          }));
          return NextResponse.json({ 
            referenceData, 
            count: referenceData.length,
            source: "database"
          });
        }
      } catch (dbError) {
        console.warn("Database query failed, falling back to static data:", dbError);
        // Continue to fallback
      }
    }

    // Fallback to static data
    console.log("Using static test reference data fallback");
    
    if (testcode) {
      const referenceData = getTestReferenceData(testcode);
      if (!referenceData) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
      return NextResponse.json({ referenceData, source: "static" });
    }

    if (testname) {
      const referenceData = getTestReferenceDataByName(testname);
      if (!referenceData) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
      return NextResponse.json({ referenceData, source: "static" });
    }

    // Return all static reference data
    return NextResponse.json({ 
      referenceData: Object.values(TEST_REFERENCE_DATA),
      count: Object.keys(TEST_REFERENCE_DATA).length,
      source: "static"
    });
  } catch (error) {
    console.error("Error fetching test reference data:", error);
    return NextResponse.json(
      { error: "Failed to fetch test reference data" },
      { status: 500 }
    );
  }
}

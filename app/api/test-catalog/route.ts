import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");

    if (!workspaceid) {
      return NextResponse.json(
        { error: "Missing workspaceid" },
        { status: 400 }
      );
    }

    // Fetch all active test reference ranges
    const tests = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.isactive, "Y")
        )
      );

    // Group tests by lab type and create test packages
    const testsByLabType: Record<string, any[]> = {};
    const individualTests: Record<string, any> = {};

    tests.forEach((test) => {
      const labType = test.labtype || "General";
      
      if (!testsByLabType[labType]) {
        testsByLabType[labType] = [];
      }

      // Create individual test entry
      const testItem = {
        id: test.testcode.toLowerCase().replace(/\s+/g, "-"),
        name: test.testname,
        code: test.testcode,
        category: labType,
        material: test.sampletype || "Blood",
        unit: test.unit,
        referenceMin: test.referencemin,
        referenceMax: test.referencemax,
        referenceText: test.referencetext,
        panicLow: test.paniclow,
        panicHigh: test.panichigh,
        ageGroup: test.agegroup,
        sex: test.sex,
        groupTests: test.grouptests,
        sampleType: test.sampletype,
        containerType: test.containertype,
      };

      testsByLabType[labType].push(testItem);
      individualTests[testItem.id] = testItem;
    });

    // Create test packages based on group tests
    const testPackages: Record<string, any> = {};
    const groupedTests: Record<string, string[]> = {};

    tests.forEach((test) => {
      if (test.grouptests) {
        const groupName = test.grouptests;
        if (!groupedTests[groupName]) {
          groupedTests[groupName] = [];
        }
        groupedTests[groupName].push(test.testcode.toLowerCase().replace(/\s+/g, "-"));
      }
    });

    // Create packages from grouped tests
    Object.entries(groupedTests).forEach(([groupName, testCodes]) => {
      const packageId = groupName.toLowerCase().replace(/\s+/g, "-");
      const firstTest = tests.find(t => t.grouptests === groupName);
      
      testPackages[packageId] = {
        id: packageId,
        name: groupName,
        category: firstTest?.labtype || "General",
        description: `${testCodes.length} test${testCodes.length > 1 ? 's' : ''}`,
        tests: testCodes,
      };
    });

    // Create virtual "Standalone Tests" packages for tests without groups
    const standaloneTestsByLab: Record<string, string[]> = {};
    tests.forEach((test) => {
      if (!test.grouptests) {
        const labType = test.labtype || "General";
        if (!standaloneTestsByLab[labType]) {
          standaloneTestsByLab[labType] = [];
        }
        standaloneTestsByLab[labType].push(test.testcode.toLowerCase().replace(/\s+/g, "-"));
      }
    });

    // Add standalone test packages for each lab type
    Object.entries(standaloneTestsByLab).forEach(([labType, testCodes]) => {
      if (testCodes.length > 0) {
        const packageId = `${labType.toLowerCase().replace(/\s+/g, "-")}-standalone-tests`;
        testPackages[packageId] = {
          id: packageId,
          name: "Standalone Tests",
          category: labType,
          description: `${testCodes.length} test${testCodes.length > 1 ? 's' : ''}`,
          tests: testCodes,
          isStandalone: true,
        };
      }
    });

    // Create laboratory information
    const laboratories: Record<string, any> = {};
    const uniqueLabTypes = [...new Set(tests.map(t => t.labtype).filter(Boolean))];

    uniqueLabTypes.forEach((labType) => {
      const labId = labType!.toLowerCase().replace(/\s+/g, "-");
      laboratories[labId] = {
        id: labId,
        name: labType,
        address: "Laboratory Department",
        phone: "(555) 123-4567",
        email: `${labId}@hospital.com`,
        specialties: [...new Set(tests.filter(t => t.labtype === labType).map(t => t.grouptests).filter(Boolean))],
        turnaround: "Routine: 24-48 hours, STAT: 4-6 hours",
      };
    });

    return NextResponse.json({
      success: true,
      testPackages,
      individualTests,
      laboratories,
      testsByLabType,
      totalTests: tests.length,
    });
  } catch (error) {
    console.error("Error fetching test catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch test catalog", details: String(error) },
      { status: 500 }
    );
  }
}

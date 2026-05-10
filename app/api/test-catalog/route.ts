import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/tables/lims-order";
import { eq, and } from "drizzle-orm";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");

    if (!workspaceid) {
      return NextResponse.json({ error: "Missing workspaceid" }, { status: 400 });
    }

    // Fetch all active tests from the admin-managed catalog
    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(and(eq(labTestCatalog.workspaceid, workspaceid), eq(labTestCatalog.isactive, true)));

    // ── Individual tests ────────────────────────────────────────────────────
    // Use testcode slug as the stable ID so the order form can resolve codes
    const individualTests: Record<string, any> = {};
    const testsByLabType: Record<string, any[]> = {};

    tests.forEach((test) => {
      const id = slug(test.testcode);
      const item = {
        id,
        name: test.testname,
        code: test.testcode,
        category: test.testcategory,
        material: test.specimentype,
        description: test.testdescription,
        snomedCode: test.snomedcode,
        loincCode: test.loinccode,
        fastingRequired: test.fastingrequired ?? false,
        turnaroundTime: test.turnaroundtime,
        specimenVolume: test.specimenvolume,
        containerType: test.specimencontainer,
      };
      individualTests[id] = item;

      if (!testsByLabType[test.testcategory]) testsByLabType[test.testcategory] = [];
      testsByLabType[test.testcategory].push(item);
    });

    // ── Test packages ────────────────────────────────────────────────────────
    // Panel-based packages (tests with testpanel set)
    const panelMap: Record<string, { category: string; panelName: string; testIds: string[] }> = {};
    tests.forEach((test) => {
      if (test.testpanel) {
        const key = `${test.testcategory}::${test.testpanel}`;
        if (!panelMap[key]) {
          panelMap[key] = { category: test.testcategory, panelName: test.testpanel, testIds: [] };
        }
        panelMap[key].testIds.push(slug(test.testcode));
      }
    });

    const testPackages: Record<string, any> = {};
    Object.values(panelMap).forEach(({ category, panelName, testIds }) => {
      const pkgId = `${slug(category)}-${slug(panelName)}`;
      testPackages[pkgId] = {
        id: pkgId,
        name: panelName,
        category,
        description: `${testIds.length} test${testIds.length !== 1 ? "s" : ""}`,
        tests: testIds,
      };
    });

    // Standalone packages per category (tests with no testpanel)
    const standaloneByCategory: Record<string, string[]> = {};
    tests.forEach((test) => {
      if (!test.testpanel) {
        if (!standaloneByCategory[test.testcategory]) standaloneByCategory[test.testcategory] = [];
        standaloneByCategory[test.testcategory].push(slug(test.testcode));
      }
    });
    Object.entries(standaloneByCategory).forEach(([category, testIds]) => {
      const pkgId = `${slug(category)}-standalone-tests`;
      testPackages[pkgId] = {
        id: pkgId,
        name: `${category} — Individual Tests`,
        category,
        description: `${testIds.length} test${testIds.length !== 1 ? "s" : ""}`,
        tests: testIds,
        isStandalone: true,
      };
    });

    // ── Laboratories ─────────────────────────────────────────────────────────
    const laboratories: Record<string, any> = {};
    const uniqueCategories = [...new Set(tests.map((t) => t.testcategory))];
    uniqueCategories.forEach((category) => {
      const labId = slug(category);
      const catTests = tests.filter((t) => t.testcategory === category);
      laboratories[labId] = {
        id: labId,
        name: category,
        address: "Laboratory Department",
        phone: "(555) 123-4567",
        email: `${labId}@hospital.com`,
        specialties: [...new Set(catTests.map((t) => t.testpanel).filter(Boolean))],
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

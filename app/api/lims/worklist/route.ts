import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, validationStates, testResults, limsOrders, patients, limsOrderTests, labTestCatalog, worklists, worklistItems } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

/**
 * GET /api/lims/worklist
 * Fetch worklists or samples pending clinical validation with filters
 * - If mode=list: Returns list of worklists
 * - Otherwise: Returns samples with validation data (legacy mode)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const mode = searchParams.get("mode"); // 'list' for worklist listing
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

    // If mode=list, return worklists instead of samples
    if (mode === "list") {
      const worklistsData = await db
        .select({
          worklistid: worklists.worklistid,
          worklistname: worklists.worklistname,
          worklisttype: worklists.worklisttype,
          department: worklists.department,
          analyzer: worklists.analyzer,
          priority: worklists.priority,
          status: worklists.status,
          description: worklists.description,
          createdat: worklists.createdat,
          createdby: worklists.createdby,
          createdbyname: worklists.createdbyname,
          assignedto: worklists.assignedto,
          assignedtoname: worklists.assignedtoname,
          completedat: worklists.completedat,
        })
        .from(worklists)
        .where(eq(worklists.workspaceid, workspaceid))
        .orderBy(desc(worklists.createdat));

      // Get sample count for each worklist
      const enrichedWorklists = await Promise.all(
        worklistsData.map(async (worklist) => {
          const items = await db
            .select()
            .from(worklistItems)
            .where(eq(worklistItems.worklistid, worklist.worklistid));
          
          return {
            ...worklist,
            samplecount: items.length,
          };
        })
      );

      return NextResponse.json({
        worklists: enrichedWorklists,
        total: enrichedWorklists.length,
      });
    }

    // Build query conditions
    const conditions = [eq(accessionSamples.workspaceid, workspaceid)];

    if (startDate) {
      conditions.push(gte(accessionSamples.collectiondate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(accessionSamples.collectiondate, new Date(endDate)));
    }

    // Fetch samples with validation states, orders, and patient data
    const samplesData = await db
      .select({
        sample: accessionSamples,
        validationState: validationStates,
        order: limsOrders,
        // Patient information
        patientName: sql<string>`COALESCE(CONCAT(${patients.firstname}, ' ', ${patients.lastname}), ${accessionSamples.subjectidentifier})`.as('patientName'),
        patientage: sql<number>`COALESCE(EXTRACT(YEAR FROM AGE(${patients.dateofbirth})), null)`.as('patientage'),
        patientsex: sql<string>`COALESCE(${patients.gender}, null)`.as('patientsex'),
      })
      .from(accessionSamples)
      .leftJoin(validationStates, eq(accessionSamples.sampleid, validationStates.sampleid))
      .leftJoin(limsOrders, sql`${accessionSamples.orderid}::uuid = ${limsOrders.orderid}`)
      .leftJoin(patients, sql`${accessionSamples.patientid}::uuid = ${patients.patientid}`)
      .where(and(...conditions))
      .orderBy(desc(accessionSamples.collectiondate));

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

        // Get analyzer from first test result
        const analyzer = results.length > 0 ? results[0].instrumentid || 'Manual' : 'Manual';
        
        // Get test group from first test result's test category
        let testgroup = 'General Laboratory';
        if (results.length > 0) {
          const testCode = results[0].testcode;
          
          // Try to get test category from test catalog using test code
          const firstTest = await db
            .select({ testcategory: labTestCatalog.testcategory })
            .from(labTestCatalog)
            .where(eq(labTestCatalog.testcode, testCode))
            .limit(1);
          
          if (firstTest.length > 0 && firstTest[0].testcategory) {
            testgroup = firstTest[0].testcategory;
          } else {
            // Comprehensive fallback logic for all test patterns
            const upperTestCode = testCode.toUpperCase();
            
            // Hematology tests
            if (['HCT', 'RBC', 'MCH', 'HGB', 'WBC', 'PLT', 'MCV', 'MCHC', 'RDW', 'MPV', 'PDW', 'PCT'].includes(upperTestCode)) {
              testgroup = 'Hematology';
            }
            // Biochemistry tests
            else if (['BUN', 'CRE', 'NA', 'K', 'CL', 'CO2', 'GLU', 'CA', 'PHOS', 'MG', 'ALB', 'TP', 'AST', 'ALT', 'ALP', 'GGT', 'BIL', 'CHOL', 'TRIG', 'HDL', 'LDL', 'URIC'].includes(upperTestCode)) {
              testgroup = 'Biochemistry';
            }
            // Endocrinology tests
            else if (['TSH', 'T3', 'T4', 'FT3', 'FT4', 'INSULIN', 'C-PEPTIDE', 'HBA1C'].includes(upperTestCode)) {
              testgroup = 'Endocrinology';
            }
            // Urinalysis tests
            else if (upperTestCode.includes('URINE') || ['UA', 'UPRO', 'UCR', 'UMCR', 'UALB', 'UACR'].includes(upperTestCode)) {
              testgroup = 'Urinalysis';
            }
            // Microbiology tests
            else if (upperTestCode.includes('STOOL') || upperTestCode.includes('CULTURE') || upperTestCode.includes('SMEAR') || upperTestCode.includes('GRAM')) {
              testgroup = 'Microbiology';
            }
            // Serology/Immunology tests
            else if (upperTestCode.includes('HIV') || upperTestCode.includes('HBV') || upperTestCode.includes('HCV') || upperTestCode.includes('VDRL') || upperTestCode.includes('RPR')) {
              testgroup = 'Serology';
            }
            // Hormone tests
            else if (upperTestCode.includes('HORMONE') || upperTestCode.includes('LH') || upperTestCode.includes('FSH') || upperTestCode.includes('PROLACTIN') || upperTestCode.includes('ESTRADIOL')) {
              testgroup = 'Hormone';
            }
            // Coagulation tests
            else if (['PT', 'INR', 'APTT', 'FIBRINOGEN', 'D-DIMER'].includes(upperTestCode)) {
              testgroup = 'Coagulation';
            }
            // Cardiac markers
            else if (['CK', 'CKMB', 'TROPONIN', 'BNP', 'NT-PROBNP'].includes(upperTestCode)) {
              testgroup = 'Cardiac Markers';
            }
            // Tumor markers
            else if (upperTestCode.includes('AFP') || upperTestCode.includes('CEA') || upperTestCode.includes('CA19') || upperTestCode.includes('CA125') || upperTestCode.includes('PSA')) {
              testgroup = 'Tumor Markers';
            }
            // Blood gas
            else if (upperTestCode.includes('BLOOD GAS') || upperTestCode.includes('ABG') || ['PH', 'PO2', 'PCO2', 'HCO3'].includes(upperTestCode)) {
              testgroup = 'Blood Gas';
            }
            // Toxicology
            else if (upperTestCode.includes('TOXIC') || upperTestCode.includes('DRUG') || upperTestCode.includes('ALCOHOL')) {
              testgroup = 'Toxicology';
            }
            // All other tests
            else {
              testgroup = 'General Laboratory';
            }
          }
        }
        
        return {
          sample: {
            ...item.sample,
            priority: item.order?.priority || 'ROUTINE',
            testgroup: testgroup,
            analyzer: analyzer,
            // Add patient demographics
            patientName: item.patientName,
            patientage: item.patientage,
            patientsex: item.patientsex,
          },
          validationState: item.validationState,
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

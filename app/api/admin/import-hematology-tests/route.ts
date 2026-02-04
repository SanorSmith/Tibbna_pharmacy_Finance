import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { workspaceid, userid } = await request.json();

    if (!workspaceid || !userid) {
      return NextResponse.json(
        { error: "Missing workspaceid or userid" },
        { status: 400 }
      );
    }

    // Hematology standalone tests (no test group/panel)
    const hematologyTests = [
      { testname: "Complete blood count & Differential", testcode: "CBC", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Erythrocyte sedimentation rate", testcode: "ESR", sampletype: "Whole blood", containertype: "ESR tube", unit: "mm/hr" },
      { testname: "Blood Film", testcode: "Blood Film", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "CBC & Blood Film", testcode: "CBC & Blood Film", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Reticulocyte counting", testcode: "Retic", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "%" },
      { testname: "Sickling test", testcode: "Sickling test", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Malaria Test", testcode: "Malaria test", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Prothrombin time", testcode: "PT &INR", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "sec" },
      { testname: "Partial thromboplastin time", testcode: "PTT", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "sec" },
      { testname: "Plasma Fibrinogen", testcode: "Fibrinogen", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "mg/dL" },
      { testname: "Blood group&Rh", testcode: "Blood group&Rh", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Cross match", testcode: "Cross match", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Whole blood", testcode: "Whole blood", sampletype: "Whole blood", containertype: "Blood bag", unit: "Unit" },
      { testname: "Packed RBC", testcode: "Packed RBC", sampletype: "Packed RBC", containertype: "Blood bag", unit: "Unit" },
      { testname: "Plasma", testcode: "Plasma", sampletype: "Plasma", containertype: "Blood bag", unit: "Unit" },
      { testname: "Cryoprecipitate", testcode: "Cryoprecipitate", sampletype: "Cryoprecipitate", containertype: "Blood bag", unit: "Unit" },
      { testname: "Platelets", testcode: "Platelets", sampletype: "Platelets", containertype: "Blood bag", unit: "Unit" },
      { testname: "Glucose-6-phosphate dehydrogenase Titer", testcode: "G6PD Titer", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "U/g Hb" },
      { testname: "Glucose-6-phosphate dehydrogenase Screen", testcode: "G6PD Screen", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Direct coomb test", testcode: "Direct coomb test", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Indirect coomb test", testcode: "Indirect coomb test", sampletype: "Serum", containertype: "SST tube", unit: "N/A" },
      { testname: "Rh Ab titer", testcode: "Rh Ab titer", sampletype: "Serum", containertype: "SST tube", unit: "N/A" },
      { testname: "Anti-thrombin III", testcode: "AT3", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "%" },
      { testname: "Protein C", testcode: "PROT-C", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "%" },
      { testname: "Protein S", testcode: "PROT-S", sampletype: "Plasma Sodium citrate", containertype: "Sodium citrate tube", unit: "%" },
      { testname: "Lupus erythematosus preparation", testcode: "LE cell preparation", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Hemoglobin H preparation", testcode: "Hemoglobin H preparation", sampletype: "Whole blood EDTA", containertype: "EDTA tube", unit: "N/A" },
      { testname: "Bleeding Time", testcode: "BT", sampletype: "Whole Blood", containertype: "N/A", unit: "min" },
      { testname: "Clotting Time", testcode: "CT", sampletype: "Whole Blood", containertype: "N/A", unit: "min" },
    ];

    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const added: string[] = [];

    for (const test of hematologyTests) {
      try {
        // Check if test already exists
        const existingTests = await db
          .select()
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.testcode, test.testcode),
              eq(testReferenceRanges.workspaceid, workspaceid)
            )
          );

        if (existingTests.length > 0) {
          // Update existing test
          await db
            .update(testReferenceRanges)
            .set({
              testname: test.testname,
              sampletype: test.sampletype,
              containertype: test.containertype,
              unit: test.unit,
              labtype: "Hematology",
              grouptests: null, // No test group for standalone tests
              updatedby: userid,
            })
            .where(
              and(
                eq(testReferenceRanges.testcode, test.testcode),
                eq(testReferenceRanges.workspaceid, workspaceid)
              )
            );
          updatedCount++;
        } else {
          // Insert new test
          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: test.testcode,
            testname: test.testname,
            unit: test.unit,
            agegroup: "ALL",
            sex: "ANY",
            labtype: "Hematology",
            grouptests: null, // No test group for standalone tests
            sampletype: test.sampletype,
            containertype: test.containertype,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: null,
            referencetext: "Within normal limits",
            referencemin: null,
            referencemax: null,
            paniclow: null,
            panichigh: null,
            panictext: null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          added.push(`${test.testcode}: ${test.testname}`);
        }
      } catch (error) {
        console.error(`Error importing test ${test.testcode}:`, error);
        errors.push(`Failed to import ${test.testcode}: ${error}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} new tests, updated ${updatedCount} existing tests`,
      successCount,
      updatedCount,
      errorCount,
      added: added.slice(0, 50),
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Error importing hematology tests:", error);
    return NextResponse.json(
      { error: "Failed to import hematology tests", details: String(error) },
      { status: 500 }
    );
  }
}

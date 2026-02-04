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

    // Histopathology standalone tests - all tissue/specimen based
    const histopathologyTests = [
      { testname: "Thyroid gland", testcode: "Thyroid gland", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Lung branch scope", testcode: "Lung branch scope", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Brain", testcode: "Brain", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Breast mass", testcode: "Breast mass", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Mastectomy", testcode: "Mastectomy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Salivary gland", testcode: "Salivary gland", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Skin", testcode: "Skin", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Bone", testcode: "Bone", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Spleen", testcode: "Spleen", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Appendix", testcode: "Appendix", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Testis", testcode: "Testis", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Colon", testcode: "Colon", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Colonoscopy", testcode: "Colonoscopy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Lymph-node", testcode: "Lymph-node", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Discectomy- Iaminectomy", testcode: "Discectomy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Duodenal", testcode: "Duodenal", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Prostatectomy", testcode: "Prostatectomy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Prostatic chips", testcode: "Prostatic chips", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Cyst-ovary", testcode: "Cyst-ovary", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Uterus", testcode: "Uterus", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Uterus with ovary", testcode: "Uterus with ovary", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Product of gestation", testcode: "Product of gestation", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "D& C", testcode: "D& C", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Polyp", testcode: "Polyp", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Pap Smear", testcode: "Pap Smear", sampletype: "Cytology", containertype: "Cytology slide", unit: "N/A" },
      { testname: "C.S.F Cytology", testcode: "CSF Cytology", sampletype: "CSF", containertype: "Sterile container", unit: "N/A" },
      { testname: "Kidney", testcode: "Kidney", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Gall bladder", testcode: "Gall bladder", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Corpectomy", testcode: "Corpectomy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Soft tissue", testcode: "Soft tissue", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Tissue Tumer marker", testcode: "Tissue Tumor marker", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Muscles(bx)", testcode: "Muscles bx", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Sinus", testcode: "Sinus", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "core biopsy (liver)", testcode: "Core biopsy liver", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Ovary with tube", testcode: "Ovary with tube", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "F.N.A.C", testcode: "FNAC", sampletype: "Cytology", containertype: "Cytology slide", unit: "N/A" },
      { testname: "Endoscopic (bx)", testcode: "Endoscopic bx", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Gynecomastia", testcode: "Gynecomastia", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Slide review", testcode: "Slide review", sampletype: "Slide", containertype: "Slide box", unit: "N/A" },
      { testname: "Fibroid", testcode: "Fibroid", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Hemicolectomy", testcode: "Hemicolectomy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Femur", testcode: "Femur", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Ulcerity mass", testcode: "Ulcerity mass", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Ectopic pregnancy", testcode: "Ectopic pregnancy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Abortion", testcode: "Abortion", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Urinary bladder", testcode: "Urinary bladder", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Cell block", testcode: "Cell block", sampletype: "Cytology", containertype: "Formalin container", unit: "N/A" },
      { testname: "Mass", testcode: "Mass", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Neak mass", testcode: "Neck mass", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Endometriosis", testcode: "Endometriosis", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Tissue &bone", testcode: "Tissue & bone", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Hernia", testcode: "Hernia", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Nasal papilloma", testcode: "Nasal papilloma", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Endometrial biopsy", testcode: "Endometrial biopsy", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
      { testname: "Special Stains", testcode: "Special Stains", sampletype: "Tissue", containertype: "Formalin container", unit: "N/A" },
    ];

    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const added: string[] = [];

    for (const test of histopathologyTests) {
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
              labtype: "Histopathology",
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
            labtype: "Histopathology",
            grouptests: null, // No test group for standalone tests
            sampletype: test.sampletype,
            containertype: test.containertype,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: null,
            referencetext: "Histopathological examination",
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
    console.error("Error importing histopathology tests:", error);
    return NextResponse.json(
      { error: "Failed to import histopathology tests", details: String(error) },
      { status: 500 }
    );
  }
}

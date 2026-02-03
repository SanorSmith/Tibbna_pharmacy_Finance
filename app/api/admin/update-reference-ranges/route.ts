import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

interface ReferenceRangeUpdate {
  testcode: string;
  referencemin?: string;
  referencemax?: string;
  referencetext?: string;
  agegroup?: string;
  sex?: string;
}

// Comprehensive reference ranges for all quantitative tests
const referenceRanges: ReferenceRangeUpdate[] = [
  // ENDOCRINOLOGY - Additional tests needing ranges
  { testcode: "TMA", referencemin: "0", referencemax: "35", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rev T3", referencemin: "10", referencemax: "24", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TRAb", referencemin: "0", referencemax: "1.75", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T3 ut", referencemin: "25", referencemax: "35", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TBG", referencemin: "12", referencemax: "28", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FTI", referencemin: "4.5", referencemax: "12.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FE2", referencemin: "0.5", referencemax: "2.0", agegroup: "ADULT", sex: "F" },
  { testcode: "FTEST", referencemin: "50", referencemax: "210", agegroup: "ADULT", sex: "M" },
  { testcode: "FTEST", referencemin: "1.0", referencemax: "8.5", agegroup: "ADULT", sex: "F" },
  { testcode: "Androg", referencemin: "0.3", referencemax: "3.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GA", referencemin: "0", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DHEA s", referencemin: "80", referencemax: "560", agegroup: "ADULT", sex: "M" },
  { testcode: "DHEA s", referencemin: "35", referencemax: "430", agegroup: "ADULT", sex: "F" },
  { testcode: "Renin", referencemin: "0.5", referencemax: "3.3", agegroup: "ADULT", sex: "ANY" },
  { testcode: "17-OHPROG", referencemin: "0.2", referencemax: "3.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cortisol in urine", referencemin: "10", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CT", referencemin: "0", referencemax: "8.4", agegroup: "ADULT", sex: "M" },
  { testcode: "CT", referencemin: "0", referencemax: "5.0", agegroup: "ADULT", sex: "F" },
  { testcode: "BGP", referencemin: "11", referencemax: "43", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GH", referencemin: "0", referencemax: "10", agegroup: "ADULT", sex: "ANY" },
  
  // BIOCHEMISTRY - Additional tests needing ranges
  { testcode: "Pro-insulin", referencemin: "0", referencemax: "11", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GAD65", referencemin: "0", referencemax: "5", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IGF-I", referencemin: "115", referencemax: "307", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IR HOMA", referencemin: "0", referencemax: "2.5", agegroup: "ADULT", sex: "ANY" },
  { testcode: "OGTT", referencemin: "70", referencemax: "140", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Trop I screen", referencemin: "0", referencemax: "0.04", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CRE", referencemin: "0.6", referencemax: "1.1", agegroup: "ADULT", sex: "F" },
  { testcode: "UA", referencemin: "2.6", referencemax: "6.0", agegroup: "ADULT", sex: "F" },
  { testcode: "Electrolyte Na-K-Cl", referencetext: "Na 136-145, K 3.5-5.0, Cl 98-107 mmol/L", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Electrolyte Na-K-Ca", referencetext: "Na 136-145, K 3.5-5.0, Ca 8.5-10.5 mmol/L", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CU", referencemin: "70", referencemax: "140", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CPK-MB", referencemin: "0", referencemax: "25", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CPK", referencemin: "30", referencemax: "200", agegroup: "ADULT", sex: "M" },
  { testcode: "CPK", referencemin: "25", referencemax: "170", agegroup: "ADULT", sex: "F" },
  { testcode: "Globulin", referencemin: "2.0", referencemax: "3.5", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Zn", referencemin: "70", referencemax: "120", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine cortisol", referencemin: "10", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine copper", referencemin: "0", referencemax: "40", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine creatinine", referencemin: "1.0", referencemax: "2.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine Amylase", referencemin: "0", referencemax: "650", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine calcium", referencemin: "100", referencemax: "300", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine chloride", referencemin: "110", referencemax: "250", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine magnesium", referencemin: "73", referencemax: "122", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine phosphorus", referencemin: "400", referencemax: "1300", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine potassium", referencemin: "25", referencemax: "125", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine sodium", referencemin: "40", referencemax: "220", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine uric acid", referencemin: "250", referencemax: "750", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine oxalic acid", referencemin: "0", referencemax: "40", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine Citrate", referencemin: "320", referencemax: "1240", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Micro albuminuria", referencemin: "0", referencemax: "30", agegroup: "ADULT", sex: "ANY" },
  { testcode: "VMA", referencemin: "0", referencemax: "7", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fructose seminal", referencemin: "120", referencemax: "450", agegroup: "ADULT", sex: "M" },
  { testcode: "CrCL", referencemin: "90", referencemax: "120", agegroup: "ADULT", sex: "ANY" },
  
  // HEMATOLOGY - Additional tests needing ranges
  { testcode: "BT", referencemin: "2", referencemax: "7", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CT", referencemin: "5", referencemax: "11", agegroup: "ADULT", sex: "ANY" },
  { testcode: "G6PD Titer", referencemin: "8.8", referencemax: "13.4", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1 by HPLC", referencemin: "4.0", referencemax: "5.6", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1c by capillary's Electrophoresis", referencemin: "4.0", referencemax: "5.6", agegroup: "ADULT", sex: "ANY" },
  
  // IMMUNOLOGY - Additional tests needing ranges
  { testcode: "ACL IgG", referencemin: "0", referencemax: "15", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ACL IgM", referencemin: "0", referencemax: "12", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APL IgG", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APL IgM", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ttg IgG", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ttg IgA", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AGA IgG", referencemin: "0", referencemax: "25", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AGA IgA", referencemin: "0", referencemax: "25", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Transferrin", referencemin: "200", referencemax: "360", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Beta 2GP IgM", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Beta 2GP IgG", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APO A1", referencemin: "120", referencemax: "160", agegroup: "ADULT", sex: "M" },
  { testcode: "APO A1", referencemin: "140", referencemax: "180", agegroup: "ADULT", sex: "F" },
  { testcode: "APO B", referencemin: "60", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "f-PSA", referencemin: "0", referencemax: "4.0", agegroup: "ADULT", sex: "M" },
  { testcode: "PAP", referencemin: "0", referencemax: "3.0", agegroup: "ADULT", sex: "M" },
  { testcode: "Calprotectin", referencemin: "0", referencemax: "50", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Lactoferrin", referencemin: "0", referencemax: "7.25", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-CCP", referencemin: "0", referencemax: "20", agegroup: "ADULT", sex: "ANY" },
  
  // SEROLOGY - Additional tests needing ranges
  { testcode: "ASOT titer", referencemin: "0", referencemax: "200", agegroup: "ADULT", sex: "ANY" },
  { testcode: "RF", referencemin: "0", referencemax: "14", agegroup: "ADULT", sex: "ANY" },
  
  // Body Fluid Tests - Additional ranges
  { testcode: "Pleural Sugar", referencemin: "60", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pleural Protein", referencemin: "0", referencemax: "3.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Pleural", referencemin: "0", referencemax: "1000", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Ascitic", referencemin: "0", referencemax: "500", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Synovial Sugar", referencemin: "50", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Synovial Protein", referencemin: "0", referencemax: "3.0", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Synovial", referencemin: "0", referencemax: "200", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Peritoneal", referencemin: "0", referencemax: "100", agegroup: "ADULT", sex: "ANY" },
];

export async function POST() {
  try {
    let updated = 0;
    const errors: string[] = [];

    // Update tests with specific numeric ranges
    for (const data of referenceRanges) {
      try {
        const result = await db
          .update(testReferenceRanges)
          .set({
            referencemin: data.referencemin,
            referencemax: data.referencemax,
            referencetext: data.referencetext,
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(
            and(
              eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
              eq(testReferenceRanges.testcode, data.testcode),
              eq(testReferenceRanges.agegroup, data.agegroup || "ADULT"),
              eq(testReferenceRanges.sex, data.sex || "ANY")
            )
          )
          .returning();

        if (result.length > 0) {
          updated++;
          if (updated % 20 === 0) {
            console.log(`✅ Updated ${updated} test reference ranges...`);
          }
        }
      } catch (error) {
        errors.push(`${data.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Now update any remaining tests with "Within normal limits" to have better reference text
    const testsToUpdate = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          eq(testReferenceRanges.referencetext, "Within normal limits")
        )
      );

    let textUpdated = 0;
    for (const test of testsToUpdate) {
      try {
        let newReferenceText = "Within normal limits";
        
        // Update based on lab type
        if (test.labtype === "Microbiology") {
          if (test.testname?.toLowerCase().includes("culture") || test.testname?.toLowerCase().includes("c/s")) {
            newReferenceText = "No growth or normal flora";
          } else if (test.testname?.toLowerCase().includes("gram stain")) {
            newReferenceText = "No organisms seen";
          } else if (test.testname?.toLowerCase().includes("afb")) {
            newReferenceText = "No acid-fast bacilli seen";
          }
        } else if (test.labtype === "Histopathology") {
          newReferenceText = "Benign tissue or normal histology";
        } else if (test.labtype === "Molecular Biology") {
          newReferenceText = "Not detected or negative";
        } else if (test.labtype === "Serology") {
          newReferenceText = "Negative or non-reactive";
        }

        if (newReferenceText !== "Within normal limits") {
          await db
            .update(testReferenceRanges)
            .set({
              referencetext: newReferenceText,
              updatedby: USER_ID,
              updatedat: new Date(),
            })
            .where(eq(testReferenceRanges.rangeid, test.rangeid));
          textUpdated++;
        }
      } catch (error) {
        errors.push(`Text update ${test.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} tests with numeric ranges, ${textUpdated} tests with improved reference text`,
      numericRangesUpdated: updated,
      textUpdated,
      totalUpdates: updated + textUpdated,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Reference range update error:", error);
    return NextResponse.json(
      { error: "Failed to update reference ranges", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

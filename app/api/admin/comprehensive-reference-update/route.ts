import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

export async function POST() {
  try {
    let updated = 0;
    const errors: string[] = [];

    // Get all tests
    const allTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, WORKSPACE_ID));

    for (const test of allTests) {
      try {
        let needsUpdate = false;
        const updates: any = {
          updatedby: USER_ID,
          updatedat: new Date(),
        };

        // If test has numeric min/max but no referencetext, create one
        if (test.referencemin && test.referencemax && !test.referencetext) {
          updates.referencetext = `${test.referencemin}-${test.referencemax} ${test.unit || ''}`.trim();
          needsUpdate = true;
        }

        // If test has "Within normal limits" and is quantitative, try to add ranges
        if (test.referencetext === "Within normal limits") {
          const labtype = test.labtype || "";
          const testname = test.testname?.toLowerCase() || "";
          
          // Keep qualitative tests as text-based
          if (labtype === "Microbiology") {
            if (testname.includes("culture") || testname.includes("c/s")) {
              updates.referencetext = "No growth or normal flora";
              needsUpdate = true;
            } else if (testname.includes("gram stain")) {
              updates.referencetext = "No organisms seen or normal flora";
              needsUpdate = true;
            } else if (testname.includes("afb") || testname.includes("acid fast")) {
              updates.referencetext = "No acid-fast bacilli seen";
              needsUpdate = true;
            } else if (testname.includes("cell") && testname.includes("count")) {
              updates.referencetext = "Normal cell count";
              needsUpdate = true;
            } else if (testname.includes("differential") || testname.includes("diff")) {
              updates.referencetext = "Normal differential pattern";
              needsUpdate = true;
            } else {
              updates.referencetext = "Negative or normal";
              needsUpdate = true;
            }
          } else if (labtype === "Histopathology") {
            updates.referencetext = "Benign tissue or normal histology";
            needsUpdate = true;
          } else if (labtype === "Molecular Biology") {
            if (testname.includes("pcr") || testname.includes("viral load")) {
              updates.referencetext = "Not detected or negative";
              needsUpdate = true;
            } else if (testname.includes("genotype")) {
              updates.referencetext = "Genotype identification";
              needsUpdate = true;
            } else {
              updates.referencetext = "Not detected";
              needsUpdate = true;
            }
          } else if (labtype === "Serology") {
            if (testname.includes("igg") || testname.includes("igm")) {
              updates.referencetext = "Negative or non-reactive";
              needsUpdate = true;
            } else if (testname.includes("screen")) {
              updates.referencetext = "Negative";
              needsUpdate = true;
            } else if (testname.includes("titer")) {
              updates.referencetext = "Non-reactive or negative";
              needsUpdate = true;
            } else {
              updates.referencetext = "Negative or non-reactive";
              needsUpdate = true;
            }
          } else if (labtype === "Immunology") {
            if (testname.includes("antibody") || testname.includes("ab")) {
              updates.referencetext = "Negative or within normal limits";
              needsUpdate = true;
            } else if (testname.includes("antigen") || testname.includes("ag")) {
              updates.referencetext = "Negative";
              needsUpdate = true;
            }
          }
        }

        // Update if needed
        if (needsUpdate) {
          await db
            .update(testReferenceRanges)
            .set(updates)
            .where(eq(testReferenceRanges.rangeid, test.rangeid));
          updated++;
          
          if (updated % 50 === 0) {
            console.log(`✅ Updated ${updated} test references...`);
          }
        }
      } catch (error) {
        errors.push(`${test.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Comprehensive update completed: ${updated} tests updated with improved reference ranges`,
      updated,
      totalTests: allTests.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Comprehensive update error:", error);
    return NextResponse.json(
      { error: "Failed to update references", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

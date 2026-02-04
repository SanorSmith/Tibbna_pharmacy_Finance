import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

// Generic medical reference data templates by lab type
const getBodySiteByLabType = (labtype: string, testname: string): string => {
  if (labtype === "Microbiology") {
    if (testname.toLowerCase().includes("urine")) return "Midstream urine";
    if (testname.toLowerCase().includes("blood")) return "Venous blood";
    if (testname.toLowerCase().includes("stool")) return "Stool";
    if (testname.toLowerCase().includes("sputum")) return "Sputum";
    if (testname.toLowerCase().includes("csf") || testname.toLowerCase().includes("cerebrospinal")) return "Cerebrospinal fluid";
    if (testname.toLowerCase().includes("wound")) return "Wound";
    if (testname.toLowerCase().includes("swab")) return "Swab";
    if (testname.toLowerCase().includes("abscess")) return "Abscess fluid";
    if (testname.toLowerCase().includes("pleural")) return "Pleural fluid";
    if (testname.toLowerCase().includes("ascitic")) return "Ascitic fluid";
    if (testname.toLowerCase().includes("synovial")) return "Synovial fluid";
    if (testname.toLowerCase().includes("peritoneal")) return "Peritoneal fluid";
    if (testname.toLowerCase().includes("seminal")) return "Seminal fluid";
    return "Clinical specimen";
  }
  if (labtype === "Histopathology") return "Tissue biopsy";
  if (labtype === "Molecular Biology") return "Venous blood or clinical specimen";
  return "Venous blood";
};

const getClinicalIndicationByLabType = (labtype: string, testname: string): string => {
  if (labtype === "Microbiology") {
    if (testname.toLowerCase().includes("culture") || testname.toLowerCase().includes("c/s")) {
      return "Bacterial infection; pathogen identification; antibiotic susceptibility testing; infection control; empiric therapy guidance";
    }
    if (testname.toLowerCase().includes("gram stain")) {
      return "Rapid bacterial detection; preliminary identification; empiric antibiotic selection; infection diagnosis";
    }
    if (testname.toLowerCase().includes("afb") || testname.toLowerCase().includes("acid fast")) {
      return "Mycobacterial infection; tuberculosis; atypical mycobacteria; chronic infection";
    }
    if (testname.toLowerCase().includes("fungal")) {
      return "Fungal infection; mycosis; opportunistic infection; immunocompromised patients";
    }
    return "Infectious disease diagnosis; pathogen identification; infection management";
  }
  
  if (labtype === "Histopathology") {
    return "Tissue diagnosis; cancer screening; malignancy evaluation; pathologic examination; disease classification; treatment planning";
  }
  
  if (labtype === "Molecular Biology") {
    if (testname.toLowerCase().includes("pcr")) {
      return "Molecular diagnosis; viral load monitoring; treatment response; drug resistance; infectious disease management";
    }
    return "Genetic testing; molecular diagnosis; disease monitoring";
  }
  
  if (labtype === "Biochemistry") {
    return "Metabolic assessment; organ function; disease monitoring; nutritional status; electrolyte balance";
  }
  
  if (labtype === "Hematology") {
    return "Blood disorders; anemia; coagulation; hematologic malignancy; transfusion medicine";
  }
  
  if (labtype === "Immunology") {
    return "Immune function; autoimmune disease; allergy; immunodeficiency; tumor markers";
  }
  
  if (labtype === "Serology") {
    return "Infectious disease serology; antibody detection; immune status; vaccination response";
  }
  
  if (labtype === "Endocrinology") {
    return "Hormonal assessment; endocrine disorders; metabolic disease; reproductive health";
  }
  
  return "Clinical laboratory testing; disease diagnosis; treatment monitoring; health screening";
};

const getReferenceTextByLabType = (labtype: string, testname: string): string => {
  if (labtype === "Microbiology") {
    if (testname.toLowerCase().includes("culture") || testname.toLowerCase().includes("c/s")) {
      return "No growth or normal flora";
    }
    if (testname.toLowerCase().includes("gram stain")) {
      return "No organisms seen or normal flora";
    }
    if (testname.toLowerCase().includes("afb")) {
      return "No acid-fast bacilli seen";
    }
    if (testname.toLowerCase().includes("cell") || testname.toLowerCase().includes("count")) {
      return "Normal cell count";
    }
    return "Negative or normal";
  }
  
  if (labtype === "Histopathology") {
    return "Benign tissue or normal histology";
  }
  
  if (labtype === "Molecular Biology") {
    return "Not detected or negative";
  }
  
  return "Within normal limits";
};

export async function POST() {
  try {
    // Get all tests without medical data
    const testsWithoutData = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          or(
            isNull(testReferenceRanges.bodysite),
            isNull(testReferenceRanges.clinicalindication)
          )
        )
      );

    let updated = 0;
    const errors: string[] = [];

    for (const test of testsWithoutData) {
      try {
        const bodysite = getBodySiteByLabType(test.labtype || "Unknown", test.testname || "");
        const clinicalindication = getClinicalIndicationByLabType(test.labtype || "Unknown", test.testname || "");
        const referencetext = getReferenceTextByLabType(test.labtype || "Unknown", test.testname || "");

        await db
          .update(testReferenceRanges)
          .set({
            bodysite,
            clinicalindication,
            referencetext: test.referencetext || referencetext,
            agegroup: test.agegroup || "ADULT",
            sex: test.sex || "ANY",
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(eq(testReferenceRanges.rangeid, test.rangeid));

        updated++;
        
        if (updated % 50 === 0) {
          console.log(`✅ Updated ${updated} test references...`);
        }
      } catch (error) {
        errors.push(`${test.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk updated ${updated} test references with medical data`,
      updated,
      total: testsWithoutData.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to bulk update", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

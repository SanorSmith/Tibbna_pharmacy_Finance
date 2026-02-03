import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

interface PanicValueUpdate {
  testcode: string;
  paniclow?: string | null;
  panichigh?: string | null;
  panictext?: string | null;
  agegroup?: string;
  sex?: string;
}

// Tests that REQUIRE panic values (life-threatening if abnormal)
const criticalTestsWithPanicValues: PanicValueUpdate[] = [
  // Electrolytes - CRITICAL
  { testcode: "K", paniclow: "2.5", panichigh: "6.5", panictext: "Critical: Cardiac arrhythmia risk" },
  { testcode: "Na", paniclow: "120", panichigh: "160", panictext: "Critical: Seizure/coma risk" },
  { testcode: "Ca", paniclow: "6.0", panichigh: "14.0", panictext: "Critical: Cardiac/neurologic emergency" },
  { testcode: "Mg", paniclow: "1.0", panichigh: "4.0", panictext: "Critical: Arrhythmia risk" },
  
  // Glucose - CRITICAL
  { testcode: "Fbs/Rbs", paniclow: "40", panichigh: "400", panictext: "Critical: Hypoglycemia/DKA risk" },
  { testcode: "HbA1c", paniclow: "3.0", panichigh: "14.0", panictext: "Critical: Severe dysglycemia" },
  
  // Renal Function - CRITICAL
  { testcode: "CRE", paniclow: "0.5", panichigh: "10.0", panictext: "Critical: Acute kidney injury" },
  { testcode: "Urea", paniclow: "5", panichigh: "200", panictext: "Critical: Uremia/renal failure" },
  
  // Cardiac Markers - CRITICAL
  { testcode: "Trop I", panichigh: "0.4", panictext: "Critical: Myocardial infarction" },
  { testcode: "CK-MB", panichigh: "25", panictext: "Critical: Cardiac injury" },
  { testcode: "MB", panichigh: "300", panictext: "Critical: Muscle/cardiac damage" },
  
  // Liver Function - CRITICAL when very high
  { testcode: "TSB", paniclow: "0.1", panichigh: "15.0", panictext: "Critical: Severe jaundice/liver failure" },
  { testcode: "ALT/GPT", paniclow: "5", panichigh: "1000", panictext: "Critical: Acute liver injury" },
  { testcode: "AST/GOT", paniclow: "5", panichigh: "1000", panictext: "Critical: Hepatocellular necrosis" },
  { testcode: "Alp", paniclow: "20", panichigh: "1000", panictext: "Critical: Severe cholestasis" },
  { testcode: "GGT", paniclow: "5", panichigh: "1000", panictext: "Critical: Hepatobiliary emergency" },
  
  // Hematology - CRITICAL
  { testcode: "CBC", panictext: "Critical: WBC <2 or >30, Hgb <7 or >20, Plt <20 or >1000" },
  { testcode: "ESR", panichigh: "100", panictext: "Critical: Severe inflammation/malignancy" },
  
  // Coagulation - CRITICAL
  { testcode: "PT &INR", paniclow: "8", panichigh: "30", panictext: "Critical: Bleeding/thrombosis risk" },
  { testcode: "PTT", paniclow: "20", panichigh: "100", panictext: "Critical: Coagulopathy" },
  { testcode: "Fibrinogen", paniclow: "100", panichigh: "700", panictext: "Critical: DIC/bleeding risk" },
  
  // Thyroid - CRITICAL when extreme
  { testcode: "TSH", paniclow: "0.1", panichigh: "10.0", panictext: "Critical: Thyroid storm/myxedema risk" },
  { testcode: "T3", paniclow: "40", panichigh: "400", panictext: "Critical: Thyrotoxicosis" },
  { testcode: "T4", paniclow: "2.0", panichigh: "20.0", panictext: "Critical: Severe thyroid dysfunction" },
  { testcode: "FT3", paniclow: "1.0", panichigh: "8.0", panictext: "Critical: Thyroid emergency" },
  { testcode: "FT4", paniclow: "0.3", panichigh: "4.0", panictext: "Critical: Thyroid crisis" },
  
  // Hormones - CRITICAL
  { testcode: "ACTH", paniclow: "5", panichigh: "100", panictext: "Critical: Adrenal crisis risk" },
  { testcode: "Cortisol", paniclow: "2.0", panichigh: "50.0", panictext: "Critical: Adrenal emergency" },
  { testcode: "PRL", panichigh: "100", panictext: "Critical: Prolactinoma" },
  
  // Anemia Markers - CRITICAL when extreme
  { testcode: "FA", paniclow: "2.0", panichigh: "20.0", panictext: "Critical: Severe deficiency" },
  { testcode: "VB12", paniclow: "150", panichigh: "2000", panictext: "Critical: Pernicious anemia" },
  { testcode: "Fert", paniclow: "10", panichigh: "1000", panictext: "Critical: Severe iron disorder" },
  
  // Bone Metabolism - CRITICAL
  { testcode: "PTH", paniclow: "5", panichigh: "200", panictext: "Critical: Parathyroid emergency" },
  { testcode: "VitD3", paniclow: "10", panichigh: "150", panictext: "Critical: Severe deficiency/toxicity" },
  
  // Lipids - CRITICAL when extreme
  { testcode: "CHOL", panichigh: "400", panictext: "Critical: Severe hypercholesterolemia" },
  { testcode: "Trig", panichigh: "1000", panictext: "Critical: Pancreatitis risk" },
  { testcode: "HDL", paniclow: "20", panichigh: "100", panictext: "Critical: Severe dyslipidemia" },
  { testcode: "LDL", panichigh: "190", panictext: "Critical: Familial hypercholesterolemia" },
  
  // Other Biochemistry - CRITICAL
  { testcode: "LA", paniclow: "0.3", panichigh: "10.0", panictext: "Critical: Lactic acidosis/sepsis" },
  { testcode: "LDH", paniclow: "100", panichigh: "2000", panictext: "Critical: Massive hemolysis/tissue damage" },
  { testcode: "PO4", paniclow: "1.0", panichigh: "10.0", panictext: "Critical: Severe phosphate disorder" },
  { testcode: "Fe", paniclow: "30", panichigh: "500", panictext: "Critical: Iron toxicity" },
  { testcode: "TIBC", paniclow: "200", panichigh: "600", panictext: "Critical: Severe iron disorder" },
  { testcode: "Alb", paniclow: "2.0", panichigh: "6.0", panictext: "Critical: Severe malnutrition/overload" },
  { testcode: "TP", paniclow: "4.0", panichigh: "10.0", panictext: "Critical: Severe protein disorder" },
  { testcode: "AMY total", paniclow: "20", panichigh: "1000", panictext: "Critical: Acute pancreatitis" },
  { testcode: "Lipase", panichigh: "600", panictext: "Critical: Severe pancreatitis" },
  { testcode: "TCO2", paniclow: "15", panichigh: "40", panictext: "Critical: Severe acid-base disorder" },
  { testcode: "ABG", panictext: "Critical: pH <7.20 or >7.60; pO2 <50; pCO2 <20 or >60" },
  { testcode: "CPK", paniclow: "20", panichigh: "10000", panictext: "Critical: Rhabdomyolysis" },
  
  // Tumor Markers - CRITICAL when very high
  { testcode: "AFP", panichigh: "400", panictext: "Critical: Hepatocellular carcinoma" },
  { testcode: "CEA", panichigh: "20", panictext: "Critical: Advanced malignancy" },
  { testcode: "CA 125", panichigh: "200", panictext: "Critical: Ovarian cancer" },
  { testcode: "CA 15-3", panichigh: "100", panictext: "Critical: Metastatic breast cancer" },
  { testcode: "CA 19-9", panichigh: "1000", panictext: "Critical: Pancreatic cancer" },
  { testcode: "PSA", panichigh: "20", panictext: "Critical: Advanced prostate cancer" },
  
  // Immunology - CRITICAL
  { testcode: "IgM", paniclow: "20", panichigh: "400", panictext: "Critical: Immunodeficiency/hypergammaglobulinemia" },
  { testcode: "IgG", paniclow: "400", panichigh: "2000", panictext: "Critical: Severe immune disorder" },
  { testcode: "IgA", paniclow: "40", panichigh: "600", panictext: "Critical: IgA deficiency" },
  { testcode: "IgE (ELISA)", panichigh: "1000", panictext: "Critical: Severe allergy/hyper-IgE syndrome" },
  { testcode: "IgE (COBAS E4)", panichigh: "1000", panictext: "Critical: Severe allergic disorder" },
  { testcode: "C3", paniclow: "50", panichigh: "250", panictext: "Critical: Complement deficiency" },
  { testcode: "C4", paniclow: "5", panichigh: "60", panictext: "Critical: Hereditary angioedema" },
  { testcode: "A1AT", paniclow: "50", panictext: "Critical: Alpha-1 antitrypsin deficiency" },
  { testcode: "LPA", panichigh: "100", panictext: "Critical: High CV risk" },
  { testcode: "APO B", panichigh: "200", panictext: "Critical: Severe dyslipidemia" },
  { testcode: "PCT", panichigh: "10.0", panictext: "Critical: Severe sepsis" },
  { testcode: "Crp titer", panichigh: "10.0", panictext: "Critical: Severe inflammation/sepsis" },
  { testcode: "Calprotectin", panichigh: "200", panictext: "Critical: Severe IBD" },
  
  // Coagulation factors - CRITICAL
  { testcode: "AT3", paniclow: "50", panichigh: "150", panictext: "Critical: Thrombosis risk" },
  { testcode: "PROT-C", paniclow: "50", panichigh: "150", panictext: "Critical: Thrombophilia" },
  { testcode: "PROT-S", paniclow: "50", panichigh: "150", panictext: "Critical: Thrombosis risk" },
  
  // Body Fluids - CRITICAL
  { testcode: "CSF Protein", paniclow: "10", panichigh: "500", panictext: "Critical: Meningitis/GBS" },
  { testcode: "CSF Sugar", paniclow: "20", panichigh: "100", panictext: "Critical: Bacterial meningitis" },
  { testcode: "Diff WBC CSF", panictext: "Critical: >1000 cells suggests bacterial meningitis" },
  { testcode: "Total cells Ascitic", panictext: "Critical: >250 PMN suggests SBP" },
  { testcode: "Diff WBC Ascitic", panictext: "Critical: >250 PMN indicates SBP" },
  { testcode: "Total cells Synovial", panictext: "Critical: >50,000 suggests septic arthritis" },
  { testcode: "Diff WBC Synovial", panictext: "Critical: >90% PMN suggests septic arthritis" },
  
  // D-Dimer - CRITICAL
  { testcode: "DD", panichigh: "4.0", panictext: "Critical: PE/DVT risk" },
  
  // Urine tests - CRITICAL
  { testcode: "u-albumin", panichigh: "300", panictext: "Critical: Nephrotic syndrome" },
  { testcode: "Albumin creatinine ratio", panichigh: "300", panictext: "Critical: Severe proteinuria" },
  { testcode: "24 Hr Urine protein", panichigh: "3000", panictext: "Critical: Nephrotic range proteinuria" },
  
  // Retic count - CRITICAL
  { testcode: "Retic", paniclow: "0.2", panichigh: "6.0", panictext: "Critical: Bone marrow failure/hemolysis" },
];

export async function POST() {
  try {
    let updated = 0;
    let cleared = 0;
    const errors: string[] = [];

    // Step 1: Clear ALL panic values first
    console.log("Step 1: Clearing all existing panic values...");
    const allTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, WORKSPACE_ID));

    for (const test of allTests) {
      try {
        await db
          .update(testReferenceRanges)
          .set({
            paniclow: null,
            panichigh: null,
            panictext: null,
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(eq(testReferenceRanges.rangeid, test.rangeid));
        cleared++;
      } catch (error) {
        errors.push(`Clear ${test.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log(`✅ Cleared panic values from ${cleared} tests`);

    // Step 2: Add panic values ONLY to critical tests
    console.log("Step 2: Adding panic values to critical tests...");
    for (const data of criticalTestsWithPanicValues) {
      try {
        const result = await db
          .update(testReferenceRanges)
          .set({
            paniclow: data.paniclow || null,
            panichigh: data.panichigh || null,
            panictext: data.panictext || null,
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
            console.log(`✅ Updated ${updated} critical tests with panic values...`);
          }
        }
      } catch (error) {
        errors.push(`${data.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated panic values: ${cleared} cleared, ${updated} critical tests updated`,
      cleared,
      updated,
      totalCriticalTests: criticalTestsWithPanicValues.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Panic value update error:", error);
    return NextResponse.json(
      { error: "Failed to update panic values", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

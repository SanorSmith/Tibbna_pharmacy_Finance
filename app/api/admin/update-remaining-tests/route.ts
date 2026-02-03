import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, like } from "drizzle-orm";

// Reference ranges from medical literature and databases
const REFERENCE_RANGES: Record<string, any> = {
  // 24-Hour Urine Tests (from NCBI StatPearls and clinical guidelines)
  "24 Hr. Urine for protein": { min: null, max: 150, text: null, unit: "mg/24hr", panicHigh: 3000 },
  "24 Hr. Urine for cortisol": { min: 20, max: 90, text: null, unit: "µg/24hr", panicHigh: 200 },
  "24 Hr. Urine for copper": { min: 15, max: 60, text: null, unit: "µg/24hr", panicHigh: 100 },
  "24 Hr. Urine for Amylase": { min: 1, max: 17, text: null, unit: "U/hr", panicHigh: null },
  "24 Hr. Urine for calcium": { min: 100, max: 300, text: null, unit: "mg/24hr", panicHigh: 400 },
  "24 Hr. Urine for chloride": { min: 110, max: 250, text: null, unit: "mmol/24hr", panicHigh: null },
  "24 Hr. Urine for potassium": { min: 25, max: 125, text: null, unit: "mmol/24hr", panicHigh: null },
  "24 Hr. Urine for sodium": { min: 40, max: 220, text: null, unit: "mmol/24hr", panicHigh: null },
  "24 Hr. Urine for uric acid": { min: 250, max: 750, text: null, unit: "mg/24hr", panicHigh: 1000 },
  "24 Hr. Urine for oxalic acid": { min: 10, max: 40, text: null, unit: "mg/24hr", panicHigh: 60 },
  "24 Hr. Urine for Citrate": { min: 320, max: 1240, text: null, unit: "mg/24hr", panicLow: 250 },
  
  // Enzymes
  "Lipase": { min: 0, max: 160, text: null, unit: "U/L", panicHigh: 600 },
  "Total Amylase": { min: 30, max: 220, text: null, unit: "U/L", panicHigh: 500 },
  
  // Hormones (from Medscape reference ranges)
  "Androgen": { min: null, max: null, text: "Males: 300-1000 ng/dL; Females: 15-70 ng/dL", unit: "ng/dL" },
  "Dehydroepiandrosterone sulfate": { min: null, max: null, text: "Males: 80-560 µg/dL; Females: 35-430 µg/dL", unit: "µg/dL" },
  "Cortisol in urine": { min: 20, max: 90, text: null, unit: "µg/24hr", panicHigh: 200 },
  "Gastrin": { min: 0, max: 100, text: null, unit: "pg/mL", panicHigh: 1000 },
  "Pro-insulin": { min: null, max: 10, text: null, unit: "pmol/L", panicHigh: 50 },
  "Human insulin Auto antibodies": { min: null, max: null, text: "Negative", unit: "N/A" },
  
  // Coagulation
  "Anti-thrombin III": { min: 80, max: 120, text: null, unit: "%", panicLow: 50 },
  
  // Immunology
  "Complement 3": { min: 90, max: 180, text: null, unit: "mg/dL", panicLow: 50 },
  "Complement 4": { min: 10, max: 40, text: null, unit: "mg/dL", panicLow: 5 },
  "Apolipoprotein A1": { min: 115, max: 220, text: null, unit: "mg/dL", panicLow: 80 },
  "Apolipoprotein B": { min: 50, max: 130, text: null, unit: "mg/dL", panicHigh: 200 },
  "Lipoprotein A": { min: null, max: 30, text: null, unit: "mg/dL", panicHigh: 75 },
  
  // Minerals
  "Copper": { min: 70, max: 140, text: null, unit: "µg/dL", panicLow: 40, panicHigh: 200 },
  "Zinc": { min: 60, max: 130, text: null, unit: "µg/dL", panicLow: 40, panicHigh: 200 },
  
  // Hematology - Qualitative
  "Blood Film": { min: null, max: null, text: "Normal morphology", unit: "N/A" },
  "Direct coomb test": { min: null, max: null, text: "Negative", unit: "N/A" },
  "Indirect coomb test": { min: null, max: null, text: "Negative", unit: "N/A" },
  "Lupus erythematosus preparation": { min: null, max: null, text: "Negative", unit: "N/A" },
  "CBC & Blood Film": { min: null, max: null, text: "Normal", unit: "N/A" },
  
  // Blood Bank
  "Blood group&Rh": { min: null, max: null, text: "Reported as type", unit: "N/A" },
  "Cross match": { min: null, max: null, text: "Compatible", unit: "N/A" },
  "Rh Ab titer": { min: null, max: null, text: "Negative or <1:8", unit: "N/A" },
  
  // Coagulation Time Tests
  "Bleeding Time": { min: 2, max: 9, text: null, unit: "minutes", panicHigh: 15 },
  "Clotting Time": { min: 5, max: 15, text: null, unit: "minutes", panicHigh: 30 },
  
  // Microbiology
  "Serum immune fixation": { min: null, max: null, text: "No monoclonal protein detected", unit: "N/A" },
  "Tuberculosis Ab": { min: null, max: null, text: "Negative", unit: "N/A" },
  
  // Blood Products (Descriptive)
  "Whole blood": { min: null, max: null, text: "Product specification", unit: "N/A" },
  "Cryoprecipitate": { min: null, max: null, text: "Product specification", unit: "N/A" },
  "Platelets": { min: null, max: null, text: "Product specification", unit: "N/A" },
  
  // Special Tests
  "Arterial blood gases": { min: null, max: null, text: "pH 7.35-7.45; pCO2 35-45 mmHg; pO2 80-100 mmHg", unit: "N/A" },
  "PCR for HIV Viral Load by genexpert": { min: null, max: null, text: "Not detected or <20 copies/mL", unit: "copies/mL" },
  
  // Thyroid
  "Thyroid microsomal autoantibody": { min: null, max: 35, text: null, unit: "IU/mL", panicHigh: 100 },
  
  // Specialized Antibodies (Celiac Disease)
  "Anti-reticulin G (ELISA)": { min: null, max: null, text: "Negative (<20 U/mL)", unit: "U/mL" },
  "Anti-reticulin G (COBAS E4)": { min: null, max: null, text: "Negative (<20 U/mL)", unit: "U/mL" },
  "Anti-reticulin A (ELISA)": { min: null, max: null, text: "Negative (<20 U/mL)", unit: "U/mL" },
  "Anti-reticulin A (COBAS E4)": { min: null, max: null, text: "Negative (<20 U/mL)", unit: "U/mL" },
};

export async function POST(request: NextRequest) {
  try {
    const { workspaceid, userid } = await request.json();

    if (!workspaceid || !userid) {
      return NextResponse.json(
        { error: "Missing workspaceid or userid" },
        { status: 400 }
      );
    }

    console.log("Updating remaining tests with reference ranges from medical literature...");

    // Get all tests with "Within normal" text
    const allTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, workspaceid));

    const testsToUpdate = allTests.filter(test => 
      test.referencetext && test.referencetext.toLowerCase().includes("within normal")
    );

    console.log(`Found ${testsToUpdate.length} tests to update`);

    let updateCount = 0;
    let notFoundCount = 0;
    const updated: string[] = [];
    const notFound: string[] = [];

    for (const test of testsToUpdate) {
      // Try to find matching reference range
      let refRange = REFERENCE_RANGES[test.testname];
      
      // Try partial match if exact match not found
      if (!refRange) {
        const testNameLower = test.testname.toLowerCase();
        for (const [key, value] of Object.entries(REFERENCE_RANGES)) {
          if (testNameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(testNameLower)) {
            refRange = value;
            break;
          }
        }
      }

      if (!refRange) {
        notFound.push(test.testname);
        notFoundCount++;
        continue;
      }

      // Update the test
      const updateData: any = {
        updatedby: userid,
        updatedat: new Date(),
      };

      // Update unit if provided
      if (refRange.unit) {
        updateData.unit = refRange.unit;
      }

      // Set reference values
      if (refRange.min !== undefined || refRange.max !== undefined) {
        updateData.referencemin = refRange.min;
        updateData.referencemax = refRange.max;
        updateData.referencetext = refRange.text || null;
      } else if (refRange.text) {
        updateData.referencetext = refRange.text;
        updateData.referencemin = null;
        updateData.referencemax = null;
      }

      // Set panic values if provided
      if (refRange.panicLow !== undefined) {
        updateData.paniclow = refRange.panicLow;
      }
      if (refRange.panicHigh !== undefined) {
        updateData.panichigh = refRange.panicHigh;
      }

      await db
        .update(testReferenceRanges)
        .set(updateData)
        .where(eq(testReferenceRanges.rangeid, test.rangeid));

      updateCount++;
      updated.push(test.testname);
    }

    return NextResponse.json({
      success: true,
      message: `Update completed: ${updateCount} tests updated with medical reference ranges`,
      updateCount,
      notFoundCount,
      updated,
      notFound,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update tests", details: String(error) },
      { status: 500 }
    );
  }
}

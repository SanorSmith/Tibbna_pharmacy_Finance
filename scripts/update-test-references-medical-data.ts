/**
 * Update Test Reference Ranges with Medical Reference Data
 * Adds reference ranges, panic values, body sites, and clinical indications
 */

import { config } from "dotenv";
import * as path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { db } from "../lib/db/index";
import { testReferenceRanges } from "../lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

interface MedicalReferenceData {
  testcode: string;
  bodysite: string;
  referencemin?: string;
  referencemax?: string;
  referencetext?: string;
  paniclow?: string;
  panichigh?: string;
  panictext?: string;
  clinicalindication: string;
  agegroup?: string;
  sex?: string;
}

// Comprehensive medical reference data
const medicalData: MedicalReferenceData[] = [
  // Endocrinology - Thyroid
  { testcode: "TSH", bodysite: "Venous blood", referencemin: "0.4", referencemax: "4.0", paniclow: "0.1", panichigh: "10.0", clinicalindication: "Screening for thyroid disorders; monitoring thyroid replacement therapy; evaluating thyroid nodules", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T3", bodysite: "Venous blood", referencemin: "80", referencemax: "200", paniclow: "40", panichigh: "400", clinicalindication: "Hyperthyroidism evaluation; T3 toxicosis; monitoring antithyroid therapy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T4", bodysite: "Venous blood", referencemin: "5.0", referencemax: "12.0", paniclow: "2.0", panichigh: "20.0", clinicalindication: "Thyroid function assessment; hypothyroidism or hyperthyroidism diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FT3", bodysite: "Venous blood", referencemin: "2.3", referencemax: "4.2", paniclow: "1.0", panichigh: "8.0", clinicalindication: "Assessment of thyroid function independent of binding proteins", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FT4", bodysite: "Venous blood", referencemin: "0.8", referencemax: "1.8", paniclow: "0.3", panichigh: "4.0", clinicalindication: "Primary assessment of thyroid function; monitoring thyroid therapy", agegroup: "ADULT", sex: "ANY" },
  
  // Endocrinology - Fertility
  { testcode: "LH", bodysite: "Venous blood", referencemin: "1.5", referencemax: "9.3", clinicalindication: "Infertility evaluation; menstrual disorders; hypogonadism", agegroup: "ADULT", sex: "M" },
  { testcode: "FSH", bodysite: "Venous blood", referencemin: "1.5", referencemax: "12.4", clinicalindication: "Male infertility; testicular function assessment", agegroup: "ADULT", sex: "M" },
  { testcode: "PRL", bodysite: "Venous blood", referencemin: "4.0", referencemax: "15.2", clinicalindication: "Galactorrhea; amenorrhea; pituitary adenoma evaluation", agegroup: "ADULT", sex: "M" },
  { testcode: "TEST", bodysite: "Venous blood", referencemin: "300", referencemax: "1000", paniclow: "100", panichigh: "1500", clinicalindication: "Hypogonadism; erectile dysfunction; infertility", agegroup: "ADULT", sex: "M" },
  
  // Biochemistry - Cardiac Markers
  { testcode: "Trop I", bodysite: "Venous blood", referencetext: "< 0.04 ng/mL", panichigh: "0.4", clinicalindication: "Acute coronary syndrome; myocardial infarction; cardiac injury", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CK-MB", bodysite: "Venous blood", referencetext: "< 5.0 ng/mL", panichigh: "25", clinicalindication: "Myocardial infarction; cardiac muscle damage", agegroup: "ADULT", sex: "ANY" },
  { testcode: "MB", bodysite: "Venous blood", referencetext: "< 107 ng/mL", panichigh: "300", clinicalindication: "Early myocardial infarction; rhabdomyolysis; muscle injury", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DD", bodysite: "Venous blood", referencetext: "< 0.5 µg/mL", panichigh: "4.0", clinicalindication: "Pulmonary embolism; DVT; thrombosis; DIC", agegroup: "ADULT", sex: "ANY" },
  
  // Biochemistry - Lipid Profile
  { testcode: "CHOL", bodysite: "Venous blood", referencetext: "< 200 mg/dL", panichigh: "400", clinicalindication: "Cardiovascular risk; hyperlipidemia; atherosclerosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Trig", bodysite: "Venous blood", referencetext: "< 150 mg/dL", panichigh: "1000", clinicalindication: "Cardiovascular risk; pancreatitis; metabolic syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HDL", bodysite: "Venous blood", referencemin: "40", referencemax: "60", paniclow: "20", panichigh: "100", clinicalindication: "Cardiovascular protection; lipid disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LDL", bodysite: "Venous blood", referencetext: "< 100 mg/dL", panichigh: "190", clinicalindication: "Cardiovascular risk; atherosclerosis; hypercholesterolemia", agegroup: "ADULT", sex: "ANY" },
  
  // Biochemistry - Renal Function
  { testcode: "Urea", bodysite: "Venous blood", referencemin: "7", referencemax: "20", paniclow: "5", panichigh: "200", clinicalindication: "Renal function; kidney disease; dehydration; uremia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CRE", bodysite: "Venous blood", referencemin: "0.7", referencemax: "1.3", paniclow: "0.5", panichigh: "10.0", clinicalindication: "Renal function; kidney disease; GFR estimation", agegroup: "ADULT", sex: "M" },
  { testcode: "UA", bodysite: "Venous blood", referencemin: "3.5", referencemax: "7.2", paniclow: "2.0", panichigh: "15.0", clinicalindication: "Gout; hyperuricemia; kidney stones; renal disease", agegroup: "ADULT", sex: "M" },
  { testcode: "K", bodysite: "Venous blood", referencemin: "3.5", referencemax: "5.0", paniclow: "2.5", panichigh: "6.5", clinicalindication: "Hyperkalemia; hypokalemia; cardiac arrhythmias; renal disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ca", bodysite: "Venous blood", referencemin: "8.5", referencemax: "10.5", paniclow: "6.0", panichigh: "14.0", clinicalindication: "Hypercalcemia; hypocalcemia; parathyroid disorders; bone disease", agegroup: "ADULT", sex: "ANY" },
  
  // Biochemistry - Liver Function
  { testcode: "TSB", bodysite: "Venous blood", referencemin: "0.3", referencemax: "1.2", paniclow: "0.1", panichigh: "15.0", clinicalindication: "Jaundice; liver disease; hemolysis; Gilbert's syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DB", bodysite: "Venous blood", referencemin: "0.0", referencemax: "0.3", clinicalindication: "Cholestasis; biliary obstruction; liver disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ALT/GPT", bodysite: "Venous blood", referencemin: "7", referencemax: "56", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; hepatitis; hepatotoxicity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AST/GOT", bodysite: "Venous blood", referencemin: "10", referencemax: "40", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; myocardial infarction; muscle disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Alp", bodysite: "Venous blood", referencemin: "30", referencemax: "120", paniclow: "20", panichigh: "1000", clinicalindication: "Liver disease; bone disorders; cholestasis; Paget's disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GGT", bodysite: "Venous blood", referencemin: "9", referencemax: "48", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; alcohol abuse; cholestasis; biliary obstruction", agegroup: "ADULT", sex: "M" },
  
  // Biochemistry - Glucose Metabolism
  { testcode: "Fbs/Rbs", bodysite: "Venous blood", referencemin: "70", referencemax: "100", paniclow: "40", panichigh: "400", clinicalindication: "Diabetes mellitus; hypoglycemia; hyperglycemia; metabolic disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1c", bodysite: "Venous blood", referencemin: "4.0", referencemax: "5.6", paniclow: "3.0", panichigh: "14.0", clinicalindication: "Diabetes monitoring; glycemic control; prediabetes", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1 by HPLC", bodysite: "Venous blood", referencemin: "4.0", referencemax: "5.6", paniclow: "3.0", panichigh: "14.0", clinicalindication: "Diabetes control; prediabetes screening", agegroup: "ADULT", sex: "ANY" },
  
  // Hematology - Anemia
  { testcode: "FA", bodysite: "Venous blood", referencemin: "2.7", referencemax: "17.0", paniclow: "2.0", panichigh: "20.0", clinicalindication: "Megaloblastic anemia; folate deficiency; pregnancy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "VB12", bodysite: "Venous blood", referencemin: "200", referencemax: "900", paniclow: "150", panichigh: "2000", clinicalindication: "Pernicious anemia; B12 deficiency; neuropathy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fert", bodysite: "Venous blood", referencemin: "24", referencemax: "336", paniclow: "10", panichigh: "1000", clinicalindication: "Iron deficiency anemia; hemochromatosis; iron overload", agegroup: "ADULT", sex: "M" },
  
  // Hematology - Coagulation
  { testcode: "PT &INR", bodysite: "Venous blood", referencemin: "11", referencemax: "13.5", clinicalindication: "Anticoagulation monitoring; liver function; bleeding disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PTT", bodysite: "Venous blood", referencemin: "25", referencemax: "35", clinicalindication: "Heparin monitoring; coagulation disorders; hemophilia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fibrinogen", bodysite: "Venous blood", referencemin: "200", referencemax: "400", paniclow: "100", panichigh: "700", clinicalindication: "DIC; bleeding disorders; thrombosis risk", agegroup: "ADULT", sex: "ANY" },
  
  // Hematology - General
  { testcode: "ESR", bodysite: "Venous blood", referencetext: "< 15 mm/hr", panichigh: "100", clinicalindication: "Inflammation; infection; autoimmune disease; malignancy", agegroup: "ADULT", sex: "M" },
  { testcode: "CBC", bodysite: "Venous blood", referencetext: "See individual parameters", clinicalindication: "Anemia; infection; bleeding disorders; general health screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Retic", bodysite: "Venous blood", referencemin: "0.5", referencemax: "2.5", paniclow: "0.2", panichigh: "6.0", clinicalindication: "Anemia evaluation; bone marrow function; hemolysis", agegroup: "ADULT", sex: "ANY" },
  
  // Serology - TORCH
  { testcode: "Toxo IgG", bodysite: "Venous blood", referencetext: "< 1.6 IU/mL (Negative)", clinicalindication: "Toxoplasmosis infection; pregnancy screening; immunocompromised", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CMV IgG", bodysite: "Venous blood", referencetext: "< 6.0 AU/mL (Negative)", clinicalindication: "CMV infection status; transplant screening; pregnancy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rubella IgG", bodysite: "Venous blood", referencetext: "> 10 IU/mL (Immune)", clinicalindication: "Rubella immunity; pregnancy screening; vaccination status", agegroup: "ADULT", sex: "ANY" },
  
  // Serology - Hepatitis
  { testcode: "HBs Ag titer", bodysite: "Venous blood", referencetext: "< 0.05 IU/mL (Negative)", clinicalindication: "Hepatitis B infection; chronic HBV; liver disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HCV IgG titer", bodysite: "Venous blood", referencetext: "< 1.0 (Negative)", clinicalindication: "Hepatitis C infection; chronic liver disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HIV titer", bodysite: "Venous blood", referencetext: "< 1.0 (Negative)", clinicalindication: "HIV infection; AIDS; immunodeficiency", agegroup: "ADULT", sex: "ANY" },
  
  // Immunology - Tumor Markers
  { testcode: "AFP", bodysite: "Venous blood", referencetext: "< 10 ng/mL", panichigh: "400", clinicalindication: "Hepatocellular carcinoma; germ cell tumors; liver cancer", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CEA", bodysite: "Venous blood", referencetext: "< 5.0 ng/mL", panichigh: "20", clinicalindication: "Colorectal cancer; GI malignancies; tumor monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CA 125", bodysite: "Venous blood", referencetext: "< 35 U/mL", panichigh: "200", clinicalindication: "Ovarian cancer; pelvic mass; gynecologic malignancy", agegroup: "ADULT", sex: "F" },
  { testcode: "PSA", bodysite: "Venous blood", referencetext: "< 4.0 ng/mL", panichigh: "20", clinicalindication: "Prostate cancer screening; BPH; prostate disorders", agegroup: "ADULT", sex: "M" },
  
  // Immunology - Autoimmune
  { testcode: "RF", bodysite: "Venous blood", referencetext: "< 14 IU/mL", clinicalindication: "Rheumatoid arthritis; autoimmune disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-CCP", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Rheumatoid arthritis; early RA diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ANA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Systemic lupus erythematosus; autoimmune disorders", agegroup: "ADULT", sex: "ANY" },
  
  // Microbiology
  { testcode: "Urine for c/s", bodysite: "Midstream urine", referencetext: "< 10000 CFU/mL", clinicalindication: "Urinary tract infection; UTI; cystitis; pyelonephritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Blood for C/S (manual)", bodysite: "Venous blood", referencetext: "No growth", clinicalindication: "Sepsis; bacteremia; endocarditis; fever of unknown origin", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Sputum for C/S (manual)", bodysite: "Sputum", referencetext: "Normal flora", clinicalindication: "Pneumonia; respiratory infection; tuberculosis", agegroup: "ADULT", sex: "ANY" },
];

async function updateMedicalData() {
  try {
    console.log("🔬 Starting medical reference data update...");
    
    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const data of medicalData) {
      try {
        const result = await db
          .update(testReferenceRanges)
          .set({
            bodysite: data.bodysite,
            referencemin: data.referencemin,
            referencemax: data.referencemax,
            referencetext: data.referencetext,
            paniclow: data.paniclow,
            panichigh: data.panichigh,
            panictext: data.panictext,
            clinicalindication: data.clinicalindication,
            agegroup: data.agegroup || "ADULT",
            sex: data.sex || "ANY",
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(
            and(
              eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
              eq(testReferenceRanges.testcode, data.testcode)
            )
          )
          .returning();

        if (result.length > 0) {
          updated++;
          if (updated % 10 === 0) {
            console.log(`✅ Updated ${updated} test references...`);
          }
        } else {
          notFound++;
        }
      } catch (error) {
        errors.push(`${data.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log("\n🎉 Medical data update completed!");
    console.log(`✅ Successfully updated: ${updated} test references`);
    if (notFound > 0) {
      console.log(`⚠️  Not found: ${notFound} test codes`);
    }
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

  } catch (error) {
    console.error("❌ Fatal error during update:", error);
    process.exit(1);
  }
}

updateMedicalData()
  .then(() => {
    console.log("\n✅ Update script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Update script failed:", error);
    process.exit(1);
  });

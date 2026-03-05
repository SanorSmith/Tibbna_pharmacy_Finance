/**
 * Seed Lab Test Catalog
 * 
 * Populates the lab_test_catalog table with common laboratory tests
 * Includes LOINC and SNOMED CT codes for interoperability
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import { db } from "./index";
import { labTestCatalog, NewLabTestCatalog } from "./schema";

const testCatalogData: Omit<NewLabTestCatalog, "testid" | "createdat" | "updatedat">[] = [
  // Hematology Tests
  {
    testcode: "CBC",
    testname: "Complete Blood Count",
    testdescription: "Measures different components and features of blood",
    testcategory: "Hematology",
    testpanel: "CBC Panel",
    loinccode: "58410-2",
    loincname: "Complete blood count (CBC) panel - Blood by Automated count",
    snomedcode: "104177005",
    snomedname: "Complete blood count (procedure)",
    specimentype: "Blood",
    specimenvolume: "3-5 mL",
    specimencontainer: "EDTA tube (purple top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "WBC",
    testname: "White Blood Cell Count",
    testdescription: "Measures the number of white blood cells",
    testcategory: "Hematology",
    loinccode: "6690-2",
    loincname: "Leukocytes [#/volume] in Blood by Automated count",
    snomedcode: "767002",
    snomedname: "White blood cell count procedure",
    specimentype: "Blood",
    specimenvolume: "3-5 mL",
    specimencontainer: "EDTA tube (purple top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "HGB",
    testname: "Hemoglobin",
    testdescription: "Measures hemoglobin concentration",
    testcategory: "Hematology",
    loinccode: "718-7",
    loincname: "Hemoglobin [Mass/volume] in Blood",
    snomedcode: "104133006",
    snomedname: "Hemoglobin measurement",
    specimentype: "Blood",
    specimenvolume: "3-5 mL",
    specimencontainer: "EDTA tube (purple top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },

  // Biochemistry Tests
  {
    testcode: "CMP",
    testname: "Comprehensive Metabolic Panel",
    testdescription: "Measures glucose, electrolytes, kidney and liver function",
    testcategory: "Biochemistry",
    testpanel: "CMP Panel",
    loinccode: "24323-8",
    loincname: "Comprehensive metabolic 2000 panel - Serum or Plasma",
    snomedcode: "257051000",
    snomedname: "Comprehensive metabolic panel",
    specimentype: "Serum",
    specimenvolume: "5-7 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "4-6",
    fastingrequired: true,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "GLU",
    testname: "Glucose",
    testdescription: "Measures blood sugar level",
    testcategory: "Biochemistry",
    loinccode: "2345-7",
    loincname: "Glucose [Mass/volume] in Serum or Plasma",
    snomedcode: "33747003",
    snomedname: "Glucose measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: true,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "BUN",
    testname: "Blood Urea Nitrogen",
    testdescription: "Measures kidney function",
    testcategory: "Biochemistry",
    loinccode: "3094-0",
    loincname: "Urea nitrogen [Mass/volume] in Serum or Plasma",
    snomedcode: "271236005",
    snomedname: "Serum urea measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "CREAT",
    testname: "Creatinine",
    testdescription: "Measures kidney function",
    testcategory: "Biochemistry",
    loinccode: "2160-0",
    loincname: "Creatinine [Mass/volume] in Serum or Plasma",
    snomedcode: "70901006",
    snomedname: "Creatinine measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },

  // Lipid Panel
  {
    testcode: "LIPID",
    testname: "Lipid Panel",
    testdescription: "Measures cholesterol and triglycerides",
    testcategory: "Biochemistry",
    testpanel: "Lipid Panel",
    loinccode: "57698-3",
    loincname: "Lipid panel with direct LDL - Serum or Plasma",
    snomedcode: "271649006",
    snomedname: "Lipid panel",
    specimentype: "Serum",
    specimenvolume: "5-7 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "4-6",
    fastingrequired: true,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "CHOL",
    testname: "Total Cholesterol",
    testdescription: "Measures total cholesterol level",
    testcategory: "Biochemistry",
    loinccode: "2093-3",
    loincname: "Cholesterol [Mass/volume] in Serum or Plasma",
    snomedcode: "271649006",
    snomedname: "Serum cholesterol measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: true,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "TRIG",
    testname: "Triglycerides",
    testdescription: "Measures triglyceride level",
    testcategory: "Biochemistry",
    loinccode: "2571-8",
    loincname: "Triglyceride [Mass/volume] in Serum or Plasma",
    snomedcode: "271658002",
    snomedname: "Serum triglyceride measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: true,
    isactive: true,
    workspaceid: "default",
  },

  // Liver Function Tests
  {
    testcode: "LFT",
    testname: "Liver Function Tests",
    testdescription: "Measures liver enzymes and function",
    testcategory: "Biochemistry",
    testpanel: "LFT Panel",
    loinccode: "24325-3",
    loincname: "Liver function panel - Serum or Plasma",
    snomedcode: "26958001",
    snomedname: "Liver function test",
    specimentype: "Serum",
    specimenvolume: "5-7 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "4-6",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "ALT",
    testname: "Alanine Aminotransferase",
    testdescription: "Liver enzyme test",
    testcategory: "Biochemistry",
    loinccode: "1742-6",
    loincname: "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
    snomedcode: "104485008",
    snomedname: "ALT measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
  {
    testcode: "AST",
    testname: "Aspartate Aminotransferase",
    testdescription: "Liver enzyme test",
    testcategory: "Biochemistry",
    loinccode: "1920-8",
    loincname: "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
    snomedcode: "104486009",
    snomedname: "AST measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },

  // Thyroid Tests
  {
    testcode: "TSH",
    testname: "Thyroid Stimulating Hormone",
    testdescription: "Measures thyroid function",
    testcategory: "Endocrinology",
    loinccode: "3016-3",
    loincname: "Thyrotropin [Units/volume] in Serum or Plasma",
    snomedcode: "61167004",
    snomedname: "TSH measurement",
    specimentype: "Serum",
    specimenvolume: "3-5 mL",
    specimencontainer: "SST tube (gold top)",
    turnaroundtime: "4-6",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },

  // Urinalysis
  {
    testcode: "UA",
    testname: "Urinalysis",
    testdescription: "Complete urine analysis",
    testcategory: "Urinalysis",
    loinccode: "24356-8",
    loincname: "Urinalysis complete panel - Urine",
    snomedcode: "27171005",
    snomedname: "Urinalysis",
    specimentype: "Urine",
    specimenvolume: "10-15 mL",
    specimencontainer: "Sterile urine cup",
    turnaroundtime: "2-4",
    fastingrequired: false,
    isactive: true,
    workspaceid: "default",
  },
];

export async function seedTestCatalog() {
  console.log("Seeding lab test catalog...");
  
  try {
    // Insert test catalog data
    await db.insert(labTestCatalog).values(testCatalogData);
    
    console.log(`✓ Seeded ${testCatalogData.length} tests to catalog`);
  } catch (error) {
    console.error("Error seeding test catalog:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTestCatalog()
    .then(() => {
      console.log("Test catalog seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test catalog seeding failed:", error);
      process.exit(1);
    });
}

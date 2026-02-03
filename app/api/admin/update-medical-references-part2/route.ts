import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
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

// Part 2: HEMATOLOGY & SEROLOGY
const medicalData: MedicalReferenceData[] = [
  // ==================== HEMATOLOGY (37 tests) ====================
  
  // Anemia Markers (3 tests)
  { testcode: "FA", bodysite: "Venous blood", referencemin: "2.7", referencemax: "17.0", paniclow: "2.0", panichigh: "20.0", clinicalindication: "Megaloblastic anemia; folate deficiency; pregnancy; neural tube defects; malabsorption", agegroup: "ADULT", sex: "ANY" },
  { testcode: "VB12", bodysite: "Venous blood", referencemin: "200", referencemax: "900", paniclow: "150", panichigh: "2000", clinicalindication: "Pernicious anemia; B12 deficiency; neuropathy; megaloblastic anemia; malabsorption", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fert", bodysite: "Venous blood", referencemin: "24", referencemax: "336", paniclow: "10", panichigh: "1000", clinicalindication: "Iron deficiency anemia; hemochromatosis; iron overload; chronic disease anemia", agegroup: "ADULT", sex: "M" },
  { testcode: "Fert", bodysite: "Venous blood", referencemin: "11", referencemax: "307", paniclow: "10", panichigh: "1000", clinicalindication: "Iron deficiency anemia; pregnancy; menstrual blood loss", agegroup: "ADULT", sex: "F" },
  
  // Complete Blood Count (7 tests)
  { testcode: "CBC", bodysite: "Venous blood", referencetext: "WBC 4-11, RBC 4.5-5.5, Hgb 13-17, Hct 40-50, Plt 150-400", panictext: "WBC <2 or >30, Hgb <7 or >20, Plt <20 or >1000", clinicalindication: "Anemia; infection; bleeding disorders; leukemia; general health screening; bone marrow disorders", agegroup: "ADULT", sex: "M" },
  { testcode: "CBC", bodysite: "Venous blood", referencetext: "WBC 4-11, RBC 4.0-5.0, Hgb 12-16, Hct 36-46, Plt 150-400", panictext: "WBC <2 or >30, Hgb <7 or >20, Plt <20 or >1000", clinicalindication: "Anemia; infection; bleeding disorders; pregnancy monitoring", agegroup: "ADULT", sex: "F" },
  { testcode: "ESR", bodysite: "Venous blood", referencetext: "< 15 mm/hr", panichigh: "100", clinicalindication: "Inflammation; infection; autoimmune disease; malignancy; temporal arteritis; polymyalgia rheumatica", agegroup: "ADULT", sex: "M" },
  { testcode: "ESR", bodysite: "Venous blood", referencetext: "< 20 mm/hr", panichigh: "100", clinicalindication: "Inflammation; infection; autoimmune disease; pregnancy", agegroup: "ADULT", sex: "F" },
  { testcode: "Blood Film", bodysite: "Venous blood", referencetext: "Normal morphology", clinicalindication: "Anemia evaluation; leukemia; parasites; abnormal cell morphology; hemolytic disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CBC & Blood Film", bodysite: "Venous blood", referencetext: "See CBC + morphology", clinicalindication: "Comprehensive hematologic evaluation; anemia workup; leukemia screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Retic", bodysite: "Venous blood", referencemin: "0.5", referencemax: "2.5", paniclow: "0.2", panichigh: "6.0", clinicalindication: "Anemia evaluation; bone marrow function; hemolysis; response to anemia treatment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Sickling test", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Sickle cell disease; sickle cell trait; hemoglobinopathy screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Malaria test", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Malaria diagnosis; fever in endemic areas; parasitemia detection", agegroup: "ADULT", sex: "ANY" },
  
  // Coagulation Profile (9 tests)
  { testcode: "PT &INR", bodysite: "Venous blood", referencemin: "11", referencemax: "13.5", paniclow: "8", panichigh: "30", clinicalindication: "Anticoagulation monitoring; liver function; bleeding disorders; warfarin therapy; vitamin K deficiency", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PTT", bodysite: "Venous blood", referencemin: "25", referencemax: "35", paniclow: "20", panichigh: "100", clinicalindication: "Heparin monitoring; coagulation disorders; hemophilia; von Willebrand disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fibrinogen", bodysite: "Venous blood", referencemin: "200", referencemax: "400", paniclow: "100", panichigh: "700", clinicalindication: "DIC; bleeding disorders; thrombosis risk; liver disease; pregnancy complications", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AT3", bodysite: "Venous blood", referencemin: "80", referencemax: "120", paniclow: "50", panichigh: "150", clinicalindication: "Thrombophilia; recurrent thrombosis; heparin resistance; DIC", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PROT-C", bodysite: "Venous blood", referencemin: "70", referencemax: "140", paniclow: "50", panichigh: "150", clinicalindication: "Thrombophilia; recurrent DVT; protein C deficiency; warfarin-induced skin necrosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PROT-S", bodysite: "Venous blood", referencemin: "60", referencemax: "140", paniclow: "50", panichigh: "150", clinicalindication: "Thrombophilia; recurrent thrombosis; protein S deficiency; pregnancy complications", agegroup: "ADULT", sex: "ANY" },
  { testcode: "BT", bodysite: "Capillary blood", referencemin: "2", referencemax: "7", clinicalindication: "Platelet function; von Willebrand disease; bleeding disorders; aspirin effect", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CT", bodysite: "Venous blood", referencemin: "5", referencemax: "11", clinicalindication: "Coagulation screening; hemophilia; severe bleeding disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LE cell preparation", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Systemic lupus erythematosus; autoimmune disorders; drug-induced lupus", agegroup: "ADULT", sex: "ANY" },
  
  // Blood Bank & Special Tests (11 tests)
  { testcode: "Blood group&Rh", bodysite: "Venous blood", referencetext: "ABO and Rh typing", clinicalindication: "Blood transfusion; pregnancy; organ transplant; hemolytic disease of newborn", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cross match", bodysite: "Venous blood", referencetext: "Compatible", clinicalindication: "Pre-transfusion testing; blood compatibility; antibody screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Whole blood", bodysite: "Whole blood", referencetext: "Blood product", clinicalindication: "Massive hemorrhage; exchange transfusion; severe anemia with hypovolemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Packed RBC", bodysite: "Packed RBC", referencetext: "Blood product", clinicalindication: "Anemia; blood loss; chronic transfusion; thalassemia; sickle cell disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Plasma", bodysite: "Plasma", referencetext: "Blood product", clinicalindication: "Coagulation factor replacement; TTP; liver disease; massive transfusion", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cryoprecipitate", bodysite: "Cryoprecipitate", referencetext: "Blood product", clinicalindication: "Fibrinogen deficiency; hemophilia A; von Willebrand disease; DIC", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Platelets", bodysite: "Platelets", referencetext: "Blood product", clinicalindication: "Thrombocytopenia; platelet dysfunction; bleeding; chemotherapy; bone marrow failure", agegroup: "ADULT", sex: "ANY" },
  { testcode: "G6PD Titer", bodysite: "Venous blood", referencemin: "8.8", referencemax: "13.4", clinicalindication: "G6PD deficiency; hemolytic anemia; drug-induced hemolysis; neonatal jaundice", agegroup: "ADULT", sex: "ANY" },
  { testcode: "G6PD Screen", bodysite: "Venous blood", referencetext: "Normal", clinicalindication: "G6PD deficiency screening; pre-medication assessment; hemolysis risk", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Direct coomb test", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Autoimmune hemolytic anemia; hemolytic disease of newborn; drug-induced hemolysis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Indirect coomb test", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Antibody screening; pre-transfusion; pregnancy; Rh incompatibility", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rh Ab titer", bodysite: "Venous blood", referencetext: "< 1:16", clinicalindication: "Rh incompatibility; pregnancy monitoring; hemolytic disease of newborn", agegroup: "ADULT", sex: "F" },
  { testcode: "Hemoglobin H preparation", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Alpha thalassemia; hemoglobin H disease; thalassemia screening", agegroup: "ADULT", sex: "ANY" },
  
  // Electrophoresis (7 tests)
  { testcode: "Hb Electrophoresis HPLC", bodysite: "Venous blood", referencetext: "HbA >95%, HbA2 <3.5%, HbF <2%", clinicalindication: "Hemoglobinopathy; thalassemia; sickle cell disease; abnormal hemoglobin variants", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1 by HPLC", bodysite: "Venous blood", referencemin: "4.0", referencemax: "5.6", paniclow: "3.0", panichigh: "14.0", clinicalindication: "Diabetes monitoring; glycemic control; prediabetes screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "SPE", bodysite: "Venous blood", referencetext: "Albumin 3.5-5.0, Globulins normal pattern", clinicalindication: "Multiple myeloma; monoclonal gammopathy; liver disease; immune disorders; protein abnormalities", agegroup: "ADULT", sex: "ANY" },
  { testcode: "UPE", bodysite: "Urine", referencetext: "No abnormal proteins", clinicalindication: "Bence Jones protein; multiple myeloma; light chain disease; proteinuria evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Urine Bence Jones Protein Electrophoresis", bodysite: "Urine", referencetext: "Negative", clinicalindication: "Multiple myeloma; light chain disease; monoclonal gammopathy; kidney disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Serum immune fixation", bodysite: "Venous blood", referencetext: "No monoclonal protein", clinicalindication: "Multiple myeloma; monoclonal gammopathy; paraproteinemia; immunoglobulin disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Hb capillary's Electrophoresis", bodysite: "Venous blood", referencetext: "Normal hemoglobin pattern", clinicalindication: "Hemoglobinopathy screening; thalassemia; sickle cell disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1c by capillary's Electrophoresis", bodysite: "Venous blood", referencemin: "4.0", referencemax: "5.6", paniclow: "3.0", panichigh: "14.0", clinicalindication: "Diabetes control; glycemic monitoring; diabetes diagnosis", agegroup: "ADULT", sex: "ANY" },
  
  // ==================== SEROLOGY (34 tests) ====================
  
  // TORCH Panel (8 tests)
  { testcode: "Toxo IgG", bodysite: "Venous blood", referencetext: "< 1.6 IU/mL (Negative)", clinicalindication: "Toxoplasmosis infection; pregnancy screening; immunocompromised patients; congenital toxoplasmosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Toxo IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute toxoplasmosis; congenital infection risk; primary infection; pregnancy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CMV IgG", bodysite: "Venous blood", referencetext: "< 6.0 AU/mL (Negative)", clinicalindication: "CMV infection status; transplant screening; pregnancy; immunocompromised patients", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CMV IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute CMV infection; congenital CMV; primary infection; mononucleosis syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rubella IgG", bodysite: "Venous blood", referencetext: "> 10 IU/mL (Immune)", clinicalindication: "Rubella immunity; pregnancy screening; vaccination status; congenital rubella prevention", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rubella IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute rubella infection; congenital rubella syndrome; primary infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HSV 1/2 IgG", bodysite: "Venous blood", referencetext: "Negative or Positive (prior exposure)", clinicalindication: "Herpes simplex virus infection; genital herpes; oral herpes; encephalitis; neonatal herpes", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HSV 1/2 IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute HSV infection; primary herpes; neonatal herpes; herpes encephalitis", agegroup: "ADULT", sex: "ANY" },
  
  // Hepatitis & HIV (13 tests)
  { testcode: "HBs Ag titer", bodysite: "Venous blood", referencetext: "< 0.05 IU/mL (Negative)", clinicalindication: "Hepatitis B infection; chronic HBV; liver disease; blood donor screening; vaccination response", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HBs Ag screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Hepatitis B screening; blood donor screening; acute HBV; chronic carrier", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HBs Ab IgG", bodysite: "Venous blood", referencetext: "> 10 mIU/mL (Immune)", clinicalindication: "HBV immunity; vaccination response; post-infection immunity; vaccine efficacy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Hbe Ag", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "HBV replication; infectivity; chronic hepatitis B; treatment monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Hbe Ab IgG", bodysite: "Venous blood", referencetext: "Negative or Positive", clinicalindication: "HBV seroconversion; low infectivity; chronic HBV; treatment response", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HBc Ab IgG", bodysite: "Venous blood", referencetext: "Negative or Positive (prior exposure)", clinicalindication: "Past or current HBV infection; occult HBV; window period; chronic hepatitis B", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HBV screen", bodysite: "Venous blood", referencetext: "Comprehensive HBV panel", clinicalindication: "Complete hepatitis B evaluation; infection status; immunity assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HCV IgG titer", bodysite: "Venous blood", referencetext: "< 1.0 (Negative)", clinicalindication: "Hepatitis C infection; chronic liver disease; cirrhosis; blood donor screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HCV screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "HCV screening; blood donor testing; liver disease evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HAV Titer", bodysite: "Venous blood", referencetext: "Negative or Positive (immune)", clinicalindication: "Hepatitis A immunity; vaccination status; acute hepatitis A; outbreak investigation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HAV screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute hepatitis A; food-borne outbreak; travel-related hepatitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HEV screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Hepatitis E; acute hepatitis; pregnancy; travel-related infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HIV titer", bodysite: "Venous blood", referencetext: "< 1.0 (Negative)", clinicalindication: "HIV infection; AIDS; immunodeficiency; blood donor screening; pre-exposure prophylaxis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HIV screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "HIV screening; blood donor testing; high-risk exposure; STD screening", agegroup: "ADULT", sex: "ANY" },
  
  // General Serology (13 tests)
  { testcode: "VDRL", bodysite: "Venous blood", referencetext: "Non-reactive", clinicalindication: "Syphilis screening; STD evaluation; prenatal screening; neurosyphilis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TPHA", bodysite: "Venous blood", referencetext: "Non-reactive", clinicalindication: "Syphilis confirmation; treponemal infection; late syphilis; treatment monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ASOT titer", bodysite: "Venous blood", referencetext: "< 200 IU/mL", clinicalindication: "Streptococcal infection; rheumatic fever; post-streptococcal glomerulonephritis; pharyngitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pt", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Pregnancy test; early pregnancy detection; ectopic pregnancy; threatened abortion", agegroup: "ADULT", sex: "F" },
  { testcode: "Crp titer", bodysite: "Venous blood", referencetext: "< 3.0 mg/L", panichigh: "10.0", clinicalindication: "Inflammation; infection; cardiovascular risk; autoimmune disease; sepsis; tissue injury", agegroup: "ADULT", sex: "ANY" },
  { testcode: "RF", bodysite: "Venous blood", referencetext: "< 14 IU/mL", clinicalindication: "Rheumatoid arthritis; autoimmune disorders; Sjögren's syndrome; mixed connective tissue disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rose bengal test", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Brucellosis; undulant fever; occupational exposure; zoonotic infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TP", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Tuberculosis screening; latent TB; TB exposure; immunocompromised patients", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Mo", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Infectious mononucleosis; EBV infection; atypical lymphocytosis; pharyngitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Typhoid IgM IgG", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Typhoid fever; enteric fever; Salmonella typhi infection; prolonged fever", agegroup: "ADULT", sex: "ANY" },
  { testcode: "H.Pylori Ab", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "H. pylori infection; peptic ulcer disease; gastritis; dyspepsia; gastric cancer risk", agegroup: "ADULT", sex: "ANY" },
  { testcode: "H.pylori Ag", bodysite: "Stool", referencetext: "Negative", clinicalindication: "Active H. pylori infection; post-treatment assessment; peptic ulcer; gastritis", agegroup: "ADULT", sex: "ANY" },
];

export async function POST() {
  try {
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
              eq(testReferenceRanges.testcode, data.testcode),
              eq(testReferenceRanges.agegroup, data.agegroup || "ADULT"),
              eq(testReferenceRanges.sex, data.sex || "ANY")
            )
          )
          .returning();

        if (result.length > 0) {
          updated++;
          if (updated % 20 === 0) {
            console.log(`✅ Updated ${updated} test references...`);
          }
        } else {
          notFound++;
        }
      } catch (error) {
        errors.push(`${data.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} test references with medical data (Part 2: Hematology & Serology)`,
      updated,
      notFound,
      total: medicalData.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update medical references", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

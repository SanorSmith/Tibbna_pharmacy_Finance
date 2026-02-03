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

// Part 3: IMMUNOLOGY (51 tests)
const medicalData: MedicalReferenceData[] = [
  // Tumor Markers (8 tests)
  { testcode: "AFP", bodysite: "Venous blood", referencetext: "< 10 ng/mL", panichigh: "400", clinicalindication: "Hepatocellular carcinoma; germ cell tumors; liver cancer; testicular cancer; ovarian cancer", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CEA", bodysite: "Venous blood", referencetext: "< 5.0 ng/mL", panichigh: "20", clinicalindication: "Colorectal cancer; GI malignancies; tumor monitoring; lung cancer; breast cancer", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CA 125", bodysite: "Venous blood", referencetext: "< 35 U/mL", panichigh: "200", clinicalindication: "Ovarian cancer; pelvic mass; gynecologic malignancy; endometriosis; treatment monitoring", agegroup: "ADULT", sex: "F" },
  { testcode: "CA 15-3", bodysite: "Venous blood", referencetext: "< 30 U/mL", panichigh: "100", clinicalindication: "Breast cancer monitoring; metastatic disease; treatment response; recurrence detection", agegroup: "ADULT", sex: "F" },
  { testcode: "CA 19-9", bodysite: "Venous blood", referencetext: "< 37 U/mL", panichigh: "1000", clinicalindication: "Pancreatic cancer; biliary cancer; GI malignancies; cholangiocarcinoma; treatment monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PSA", bodysite: "Venous blood", referencetext: "< 4.0 ng/mL", panichigh: "20", clinicalindication: "Prostate cancer screening; BPH; prostate disorders; PSA velocity; treatment monitoring", agegroup: "ADULT", sex: "M" },
  { testcode: "f-PSA", bodysite: "Venous blood", referencetext: "> 25% free/total ratio", clinicalindication: "Prostate cancer risk assessment; BPH differentiation; PSA elevation evaluation", agegroup: "ADULT", sex: "M" },
  { testcode: "PAP", bodysite: "Venous blood", referencetext: "< 3.0 ng/mL", clinicalindication: "Prostate cancer; metastatic prostate cancer; treatment monitoring", agegroup: "ADULT", sex: "M" },
  
  // Autoimmune & Immunoglobulins (20 tests)
  { testcode: "ACL IgG", bodysite: "Venous blood", referencetext: "< 15 GPL U/mL", clinicalindication: "Antiphospholipid syndrome; recurrent thrombosis; pregnancy loss; lupus anticoagulant", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ACL IgM", bodysite: "Venous blood", referencetext: "< 12 MPL U/mL", clinicalindication: "Antiphospholipid syndrome; thrombosis; recurrent miscarriage; SLE", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APL IgG", bodysite: "Venous blood", referencetext: "< 20 GPL U/mL", clinicalindication: "Antiphospholipid syndrome; thrombophilia; pregnancy complications; autoimmune disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APL IgM", bodysite: "Venous blood", referencetext: "< 20 MPL U/mL", clinicalindication: "Antiphospholipid syndrome; recurrent thrombosis; pregnancy loss", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ttg IgG", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Celiac disease; gluten sensitivity; dermatitis herpetiformis; malabsorption", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ttg IgA", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Celiac disease screening; gluten enteropathy; villous atrophy; malabsorption syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AGA IgG", bodysite: "Venous blood", referencetext: "< 25 U/mL", clinicalindication: "Celiac disease; gluten sensitivity; malabsorption; pediatric screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AGA IgA", bodysite: "Venous blood", referencetext: "< 25 U/mL", clinicalindication: "Celiac disease; gluten intolerance; GI symptoms; malabsorption", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IgE (ELISA)", bodysite: "Venous blood", referencetext: "< 100 IU/mL", panichigh: "1000", clinicalindication: "Allergic disorders; asthma; atopic dermatitis; parasitic infections; hyper-IgE syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IgE (COBAS E4)", bodysite: "Venous blood", referencetext: "< 100 IU/mL", panichigh: "1000", clinicalindication: "Allergy evaluation; allergic rhinitis; food allergy; drug allergy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IgM", bodysite: "Venous blood", referencemin: "40", referencemax: "230", paniclow: "20", panichigh: "400", clinicalindication: "Immunodeficiency; acute infection; B-cell disorders; Waldenström macroglobulinemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IgG", bodysite: "Venous blood", referencemin: "700", referencemax: "1600", paniclow: "400", panichigh: "2000", clinicalindication: "Immunodeficiency; chronic infection; immune status; hypogammaglobulinemia; multiple myeloma", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IgA", bodysite: "Venous blood", referencemin: "70", referencemax: "400", paniclow: "40", panichigh: "600", clinicalindication: "IgA deficiency; mucosal immunity; celiac disease; selective immunodeficiency", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TB", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Tuberculosis; latent TB; TB exposure; immunocompromised screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Transferrin", bodysite: "Venous blood", referencemin: "200", referencemax: "360", clinicalindication: "Iron metabolism; anemia; iron deficiency; hemochromatosis; nutritional status", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Beta 2GP IgM", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Antiphospholipid syndrome; thrombosis; pregnancy loss; autoimmune disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Beta 2GP IgG", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Antiphospholipid syndrome; recurrent thrombosis; SLE; pregnancy complications", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-reticulin G ELISA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease; gluten enteropathy; dermatitis herpetiformis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-reticulin G COBAS", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease screening; malabsorption syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-reticulin A ELISA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease; gluten sensitivity; GI autoimmunity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-reticulin A COBAS", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease evaluation; malabsorption", agegroup: "ADULT", sex: "ANY" },
  
  // Additional Autoimmune (23 tests)
  { testcode: "EMA IgG", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease; gluten enteropathy; dermatitis herpetiformis; villous atrophy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "EMA IgA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Celiac disease; gluten sensitivity; malabsorption; specific celiac marker", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ALK", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Autoimmune hepatitis type 1; chronic hepatitis; liver autoimmunity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-SLA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Autoimmune hepatitis; severe liver disease; chronic hepatitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "EBV IgG", bodysite: "Venous blood", referencetext: "Negative or Positive (prior infection)", clinicalindication: "Epstein-Barr virus; infectious mononucleosis; past EBV infection; immunity status", agegroup: "ADULT", sex: "ANY" },
  { testcode: "EBV IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute EBV infection; infectious mononucleosis; primary infection; pharyngitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "A1AT", bodysite: "Venous blood", referencemin: "90", referencemax: "200", paniclow: "50", clinicalindication: "Alpha-1 antitrypsin deficiency; COPD; emphysema; liver disease; chronic lung disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LPA", bodysite: "Venous blood", referencetext: "< 30 mg/dL", panichigh: "100", clinicalindication: "Cardiovascular risk; atherosclerosis; coronary artery disease; stroke risk", agegroup: "ADULT", sex: "ANY" },
  { testcode: "APO A1", bodysite: "Venous blood", referencemin: "120", referencemax: "160", clinicalindication: "HDL metabolism; cardiovascular risk; lipid disorders; atherosclerosis protection", agegroup: "ADULT", sex: "M" },
  { testcode: "APO A1", bodysite: "Venous blood", referencemin: "140", referencemax: "180", clinicalindication: "HDL metabolism; cardiovascular protection; lipid disorders", agegroup: "ADULT", sex: "F" },
  { testcode: "APO B", bodysite: "Venous blood", referencetext: "< 100 mg/dL", panichigh: "200", clinicalindication: "LDL metabolism; cardiovascular risk; atherosclerosis; familial hypercholesterolemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCT", bodysite: "Venous blood", referencetext: "< 0.5 ng/mL", panichigh: "10.0", clinicalindication: "Sepsis; bacterial infection; systemic inflammation; antibiotic stewardship; ICU monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Calprotectin", bodysite: "Stool", referencetext: "< 50 µg/g", panichigh: "200", clinicalindication: "Inflammatory bowel disease; Crohn's disease; ulcerative colitis; IBS differentiation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Lactoferrin", bodysite: "Stool", referencetext: "< 7.25 µg/g", clinicalindication: "Intestinal inflammation; IBD; infectious colitis; GI inflammation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti-CCP", bodysite: "Venous blood", referencetext: "< 20 U/mL", clinicalindication: "Rheumatoid arthritis; early RA diagnosis; erosive arthritis; RA prognosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ENA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Systemic autoimmune diseases; SLE; Sjögren's syndrome; scleroderma; mixed connective tissue disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ANA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Systemic lupus erythematosus; autoimmune disorders; connective tissue disease; Sjögren's syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti chlamydia IgG", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Chlamydia infection; past infection; pelvic inflammatory disease; infertility; reactive arthritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Anti chlamydia IgM", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Acute chlamydia infection; STD; urethritis; cervicitis; PID", agegroup: "ADULT", sex: "ANY" },
  { testcode: "C3", bodysite: "Venous blood", referencemin: "90", referencemax: "180", paniclow: "50", panichigh: "250", clinicalindication: "Complement deficiency; SLE; glomerulonephritis; immune complex disease; autoimmune disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "C4", bodysite: "Venous blood", referencemin: "10", referencemax: "40", paniclow: "5", panichigh: "60", clinicalindication: "Complement deficiency; SLE; hereditary angioedema; autoimmune disease; immune disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IHS", bodysite: "Tissue", referencetext: "Specific staining pattern", clinicalindication: "Cancer diagnosis; tumor classification; receptor status; prognostic markers; targeted therapy selection", agegroup: "ADULT", sex: "ANY" },
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
      message: `Updated ${updated} test references with medical data (Part 3: Immunology)`,
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

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

// Comprehensive medical reference data for ALL 429 tests
const medicalData: MedicalReferenceData[] = [
  // ==================== ENDOCRINOLOGY (37 tests) ====================
  
  // Thyroid Function Tests (14 tests)
  { testcode: "TSH", bodysite: "Venous blood", referencemin: "0.4", referencemax: "4.0", paniclow: "0.1", panichigh: "10.0", clinicalindication: "Screening for thyroid disorders; monitoring thyroid replacement therapy; evaluating thyroid nodules", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T3", bodysite: "Venous blood", referencemin: "80", referencemax: "200", paniclow: "40", panichigh: "400", clinicalindication: "Hyperthyroidism evaluation; T3 toxicosis; monitoring antithyroid therapy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T4", bodysite: "Venous blood", referencemin: "5.0", referencemax: "12.0", paniclow: "2.0", panichigh: "20.0", clinicalindication: "Thyroid function assessment; hypothyroidism or hyperthyroidism diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FT3", bodysite: "Venous blood", referencemin: "2.3", referencemax: "4.2", paniclow: "1.0", panichigh: "8.0", clinicalindication: "Assessment of thyroid function independent of binding proteins", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FT4", bodysite: "Venous blood", referencemin: "0.8", referencemax: "1.8", paniclow: "0.3", panichigh: "4.0", clinicalindication: "Primary assessment of thyroid function; monitoring thyroid therapy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TG", bodysite: "Venous blood", referencemin: "3", referencemax: "40", clinicalindication: "Monitoring thyroid cancer recurrence post-thyroidectomy; differentiated thyroid cancer follow-up", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TGA", bodysite: "Venous blood", referencetext: "< 4.0 IU/mL", clinicalindication: "Autoimmune thyroid disease; Hashimoto's thyroiditis; thyroid cancer monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ATPO", bodysite: "Venous blood", referencetext: "< 35 IU/mL", clinicalindication: "Autoimmune thyroid disorders; Graves' disease; Hashimoto's thyroiditis; postpartum thyroiditis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TMA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Chronic autoimmune thyroiditis; Hashimoto's disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Rev T3", bodysite: "Venous blood", referencemin: "10", referencemax: "24", clinicalindication: "Non-thyroidal illness syndrome; euthyroid sick syndrome; critical illness", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TRAb", bodysite: "Venous blood", referencetext: "< 1.75 IU/L", clinicalindication: "Graves' disease diagnosis; differentiation of hyperthyroidism causes; predicting relapse", agegroup: "ADULT", sex: "ANY" },
  { testcode: "T3 ut", bodysite: "Venous blood", referencemin: "25", referencemax: "35", clinicalindication: "Assessment of thyroid hormone binding capacity; thyroid function evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TBG", bodysite: "Venous blood", referencemin: "12", referencemax: "28", clinicalindication: "Evaluation of thyroid hormone binding abnormalities; pregnancy; oral contraceptive use", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FTI", bodysite: "Venous blood", referencemin: "4.5", referencemax: "12.0", clinicalindication: "Calculated thyroid function assessment; corrected thyroid status", agegroup: "ADULT", sex: "ANY" },
  
  // Fertility Hormones (15 tests)
  { testcode: "LH", bodysite: "Venous blood", referencemin: "1.5", referencemax: "9.3", clinicalindication: "Infertility evaluation; menstrual disorders; hypogonadism; pituitary function", agegroup: "ADULT", sex: "M" },
  { testcode: "LH", bodysite: "Venous blood", referencemin: "2.4", referencemax: "12.6", clinicalindication: "Infertility evaluation; PCOS; ovulation disorders; amenorrhea", agegroup: "ADULT", sex: "F" },
  { testcode: "FSH", bodysite: "Venous blood", referencemin: "1.5", referencemax: "12.4", clinicalindication: "Male infertility; testicular function assessment; hypogonadism", agegroup: "ADULT", sex: "M" },
  { testcode: "FSH", bodysite: "Venous blood", referencemin: "3.5", referencemax: "12.5", clinicalindication: "Ovarian reserve; menopause; infertility evaluation; amenorrhea", agegroup: "ADULT", sex: "F" },
  { testcode: "PRL", bodysite: "Venous blood", referencemin: "4.0", referencemax: "15.2", clinicalindication: "Galactorrhea; amenorrhea; pituitary adenoma evaluation; erectile dysfunction", agegroup: "ADULT", sex: "M" },
  { testcode: "PRL", bodysite: "Venous blood", referencemin: "4.8", referencemax: "23.3", panichigh: "100", clinicalindication: "Hyperprolactinemia; infertility; menstrual irregularities; prolactinoma", agegroup: "ADULT", sex: "F" },
  { testcode: "E2", bodysite: "Venous blood", referencemin: "30", referencemax: "400", clinicalindication: "Ovarian function; menstrual disorders; IVF monitoring; precocious puberty", agegroup: "ADULT", sex: "F" },
  { testcode: "FE2", bodysite: "Venous blood", referencemin: "0.5", referencemax: "2.0", clinicalindication: "Assessment of bioavailable estradiol; PCOS evaluation", agegroup: "ADULT", sex: "F" },
  { testcode: "PRG", bodysite: "Venous blood", referencemin: "0.2", referencemax: "25.0", clinicalindication: "Ovulation confirmation; luteal phase assessment; pregnancy monitoring; threatened abortion", agegroup: "ADULT", sex: "F" },
  { testcode: "TEST", bodysite: "Venous blood", referencemin: "300", referencemax: "1000", paniclow: "100", panichigh: "1500", clinicalindication: "Hypogonadism; erectile dysfunction; infertility; delayed puberty", agegroup: "ADULT", sex: "M" },
  { testcode: "TEST", bodysite: "Venous blood", referencemin: "15", referencemax: "70", clinicalindication: "PCOS; hirsutism; virilization; androgen excess", agegroup: "ADULT", sex: "F" },
  { testcode: "FTEST", bodysite: "Venous blood", referencemin: "50", referencemax: "210", clinicalindication: "Bioavailable testosterone assessment; hypogonadism evaluation", agegroup: "ADULT", sex: "M" },
  { testcode: "FTEST", bodysite: "Venous blood", referencemin: "1.0", referencemax: "8.5", clinicalindication: "Androgen excess disorders; PCOS; hirsutism", agegroup: "ADULT", sex: "F" },
  { testcode: "β-HCG", bodysite: "Venous blood", referencetext: "< 5 mIU/mL", clinicalindication: "Pregnancy confirmation; ectopic pregnancy; trophoblastic disease; germ cell tumors", agegroup: "ADULT", sex: "F" },
  { testcode: "AMH", bodysite: "Venous blood", referencemin: "1.0", referencemax: "4.0", clinicalindication: "Ovarian reserve assessment; PCOS diagnosis; IVF planning; premature ovarian failure", agegroup: "ADULT", sex: "F" },
  { testcode: "Androg", bodysite: "Venous blood", referencemin: "0.3", referencemax: "3.0", clinicalindication: "Androgen excess evaluation; hirsutism; PCOS", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GA", bodysite: "Venous blood", referencemin: "0", referencemax: "100", panichigh: "1000", clinicalindication: "Zollinger-Ellison syndrome; gastrinoma; pernicious anemia; atrophic gastritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DHEA s", bodysite: "Venous blood", referencemin: "80", referencemax: "560", clinicalindication: "Adrenal androgen production; hirsutism evaluation; adrenal tumors", agegroup: "ADULT", sex: "M" },
  { testcode: "DHEA s", bodysite: "Venous blood", referencemin: "35", referencemax: "430", clinicalindication: "Adrenal disorders; PCOS; hirsutism; virilization", agegroup: "ADULT", sex: "F" },
  { testcode: "Renin", bodysite: "Venous blood", referencemin: "0.5", referencemax: "3.3", clinicalindication: "Hypertension evaluation; hyperaldosteronism; renal artery stenosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "17-OHPROG", bodysite: "Venous blood", referencemin: "0.2", referencemax: "3.0", clinicalindication: "Congenital adrenal hyperplasia; adrenal insufficiency; hirsutism", agegroup: "ADULT", sex: "ANY" },
  
  // Adrenal Gland (3 tests)
  { testcode: "ACTH", bodysite: "Venous blood", referencemin: "10", referencemax: "60", paniclow: "5", panichigh: "100", clinicalindication: "Cushing's syndrome; Addison's disease; adrenal insufficiency; ectopic ACTH syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cortisol", bodysite: "Venous blood", referencemin: "6.2", referencemax: "19.4", paniclow: "2.0", panichigh: "50.0", clinicalindication: "Cushing's syndrome; adrenal insufficiency; stress response; Addison's disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cortisol in urine", bodysite: "Urine (24-hour)", referencemin: "10", referencemax: "100", clinicalindication: "Cushing's syndrome diagnosis; cortisol excess; adrenal hyperfunction", agegroup: "ADULT", sex: "ANY" },
  
  // Bone Metabolism (5 tests)
  { testcode: "PTH", bodysite: "Venous blood", referencemin: "15", referencemax: "65", paniclow: "5", panichigh: "200", clinicalindication: "Hypercalcemia; hypocalcemia; parathyroid disorders; chronic kidney disease; osteoporosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CT", bodysite: "Venous blood", referencetext: "< 8.4 pg/mL", clinicalindication: "Medullary thyroid carcinoma; C-cell hyperplasia; MEN syndrome", agegroup: "ADULT", sex: "M" },
  { testcode: "CT", bodysite: "Venous blood", referencetext: "< 5.0 pg/mL", clinicalindication: "Medullary thyroid carcinoma screening; thyroid nodule evaluation", agegroup: "ADULT", sex: "F" },
  { testcode: "BGP", bodysite: "Venous blood", referencemin: "11", referencemax: "43", clinicalindication: "Bone turnover assessment; osteoporosis monitoring; Paget's disease; bone metastases", agegroup: "ADULT", sex: "ANY" },
  { testcode: "VitD3", bodysite: "Venous blood", referencemin: "30", referencemax: "100", paniclow: "10", panichigh: "150", clinicalindication: "Vitamin D deficiency; osteoporosis; rickets; bone health; malabsorption", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GH", bodysite: "Venous blood", referencetext: "< 10 ng/mL", clinicalindication: "Growth disorders; acromegaly; GH deficiency; pituitary adenoma", agegroup: "ADULT", sex: "ANY" },
  
  // ==================== BIOCHEMISTRY (73 tests) ====================
  
  // Glyco Metabolism (8 tests)
  { testcode: "C-P", bodysite: "Venous blood", referencemin: "0.9", referencemax: "7.1", clinicalindication: "Insulin production assessment; diabetes classification; insulinoma; pancreatic function", agegroup: "ADULT", sex: "ANY" },
  { testcode: "INS", bodysite: "Venous blood", referencemin: "2.6", referencemax: "24.9", clinicalindication: "Hypoglycemia; insulin resistance; insulinoma; metabolic syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pro-insulin", bodysite: "Venous blood", referencetext: "< 11 pmol/L", clinicalindication: "Insulinoma; beta-cell function; prediabetes", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IAA", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Type 1 diabetes; autoimmune diabetes; insulin autoimmune syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GAD65", bodysite: "Venous blood", referencetext: "< 5 IU/mL", clinicalindication: "Type 1 diabetes; LADA; autoimmune diabetes; stiff-person syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IGF-I", bodysite: "Venous blood", referencemin: "115", referencemax: "307", clinicalindication: "Growth disorders; acromegaly; GH deficiency; nutritional assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "IR HOMA", bodysite: "Venous blood", referencetext: "< 2.5", clinicalindication: "Insulin resistance; metabolic syndrome; diabetes risk; PCOS", agegroup: "ADULT", sex: "ANY" },
  { testcode: "OGTT", bodysite: "Venous blood", referencetext: "< 140 mg/dL (2hr)", clinicalindication: "Diabetes mellitus diagnosis; gestational diabetes; impaired glucose tolerance; prediabetes", agegroup: "ADULT", sex: "ANY" },
  
  // Cardiac Markers (5 tests)
  { testcode: "MB", bodysite: "Venous blood", referencetext: "< 107 ng/mL", panichigh: "300", clinicalindication: "Early myocardial infarction; rhabdomyolysis; muscle injury; cardiac necrosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Trop I", bodysite: "Venous blood", referencetext: "< 0.04 ng/mL", panichigh: "0.4", clinicalindication: "Acute coronary syndrome; myocardial infarction; cardiac injury; unstable angina", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Trop I screen", bodysite: "Venous blood", referencetext: "Negative", clinicalindication: "Rapid MI screening; chest pain evaluation; emergency cardiac assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CK-MB", bodysite: "Venous blood", referencetext: "< 5.0 ng/mL", panichigh: "25", clinicalindication: "Myocardial infarction; cardiac muscle damage; post-cardiac surgery monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DD", bodysite: "Venous blood", referencetext: "< 0.5 µg/mL", panichigh: "4.0", clinicalindication: "Pulmonary embolism; DVT; thrombosis; DIC; disseminated intravascular coagulation", agegroup: "ADULT", sex: "ANY" },
  
  // Lipid Profile (4 tests)
  { testcode: "CHOL", bodysite: "Venous blood", referencetext: "< 200 mg/dL", panichigh: "400", clinicalindication: "Cardiovascular risk; hyperlipidemia; atherosclerosis; coronary artery disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Trig", bodysite: "Venous blood", referencetext: "< 150 mg/dL", panichigh: "1000", clinicalindication: "Cardiovascular risk; pancreatitis; metabolic syndrome; familial hypertriglyceridemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HDL", bodysite: "Venous blood", referencemin: "40", referencemax: "60", paniclow: "20", panichigh: "100", clinicalindication: "Cardiovascular protection; lipid disorders; atherosclerosis risk", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LDL", bodysite: "Venous blood", referencetext: "< 100 mg/dL", panichigh: "190", clinicalindication: "Cardiovascular risk; atherosclerosis; hypercholesterolemia; CAD risk", agegroup: "ADULT", sex: "ANY" },
  
  // Liver Function (6 tests)
  { testcode: "TSB", bodysite: "Venous blood", referencemin: "0.3", referencemax: "1.2", paniclow: "0.1", panichigh: "15.0", clinicalindication: "Jaundice; liver disease; hemolysis; Gilbert's syndrome; biliary obstruction", agegroup: "ADULT", sex: "ANY" },
  { testcode: "DB", bodysite: "Venous blood", referencemin: "0.0", referencemax: "0.3", clinicalindication: "Cholestasis; biliary obstruction; liver disease; conjugated hyperbilirubinemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ALT/GPT", bodysite: "Venous blood", referencemin: "7", referencemax: "56", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; hepatitis; hepatotoxicity; NAFLD; drug-induced liver injury", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AST/GOT", bodysite: "Venous blood", referencemin: "10", referencemax: "40", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; myocardial infarction; muscle disorders; hepatitis; cirrhosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Alp", bodysite: "Venous blood", referencemin: "30", referencemax: "120", paniclow: "20", panichigh: "1000", clinicalindication: "Liver disease; bone disorders; cholestasis; Paget's disease; biliary obstruction", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GGT", bodysite: "Venous blood", referencemin: "9", referencemax: "48", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; alcohol abuse; cholestasis; biliary obstruction; hepatobiliary disease", agegroup: "ADULT", sex: "M" },
  { testcode: "GGT", bodysite: "Venous blood", referencemin: "7", referencemax: "32", paniclow: "5", panichigh: "1000", clinicalindication: "Liver disease; cholestasis; biliary disease", agegroup: "ADULT", sex: "F" },
  
  // Renal Function & Electrolytes (50 tests)
  { testcode: "Urea", bodysite: "Venous blood", referencemin: "7", referencemax: "20", paniclow: "5", panichigh: "200", clinicalindication: "Renal function; kidney disease; dehydration; uremia; GI bleeding", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CRE", bodysite: "Venous blood", referencemin: "0.7", referencemax: "1.3", paniclow: "0.5", panichigh: "10.0", clinicalindication: "Renal function; kidney disease; GFR estimation; acute kidney injury", agegroup: "ADULT", sex: "M" },
  { testcode: "CRE", bodysite: "Venous blood", referencemin: "0.6", referencemax: "1.1", paniclow: "0.5", panichigh: "10.0", clinicalindication: "Renal function assessment; chronic kidney disease", agegroup: "ADULT", sex: "F" },
  { testcode: "UA", bodysite: "Venous blood", referencemin: "3.5", referencemax: "7.2", paniclow: "2.0", panichigh: "15.0", clinicalindication: "Gout; hyperuricemia; kidney stones; renal disease; tumor lysis syndrome", agegroup: "ADULT", sex: "M" },
  { testcode: "UA", bodysite: "Venous blood", referencemin: "2.6", referencemax: "6.0", paniclow: "2.0", panichigh: "15.0", clinicalindication: "Gout; hyperuricemia; kidney disease", agegroup: "ADULT", sex: "F" },
  { testcode: "Electrolyte Na-K-Cl", bodysite: "Venous blood", referencetext: "Na 136-145, K 3.5-5.0, Cl 98-107 mmol/L", panictext: "Na <120 or >160, K <2.5 or >6.5", clinicalindication: "Electrolyte imbalance; dehydration; renal disease; acid-base disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Electrolyte Na-K-Ca", bodysite: "Venous blood", referencetext: "Na 136-145, K 3.5-5.0, Ca 8.5-10.5 mmol/L", panictext: "Na <120 or >160, K <2.5 or >6.5, Ca <6.0 or >14.0", clinicalindication: "Electrolyte disorders; parathyroid disease; renal failure", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ca", bodysite: "Venous blood", referencemin: "8.5", referencemax: "10.5", paniclow: "6.0", panichigh: "14.0", clinicalindication: "Hypercalcemia; hypocalcemia; parathyroid disorders; bone disease; malignancy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "K", bodysite: "Venous blood", referencemin: "3.5", referencemax: "5.0", paniclow: "2.5", panichigh: "6.5", clinicalindication: "Hyperkalemia; hypokalemia; cardiac arrhythmias; renal disease; metabolic disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CU", bodysite: "Venous blood", referencemin: "70", referencemax: "140", clinicalindication: "Wilson's disease; copper metabolism disorders; Menkes disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CPK-MB", bodysite: "Venous blood", referencetext: "< 25 U/L", panichigh: "200", clinicalindication: "Myocardial infarction; cardiac muscle damage; post-cardiac procedure", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CPK", bodysite: "Venous blood", referencemin: "30", referencemax: "200", paniclow: "20", panichigh: "10000", clinicalindication: "Muscle damage; rhabdomyolysis; myopathy; myocardial infarction; statin toxicity", agegroup: "ADULT", sex: "M" },
  { testcode: "CPK", bodysite: "Venous blood", referencemin: "25", referencemax: "170", paniclow: "20", panichigh: "10000", clinicalindication: "Muscle disorders; exercise-induced elevation; myositis", agegroup: "ADULT", sex: "F" },
  { testcode: "Fbs/Rbs", bodysite: "Venous blood", referencemin: "70", referencemax: "100", paniclow: "40", panichigh: "400", clinicalindication: "Diabetes mellitus; hypoglycemia; hyperglycemia; metabolic disorders; diabetic ketoacidosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HbA1c", bodysite: "Venous blood", referencemin: "4.0", referencemax: "5.6", paniclow: "3.0", panichigh: "14.0", clinicalindication: "Diabetes monitoring; glycemic control; prediabetes; diabetes diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LA", bodysite: "Venous blood", referencemin: "0.5", referencemax: "2.2", paniclow: "0.3", panichigh: "10.0", clinicalindication: "Lactic acidosis; sepsis; tissue hypoxia; metabolic disorders; shock", agegroup: "ADULT", sex: "ANY" },
  { testcode: "LDH", bodysite: "Venous blood", referencemin: "140", referencemax: "280", paniclow: "100", panichigh: "2000", clinicalindication: "Hemolysis; tissue damage; malignancy; myocardial infarction; liver disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "MG", bodysite: "Venous blood", referencemin: "1.7", referencemax: "2.2", paniclow: "1.0", panichigh: "4.0", clinicalindication: "Hypomagnesemia; hypermagnesemia; cardiac arrhythmias; neuromuscular disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "u-albumin", bodysite: "Urine", referencetext: "< 30 mg/L", panichigh: "300", clinicalindication: "Diabetic nephropathy; early kidney disease; proteinuria; hypertensive nephropathy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PO4", bodysite: "Venous blood", referencemin: "2.5", referencemax: "4.5", paniclow: "1.0", panichigh: "10.0", clinicalindication: "Hyperphosphatemia; hypophosphatemia; renal disease; bone disorders; parathyroid disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ACP", bodysite: "Venous blood", referencemin: "0.5", referencemax: "2.0", clinicalindication: "Prostate cancer; bone metastases; Gaucher disease", agegroup: "ADULT", sex: "M" },
  { testcode: "Fe", bodysite: "Venous blood", referencemin: "60", referencemax: "170", paniclow: "30", panichigh: "500", clinicalindication: "Iron deficiency anemia; hemochromatosis; iron overload; chronic disease", agegroup: "ADULT", sex: "M" },
  { testcode: "Fe", bodysite: "Venous blood", referencemin: "50", referencemax: "150", paniclow: "30", panichigh: "500", clinicalindication: "Iron deficiency; anemia; pregnancy", agegroup: "ADULT", sex: "F" },
  { testcode: "TIBC", bodysite: "Venous blood", referencemin: "250", referencemax: "450", paniclow: "200", panichigh: "600", clinicalindication: "Iron deficiency; anemia; iron metabolism; chronic disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Zn", bodysite: "Venous blood", referencemin: "70", referencemax: "120", clinicalindication: "Zinc deficiency; malnutrition; wound healing; immune function", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Alb", bodysite: "Venous blood", referencemin: "3.5", referencemax: "5.0", paniclow: "2.0", panichigh: "6.0", clinicalindication: "Malnutrition; liver disease; nephrotic syndrome; protein loss; chronic illness", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Globulin", bodysite: "Venous blood", referencemin: "2.0", referencemax: "3.5", clinicalindication: "Liver disease; immune disorders; multiple myeloma; chronic inflammation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TP", bodysite: "Venous blood", referencemin: "6.0", referencemax: "8.0", paniclow: "4.0", panichigh: "10.0", clinicalindication: "Malnutrition; liver disease; kidney disease; dehydration; multiple myeloma", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AMY total", bodysite: "Venous blood", referencemin: "30", referencemax: "110", paniclow: "20", panichigh: "1000", clinicalindication: "Pancreatitis; pancreatic disease; salivary gland disorders; abdominal pain", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Lipase", bodysite: "Venous blood", referencemin: "13", referencemax: "60", panichigh: "600", clinicalindication: "Acute pancreatitis; chronic pancreatitis; pancreatic cancer; abdominal pain", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TCO2", bodysite: "Venous blood", referencemin: "23", referencemax: "29", paniclow: "15", panichigh: "40", clinicalindication: "Acid-base balance; metabolic acidosis; alkalosis; respiratory disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "ABG", bodysite: "Arterial blood", referencetext: "pH 7.35-7.45; pO2 80-100; pCO2 35-45", panictext: "pH <7.20 or >7.60; pO2 <50; pCO2 <20 or >60", clinicalindication: "Respiratory failure; acid-base disorders; oxygenation status; ventilation assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Albumin creatinine ratio", bodysite: "Urine", referencetext: "< 30 mg/g", panichigh: "300", clinicalindication: "Diabetic nephropathy; chronic kidney disease; cardiovascular risk; hypertension", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine protein", bodysite: "Urine (24-hour)", referencetext: "< 150 mg/24hr", panichigh: "3000", clinicalindication: "Proteinuria; nephrotic syndrome; glomerulonephritis; kidney disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine cortisol", bodysite: "Urine (24-hour)", referencemin: "10", referencemax: "100", clinicalindication: "Cushing's syndrome; adrenal hyperfunction; cortisol excess", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine copper", bodysite: "Urine (24-hour)", referencetext: "< 40 µg/24hr", clinicalindication: "Wilson's disease; copper metabolism disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine creatinine", bodysite: "Urine (24-hour)", referencemin: "1.0", referencemax: "2.0", clinicalindication: "Creatinine clearance; renal function; muscle mass assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine Amylase", bodysite: "Urine (24-hour)", referencetext: "< 650 U/24hr", clinicalindication: "Pancreatitis; pancreatic disease; macroamylasemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine calcium", bodysite: "Urine (24-hour)", referencemin: "100", referencemax: "300", clinicalindication: "Hypercalciuria; kidney stones; bone disease; parathyroid disorders", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine chloride", bodysite: "Urine (24-hour)", referencemin: "110", referencemax: "250", clinicalindication: "Electrolyte balance; metabolic alkalosis; volume status", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine magnesium", bodysite: "Urine (24-hour)", referencemin: "73", referencemax: "122", clinicalindication: "Magnesium deficiency; renal magnesium wasting; hypomagnesemia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine phosphorus", bodysite: "Urine (24-hour)", referencemin: "400", referencemax: "1300", clinicalindication: "Phosphate metabolism; renal phosphate wasting; bone disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine potassium", bodysite: "Urine (24-hour)", referencemin: "25", referencemax: "125", clinicalindication: "Hypokalemia; hyperkalemia; renal potassium handling", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine sodium", bodysite: "Urine (24-hour)", referencemin: "40", referencemax: "220", clinicalindication: "Sodium balance; hypertension; volume status; renal sodium handling", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine uric acid", bodysite: "Urine (24-hour)", referencemin: "250", referencemax: "750", clinicalindication: "Gout; kidney stones; uric acid metabolism; tumor lysis syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine oxalic acid", bodysite: "Urine (24-hour)", referencetext: "< 40 mg/24hr", clinicalindication: "Kidney stones; hyperoxaluria; primary hyperoxaluria", agegroup: "ADULT", sex: "ANY" },
  { testcode: "24 Hr Urine Citrate", bodysite: "Urine (24-hour)", referencemin: "320", referencemax: "1240", clinicalindication: "Kidney stones; hypocitraturia; stone prevention", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Micro albuminuria", bodysite: "Urine (24-hour)", referencetext: "< 30 mg/24hr", clinicalindication: "Diabetic nephropathy; early kidney disease; cardiovascular risk", agegroup: "ADULT", sex: "ANY" },
  { testcode: "VMA", bodysite: "Urine (24-hour)", referencetext: "< 7 mg/24hr", clinicalindication: "Pheochromocytoma; neuroblastoma; catecholamine-secreting tumors", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Stone analysis", bodysite: "Kidney stone", referencetext: "Composition analysis", clinicalindication: "Kidney stone composition; stone prevention; metabolic evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fructose seminal", bodysite: "Seminal fluid", referencemin: "120", referencemax: "450", clinicalindication: "Male infertility; seminal vesicle function; ejaculatory duct obstruction", agegroup: "ADULT", sex: "M" },
  { testcode: "CrCL", bodysite: "Serum and Urine", referencemin: "90", referencemax: "120", paniclow: "60", panichigh: "150", clinicalindication: "Renal function; GFR estimation; kidney disease staging; drug dosing", agegroup: "ADULT", sex: "ANY" },
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
      message: `Updated ${updated} test references with medical data (Part 1: Endocrinology & Biochemistry)`,
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

/**
 * Seed Test Reference Ranges
 * Populates the test_reference_ranges table with comprehensive laboratory test data
 * Covers: Biochemistry, Microbiology, Histopathology
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { db } from "./index";
import { testReferenceRanges } from "./schema/test-reference-ranges";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

interface TestEntry {
  testcode: string;
  testname: string;
  labtype: string;
  grouptests: string;
  sampletype: string;
  containertype: string;
  bodysite: string;
  agegroup: string;
  sex: string;
  referencetext: string | null;
  unit: string | null;
  panictext: string | null;
  clinicalindication: string | null;
}

function t(c: string, n: string, l: string, g: string, s: string, ct: string, bs: string, ag: string, sx: string, ref: string | null, u: string | null, pn: string | null, ci: string | null): TestEntry {
  return { testcode: c, testname: n, labtype: l, grouptests: g, sampletype: s, containertype: ct, bodysite: bs, agegroup: ag, sex: sx, referencetext: ref, unit: u, panictext: pn, clinicalindication: ci };
}

const testData: TestEntry[] = [
  // BIOCHEMISTRY - Hormone
  t("TSH","Thyroid stimulating hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","0.4-4.5","mIU/L",null,"Thyroid dysfunction screening/monitoring"),
  t("T3","Total triiodothyronine hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","80-200","ng/dL",null,"Hyperthyroidism evaluation"),
  t("T4","Total thyroxin hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","5.0-12.0","ug/dL",null,"Thyroid status"),
  t("FT3","Free triiodothyronine","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","2.0-4.4","pg/mL",null,"Hyperthyroidism evaluation; T3-toxicosis"),
  t("FT4","Free thyroxin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","0.9-1.7","ng/dL",null,"Hypo/hyperthyroidism evaluation and monitoring"),
  t("TG","Thyroglobulin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","3-40","ng/mL",null,"Thyroid cancer follow-up"),
  t("TGA","Thyroglobulin autoantibody","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative (<4)","IU/mL",null,"Autoimmune thyroid disease marker"),
  t("ATPO","Anti-thyroid peroxidase","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative (<35)","IU/mL",null,"Hashimoto thyroiditis"),
  t("TMA","Thyroid microsomal autoantibody","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune thyroid disease"),
  t("Rev T3","Reverse triiodothyronine","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","10-24","ng/dL",null,"Non-thyroidal illness evaluation"),
  t("TRAb","TSH receptor autoantibody","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative (<1.75)","IU/L",null,"Graves disease diagnosis"),
  t("T3 ut","T3 Up Take","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","24-39","%",null,"Thyroid binding capacity estimation"),
  t("TBG","Thyroxine Binding Globulin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","12-26","ug/mL",null,"Binding protein disorders"),
  t("FTI","Free Thyroxine Index","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","1.0-4.0","Index units",null,"Free thyroid hormone estimate"),
  t("LH","Luteinizing hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Fertility evaluation"),
  t("FSH","Follicular-stimulating hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Ovarian reserve/menopause; infertility"),
  t("PRL","Prolactin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: 4-15; Female: 5-25","ng/mL",null,"Galactorrhea/amenorrhea; pituitary adenoma"),
  t("E2","Estradiol","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Fertility workup; ovarian function"),
  t("FE2","Free Estradiol","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Specialized estrogen status"),
  t("PRG","Progesterone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Ovulation confirmation; luteal function"),
  t("TEST","Testosterone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: 300-1000; Female: 15-70","ng/dL",null,"Hypogonadism; hirsutism/PCOS"),
  t("FTEST","Free testosterone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Androgen status when SHBG altered"),
  t("B-HCG","Beta Human chorionic Gonadotropin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Non-pregnant: <5","mIU/mL",null,"Pregnancy confirmation; ectopic pregnancy"),
  t("AMH","Anti mullerian hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","Female","1.0-3.5","ng/mL",null,"Ovarian reserve assessment; PCOS evaluation"),
  t("Gastrin","Gastrin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","<100","pg/mL",null,"Zollinger-Ellison syndrome; gastrinoma"),
  t("DHEA-S","Dehydroepiandrosterone sulfate","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: 80-560; Female: 35-430","ug/dL",null,"Adrenal androgen excess; adrenal insufficiency"),
  t("Renin","Renin","Biochemistry","Hormone","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","Upright: 0.5-3.5","ng/mL/hr",null,"Hypertension workup; aldosterone/renin ratio"),
  t("17-OHP","17-Hydroxy Progesterone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: 0.5-2.5; Female follicular: 0.2-1.0","ng/mL",null,"Congenital adrenal hyperplasia; hirsutism"),
  t("ACTH","Adrenocorticotropic hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","7-63","pg/mL",null,"Cushing/Addison workup"),
  t("Cortisol","Cortisol","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","AM: 5-25; PM: 2-14","ug/dL",null,"Adrenal insufficiency; Cushing syndrome"),
  t("Cortisol-U","Cortisol in urine","Biochemistry","Hormone","Urine","Sterile urine container","Urinary tract","Adult","All","24h: 10-50","ug/24h",null,"Hypercortisolism screening"),
  t("Androg","Androgen","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Hyperandrogenism evaluation"),
  t("PTH","Parathyroid hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","15-65","pg/mL",null,"Hyper/hypoparathyroidism; Ca disorders"),
  t("CT","Calcitonin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: <10; Female: <5","pg/mL",null,"Medullary thyroid carcinoma screening"),
  t("BGP","Osteocalcin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","11-43","ng/mL",null,"Bone turnover assessment"),
  t("VitD3","25-OH Vitamin D3","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Deficient <20; Insufficient 20-29; Sufficient 30-100","ng/mL",null,"Vitamin D deficiency; bone health"),
  t("GH","Growth hormone","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Acromegaly/GH deficiency workup"),
  t("C-P","C-peptide","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","0.8-3.5","ng/mL",null,"Endogenous insulin production"),
  t("INS","Insulin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","2-25","uIU/mL",null,"Hypoglycemia workup; insulin resistance"),
  t("Pro-INS","Pro-insulin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","<18","pmol/L",null,"Insulinoma/hypoglycemia evaluation"),
  t("IAA","Human insulin autoantibodies","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Type 1 diabetes autoimmunity"),
  t("GAD65","Glutamic acid decarboxylase","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Type 1 diabetes autoimmunity; LADA"),
  t("IGF-I","Insulin-like Growth Factor 1","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Acromegaly/GH deficiency monitoring"),
  t("IR-HOMA","Insulin Resistance HOMA","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Insulin resistance estimation"),
  t("OGTT","Oral Glucose Tolerance Test","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","2h: <140 normal; 140-199 impaired; >=200 diabetes","mg/dL",">400","Diabetes/gestational diabetes evaluation"),
  t("FA","Folic acid","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","3-17","ng/mL",null,"Megaloblastic anemia; nutritional deficiency"),
  t("VB12","Vitamin B12","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","200-900","pg/mL",null,"Megaloblastic anemia; neuropathy"),
  t("Fert","Ferritin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","Male: 30-400; Female: 15-150","ng/mL",null,"Iron deficiency/overload"),
  t("MB","Myoglobin","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","0-85","ng/mL",null,"Muscle injury; early MI adjunct"),
  t("TropI-T","Troponin I Titer","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Acute coronary syndrome evaluation"),
  t("TropI-S","Troponin I Screen","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Rule-in/rule-out myocardial injury"),
  t("CK-MB","Creatine Kinase-MB","Biochemistry","Hormone","Serum","SST tube","Blood (venous)","Adult","All","<5","ng/mL",">25","MI evaluation adjunct"),
  t("DD","D-Dimer","Biochemistry","Hormone","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","<500","ng/mL FEU",null,"VTE/PE rule-out; DIC evaluation"),
  // BIOCHEMISTRY - General (Glyco Metabolism)
  t("FBS","Fasting Blood Sugar","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Fasting: 70-99; Random: 70-140","mg/dL","<54 or >400","Diabetes screening/monitoring"),
  t("HbA1c","Glycated hemoglobin","Biochemistry","General","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal <5.7%; Prediabetes 5.7-6.4%; Diabetes >=6.5","%",null,"Diabetes diagnosis/monitoring"),
  // BIOCHEMISTRY - General (Lipid Profile)
  t("CHOL","Cholesterol","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Desirable <200","mg/dL",null,"Cardiovascular risk assessment"),
  t("Trig","Triglyceride","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Normal <150","mg/dL",null,"Metabolic syndrome; pancreatitis risk"),
  t("HDL","High Density Lipoprotein","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Low <40 (M) / <50 (F); Protective >=60","mg/dL",null,"Cardiovascular risk stratification"),
  t("LDL","Low Density Lipoprotein","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Optimal <100","mg/dL",null,"ASCVD risk management"),
  // BIOCHEMISTRY - General (Renal Function)
  t("Urea","B.Urea","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","7-20","mg/dL",">90","Renal function; dehydration"),
  t("CRE","Creatinine","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Male: 0.74-1.35; Female: 0.59-1.04","mg/dL",">6.0","Renal function; AKI/CKD monitoring"),
  t("UA","Uric Acid","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Male: 3.4-7.0; Female: 2.4-6.0","mg/dL",null,"Gout; tumor lysis risk"),
  t("ELEC-NKCl","Electrolyte (Na-K-Cl)","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Na 135-145; K 3.5-5.1; Cl 98-107","mmol/L","Na <120/>160; K <2.5/>6.5; Cl <80/>120","Dehydration; renal/adrenal disorders"),
  t("ELEC-NKCa","Electrolyte (Na-K-Ca)","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Na 135-145; K 3.5-5.1; Ca 8.5-10.5","mmol/L / mg/dL","Na <120/>160; K <2.5/>6.5; Ca <6.0/>13.0","Electrolyte disorders"),
  t("Ca","Total calcium","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","8.5-10.5","mg/dL","<6.0 or >13.0","Hypo/hypercalcemia"),
  t("K","Potassium","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","3.5-5.1","mmol/L","<2.5 or >6.5","Arrhythmia risk; renal/adrenal disorders"),
  t("ALP","Alkaline phosphatase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","44-147","U/L",null,"Cholestasis; bone disease"),
  t("CU","Copper","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","70-140","ug/dL",null,"Wilson disease"),
  t("CPK-MB","Creatine phosphokinase-MB","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<5","ng/mL",">25","Myocardial injury adjunct"),
  t("CPK","Creatine phosphokinase-Total","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","30-200","U/L",">5000","Rhabdomyolysis; myositis"),
  t("GGT","Gamma Glutamyl transferase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Male: 9-48; Female: 8-35","U/L",null,"Cholestasis; alcohol-related liver disease"),
  // BIOCHEMISTRY - General (Liver Function)
  t("TP","Total protein","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","6.0-8.3","g/dL",null,"Nutritional status; liver/renal disease"),
  t("ALB","Albumin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","3.5-5.5","g/dL",null,"Liver synthetic function; nutritional status"),
  t("TBIL","Total bilirubin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0.1-1.2","mg/dL",">10","Jaundice evaluation; liver disease"),
  t("DBIL","Direct bilirubin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0.0-0.3","mg/dL",null,"Obstructive vs hepatocellular jaundice"),
  t("ALT","Alanine aminotransferase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","7-56","U/L",null,"Hepatocellular injury"),
  t("AST","Aspartate aminotransferase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","10-40","U/L",null,"Hepatocellular injury; cardiac/muscle damage"),
  t("LDH","Lactate dehydrogenase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","120-246","U/L",null,"Hemolysis; tissue damage; tumor marker"),
  t("AMY","Total Amylase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","28-100","U/L",null,"Acute pancreatitis; salivary gland disease"),
  t("LIP","Lipase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0-60","U/L",null,"Acute pancreatitis (more specific than amylase)"),
  // BIOCHEMISTRY - General
  t("CRP","C-Reactive protein titer","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","<5","mg/L",null,"Infection/inflammation marker"),
  t("hsCRP","High-sensitivity CRP","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<1 low risk; 1-3 moderate; >3 high risk","mg/L",null,"Cardiovascular risk stratification"),
  t("RF","Latex (Rheumatoid Factor)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative (<14)","IU/mL",null,"Rheumatoid arthritis; autoimmune disease"),
  t("ASO","Anti streptolysin O test (titer)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","<200","IU/mL",null,"Post-streptococcal disease"),
  t("PCT","Pro calcitonin","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<0.05","ng/mL",">2.0","Bacterial sepsis; antibiotic stewardship"),
  t("ESR","Erythrocyte sedimentation rate","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Male: 0-15; Female: 0-20","mm/hr",null,"Non-specific inflammation marker"),
  t("Fe","Iron","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Male: 65-175; Female: 50-170","ug/dL",null,"Iron deficiency/overload"),
  t("TIBC","Total Iron Binding Capacity","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","250-370","ug/dL",null,"Iron status evaluation"),
  t("Mg","Magnesium","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","1.7-2.2","mg/dL","<1.0 or >4.0","Arrhythmia; seizures; electrolyte imbalance"),
  t("Phos","Phosphorus","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","2.5-4.5","mg/dL",null,"Bone metabolism; renal disease"),
  t("Zn","Zinc","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","60-120","ug/dL",null,"Zinc deficiency; wound healing"),
  t("Pb","Lead","Biochemistry","General","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","<5","ug/dL",">70","Lead poisoning screening"),
  t("NH3","Ammonia","Biochemistry","General","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","15-45","umol/L",">100","Hepatic encephalopathy"),
  t("Lac","Lactate","Biochemistry","General","Plasma Fluoride/Oxalate","Fluoride tube","Blood (venous)","Adult","All","0.5-2.2","mmol/L",">4.0","Tissue hypoxia; sepsis; shock"),
  t("BNP","Brain Natriuretic Peptide","Biochemistry","General","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","<100","pg/mL",">400","Heart failure diagnosis/monitoring"),
  t("NT-proBNP","N-terminal pro-BNP","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<125 (<75y); <450 (>=75y)","pg/mL",null,"Heart failure diagnosis/monitoring"),
  t("Hcy","Homocysteine","Biochemistry","General","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","5-15","umol/L",null,"Cardiovascular risk; B12/folate deficiency"),
  t("Ceru","Ceruloplasmin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","20-60","mg/dL",null,"Wilson disease"),
  t("Hapto","Haptoglobin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","30-200","mg/dL",null,"Hemolytic anemia evaluation"),
  t("Transferrin","Transferrin","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","200-360","mg/dL",null,"Iron transport; nutritional status"),
  t("B2M","Beta-2 Microglobulin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0.7-1.8","mg/L",null,"Lymphoproliferative disorders; renal function"),
  t("GLOB","Globulin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","2.0-3.5","g/dL",null,"Immune status; liver disease"),
  t("ACP","Acid phosphatase","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0.1-0.8","U/L",null,"Prostate disease; bone disease"),
  t("TCO2","Total carbon dioxide","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","23-29","mmol/L","<15 or >40","Acid-base balance"),
  t("ABG","Arterial blood gases","Biochemistry","General","Arterial blood","Heparinized syringe","Radial artery","Adult","All","pH 7.35-7.45; pCO2 35-45; pO2 80-100; HCO3 22-26","mmHg / mmol/L","pH <7.2 or >7.6","Acid-base disorders; respiratory failure"),
  t("ACR","Albumin creatinine ratio","Biochemistry","General","Urine","Sterile urine container","Urinary tract","Adult","All","<30 normal; 30-300 microalbuminuria; >300 macroalbuminuria","mg/g",null,"Diabetic nephropathy; CKD screening"),
  t("mALB","Micro albumin","Biochemistry","General","Urine","Sterile urine container","Urinary tract","Adult","All","<30","mg/L",null,"Early diabetic nephropathy"),
  t("mALB-U","Micro albuminuria","Biochemistry","General","Urine","Sterile urine container","Urinary tract","Adult","All","<20","mg/L",null,"Diabetic nephropathy screening"),
  t("U-Prot-24","24 Hr. Urine for protein","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","<150","mg/24h",null,"Proteinuria quantification; nephrotic syndrome"),
  t("U-Cort-24","24 Hr. Urine for cortisol","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","10-50","ug/24h",null,"Cushing syndrome screening"),
  t("U-Cu-24","24 Hr. Urine for copper","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","<40","ug/24h",">100","Wilson disease diagnosis"),
  t("U-Cre-24","24 Hr. Urine for creatinine","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","Male: 1.0-2.0; Female: 0.8-1.8","g/24h",null,"Creatinine clearance calculation"),
  t("U-Amy-24","24 Hr. Urine for Amylase","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","<400","U/24h",null,"Pancreatitis evaluation"),
  t("U-Ca-24","24 Hr. Urine for calcium","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","100-300","mg/24h",null,"Hypercalciuria; kidney stones"),
  t("U-Cl-24","24 Hr. Urine for chloride","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","110-250","mmol/24h",null,"Electrolyte balance; metabolic alkalosis"),
  t("U-Mg-24","24 Hr. Urine for magnesium","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","3.0-5.0","mmol/24h",null,"Magnesium wasting; renal tubular disorders"),
  t("U-Phos-24","24 Hr. Urine for phosphorus","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","400-1300","mg/24h",null,"Phosphorus metabolism; renal tubular disorders"),
  t("U-K-24","24 Hr. Urine for potassium","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","25-125","mmol/24h",null,"Hypokalemia workup; renal potassium wasting"),
  t("U-Na-24","24 Hr. Urine for sodium","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","40-220","mmol/24h",null,"Hyponatremia workup; salt-wasting"),
  t("U-UA-24","24 Hr. Urine for uric acid","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","250-750","mg/24h",null,"Uric acid nephrolithiasis; gout"),
  t("U-Ox-24","24 Hr. Urine for oxalic acid","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","<40","mg/24h",null,"Hyperoxaluria; calcium oxalate stones"),
  t("U-Cit-24","24 Hr. Urine for Citrate","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All",">320","mg/24h",null,"Hypocitraturia; kidney stone risk"),
  t("VMA","Vanillylmandelic acid","Biochemistry","General","24h Urine","Sterile urine container","Urinary tract","Adult","All","<6.5","mg/24h",null,"Pheochromocytoma; neuroblastoma"),
  t("STONE","Stone analysis","Biochemistry","General","Kidney stone","Sterile container","Urinary tract","Adult","All",null,null,null,"Kidney stone composition; recurrence prevention"),
  t("FRUCT-SF","Fructose for seminal fluid","Biochemistry","General","Seminal fluid","Sterile container","Genital tract (male)","Adult","Male",">=13","umol/ejaculate",null,"Seminal vesicle function; male infertility"),
  t("CrCl","Creatinine Clearance","Biochemistry","General","Serum + 24h Urine","SST tube + Sterile urine container","Blood (venous) / Urinary tract","Adult","All","Male: 97-137; Female: 88-128","mL/min",null,"GFR estimation; renal function"),
  // BIOCHEMISTRY - Serology
  t("ANA","Anti nuclear antibody","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"SLE; autoimmune disease screening"),
  t("dsDNA","Anti-double stranded DNA","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative (<30)","IU/mL",null,"SLE diagnosis/monitoring"),
  t("ANCA","Anti-neutrophil cytoplasmic Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Vasculitis (GPA, MPA)"),
  t("c-ANCA","c-ANCA (PR3)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Granulomatosis with polyangiitis"),
  t("p-ANCA","p-ANCA (MPO)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Microscopic polyangiitis; Churg-Strauss"),
  t("AMA","Anti-mitochondrial Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Primary biliary cholangitis"),
  t("ASMA","Anti-smooth muscle Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hepatitis"),
  t("Anti-CCP","Anti-cyclic citrullinated peptide antibody","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Rheumatoid arthritis (high specificity)"),
  t("C3","Complement 3","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","90-180","mg/dL",null,"SLE activity; immune complex disease"),
  t("C4","Complement 4","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","10-40","mg/dL",null,"SLE activity; hereditary angioedema"),
  t("CH50","Total Complement","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","30-75","U/mL",null,"Complement pathway evaluation"),
  t("IgG","Human immunoglobulin G","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","700-1600","mg/dL",null,"Immunodeficiency; chronic infection"),
  t("IgA","Human immunoglobulin A","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","70-400","mg/dL",null,"IgA deficiency; celiac disease"),
  t("IgM","Human immunoglobulin M","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","40-230","mg/dL",null,"Acute infection; Waldenstrom"),
  t("IgE","Human immunoglobulin E","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<100","IU/mL",null,"Allergic disease; parasitic infection"),
  t("Sp-IgE","Specific IgE panel","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Class 0: <0.35","kU/L",null,"Allergen-specific sensitization"),
  t("ENA","Extractable nuclear antigen","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Connective tissue disease subtyping"),
  t("Anti-GBM","Anti-glomerular basement membrane","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Goodpasture syndrome"),
  t("Anti-PLA2R","Anti-phospholipase A2 receptor","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Primary membranous nephropathy"),
  t("DAT","Direct Antiglobulin Test","Biochemistry","Serology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hemolytic anemia"),
  t("IAT","Indirect Antiglobulin Test","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antibody screening; cross-match"),
  t("TPHA","Treponema pallidum Hemagglutination Assay","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis confirmation"),
  t("Pt","Pregnancy test","Biochemistry","Serology","Serum/Urine","SST tube / Sterile urine container","Blood (venous) / Urinary tract","Adult","Female","Negative (Non-pregnant)","mIU/mL",null,"Pregnancy detection; beta-hCG qualitative"),
  t("Rose-Bengal","Rose Bengal test","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Brucellosis screening"),
  t("TB-Sero","Tuberculosis","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Tuberculosis serological screening"),
  t("Mono","Mononucleosis","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Infectious mononucleosis (heterophile antibody)"),
  t("Typhoid-IgMG","Typhoid IgM, IgG","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Typhoid fever serological diagnosis"),
  t("HP-Ab","H. Pylori Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"H. pylori antibody detection"),
  t("HP-Ag","H. Pylori Ag","Biochemistry","Serology","Stool","Sterile container","GI tract","Adult","All","Negative",null,null,"H. pylori antigen detection; active infection"),
  // BIOCHEMISTRY - Immunity
  t("CD4","CD4 count","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","500-1500","cells/uL","<200","HIV monitoring; immunodeficiency"),
  t("CD8","CD8 count","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","150-1000","cells/uL",null,"Immune status evaluation"),
  t("CD4/CD8","CD4/CD8 ratio","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","1.0-3.0","Ratio",null,"HIV staging; immune dysregulation"),
  t("NK","Natural Killer cells","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","7-31","%",null,"Immune surveillance; recurrent pregnancy loss"),
  t("Lymph-Sub","Lymphocyte subsets","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All",null,null,null,"Immunodeficiency workup"),
  t("IL-6","Interleukin-6","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<7","pg/mL",null,"Cytokine storm; sepsis; inflammation"),
  t("ACL-IgG","Anti Cardiolipin IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","GPL",null,"Antiphospholipid syndrome"),
  t("ACL-IgM","Anti Cardiolipin IgM","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","MPL",null,"Antiphospholipid syndrome"),
  t("APL-IgG","Anti-Phospholipid IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative","GPL",null,"Antiphospholipid syndrome"),
  t("APL-IgM","Anti-Phospholipid IgM","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative","MPL",null,"Antiphospholipid syndrome"),
  t("Ttg-IgG","Anti tissue transglutaminase IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Celiac disease screening"),
  t("Ttg-IgA","Anti tissue transglutaminase IgA","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Celiac disease screening (primary)"),
  t("AGA-IgG","Anti Gliadin IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Celiac disease; gluten sensitivity"),
  t("AGA-IgA","Anti Gliadin IgA","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Celiac disease; gluten sensitivity"),
  t("IgE-COBAS","Human immunoglobulin E","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<100","IU/mL",null,"Allergic disease; parasitic infection (COBAS E4)"),
  t("TB-Ab","Tuberculosis Ab","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Tuberculosis antibody detection"),
  t("B2GP-IgM","Anti-beta-2 glycoprotein IgM","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antiphospholipid syndrome"),
  t("ARetG-E","Anti-reticulin G (ELISA)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease; dermatitis herpetiformis"),
  t("ARetG-C","Anti-reticulin G (COBAS E4)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease; dermatitis herpetiformis"),
  t("ARetA-E","Anti-reticulin A (ELISA)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease; dermatitis herpetiformis"),
  t("ARetA-C","Anti-reticulin A (COBAS E4)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease; dermatitis herpetiformis"),
  t("EMA-IgG","Anti Endomysial IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease confirmation"),
  t("EMA-IgA","Anti Endomysial IgA","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Celiac disease confirmation (primary)"),
  t("ALK","Anti-liver kidney Ab","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hepatitis type 2"),
  t("Anti-SLA","Anti-soluble liver antigen","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hepatitis"),
  t("A1AT","Alpha-1-anti trypsin","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","90-200","mg/dL",null,"Alpha-1 antitrypsin deficiency; emphysema; liver disease"),
  t("LPA","Lipoprotein A","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<30","mg/dL",null,"Cardiovascular risk assessment"),
  t("APO-A1","Apolipoprotein A1","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Male: 120-160; Female: 140-175","mg/dL",null,"Cardiovascular risk; HDL metabolism"),
  t("APO-B","Apolipoprotein B","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<100","mg/dL",null,"Cardiovascular risk; LDL particle number"),
  t("PAP","Prostatic Acid Phosphatase","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","Male","<3.5","ng/mL",null,"Prostate cancer monitoring"),
  t("Calpro","Calprotectin","Biochemistry","Immunity","Stool","Sterile container","GI tract","Adult","All","<50","ug/g",null,"IBD vs IBS differentiation; IBD monitoring"),
  t("Lacto","Lactoferrin","Biochemistry","Immunity","Stool","Sterile container","GI tract","Adult","All","<7.25","ug/g",null,"Intestinal inflammation marker"),
  t("Chlam-IgG","Anti chlamydia (IgG)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Past/chronic chlamydia infection"),
  t("Chlam-IgM","Anti chlamydia (IgM)","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute chlamydia infection"),
  t("IHS","Immuno histochemical Stains","Biochemistry","Immunity","Tissue","FFPE block","Tumor tissue","Adult","All",null,null,null,"Tumor subtyping; immunophenotyping"),
  // BIOCHEMISTRY - Polymerase Chain Reaction
  t("HCV-PCR","PCR For HCV Viral Load","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"Hepatitis C viral load; treatment monitoring"),
  t("HBV-PCR","PCR For HBV Viral Load","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"Hepatitis B viral load; treatment monitoring"),
  t("HIV-PCR","PCR for HIV viral load","Biochemistry","Polymerase Chain Reaction","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected","copies/mL",null,"HIV viral load; ART monitoring"),
  t("TB-PCR","PCR For TB","Biochemistry","Polymerase Chain Reaction","Sputum/BAL/Tissue","Sterile container","Respiratory tract","Adult","All","Not Detected",null,null,"TB diagnosis"),
  t("HPV-PCR","PCR For Human papilloma virus","Biochemistry","Polymerase Chain Reaction","Cervical swab","ThinPrep vial","Cervix","Adult","Female","Not Detected",null,null,"Cervical cancer screening"),
  t("HCV-Geno","PCR For Geno Type HCV","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Hepatitis C genotype determination; treatment selection"),
  t("HCV-GX","PCR For HCV Viral Load By genexpert","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"HCV viral load by GeneXpert platform"),
  t("HBV-GX","PCR For HBV Viral Load By genexpert","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"HBV viral load by GeneXpert platform"),
  t("TB-GX","PCR For TB By genexpert","Biochemistry","Polymerase Chain Reaction","Sputum/BAL/Tissue","Sterile container","Respiratory tract","Adult","All","Not Detected",null,null,"TB diagnosis + rifampicin resistance by GeneXpert"),
  t("HIV-GX","By genexpert PCR for HIV Viral Load","Biochemistry","Polymerase Chain Reaction","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected","copies/mL",null,"HIV viral load by GeneXpert platform"),
  // BIOCHEMISTRY - Hematology
  t("CBC","Complete blood count & Differential","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","WBC 4.5-11; RBC M 4.5-5.5/F 4.0-5.0; Hgb M 13.5-17.5/F 12-16; Plt 150-400","x10^3/uL; x10^6/uL; g/dL; x10^3/uL","WBC <2 or >30; Hgb <7; Plt <50 or >1000","General health; infection; anemia; bleeding"),
  t("Retic","Reticulocyte count","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","0.5-2.5","%",null,"Anemia classification; marrow response"),
  t("BF","Blood Film","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal morphology",null,null,"Morphologic abnormalities; parasites"),
  t("PT-INR","Prothrombin time","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","PT 11-13.5 sec; INR 0.9-1.1 (therapeutic 2-3)","seconds / Ratio","INR >5","Extrinsic pathway; warfarin monitoring"),
  t("PTT","Partial thromboplastin time","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","25-35","seconds",">60","Intrinsic pathway; heparin monitoring"),
  t("FIB","Plasma Fibrinogen","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","200-400","mg/dL","<100","DIC; liver disease; bleeding risk"),
  t("BT","Bleeding Time","Biochemistry","Hematology","N/A","N/A","Forearm skin","Adult","All","2-9","minutes",">15","Platelet function screening"),
  t("CT-Coag","Clotting Time","Biochemistry","Hematology","Whole blood","Plain tube","Blood (venous)","Adult","All","5-10","minutes",">15","Coagulation screening"),
  t("Hgb-Elec","Hemoglobin Electrophoresis","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","HbA >95%; HbA2 2-3.5%; HbF <2%","%",null,"Thalassemia; sickle cell disease"),
  t("G6PD-T","Glucose-6-phosphate dehydrogenase Titer","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal activity","U/g Hb",null,"G6PD deficiency; hemolytic anemia (quantitative)"),
  t("G6PD-S","Glucose-6-phosphate dehydrogenase Screen","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal",null,null,"G6PD deficiency screening (qualitative)"),
  t("BMA","Bone Marrow Aspirate","Biochemistry","Hematology","Bone marrow aspirate","EDTA tube / slides","Bone marrow (iliac crest)","Adult","All","Normal cellularity and morphology",null,null,"Hematologic malignancy; cytopenias"),
  t("BMB","Bone Marrow Biopsy","Biochemistry","Hematology","Bone marrow trephine","Formalin container","Bone marrow (iliac crest)","Adult","All","Normal cellularity",null,null,"Marrow architecture; fibrosis; infiltration"),
  t("Flow","Flow Cytometry","Biochemistry","Hematology","Whole blood/BM EDTA","EDTA tube","Blood (venous) / Bone marrow","Adult","All",null,null,null,"Leukemia/lymphoma immunophenotyping"),
  t("Coomb-D","Direct coomb test","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hemolytic anemia"),
  t("Coomb-I","Indirect coomb test","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antibody screening; cross-match"),
  t("FDP","Fibrin Degradation Products","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","<5","ug/mL",null,"DIC; fibrinolysis"),
  t("AT3","Anti-thrombin III","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","80-120","%",null,"Thrombophilia workup"),
  t("PROT-C","Protein C","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","70-140","%",null,"Thrombophilia workup"),
  t("PROT-S","Protein S","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","60-130","%",null,"Thrombophilia workup"),
  t("FV-Leiden","Factor V Leiden Mutation","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"Hereditary thrombophilia"),
  t("Lupus-AC","Lupus Anticoagulant","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","Negative",null,null,"Antiphospholipid syndrome"),
  t("aCL","Anti-cardiolipin Antibodies","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative","GPL/MPL",null,"Antiphospholipid syndrome"),
  t("CBC-BF","CBC & Blood Film","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","WBC 4.5-11; RBC M 4.5-5.5/F 4.0-5.0; Hgb M 13.5-17.5/F 12-16; Plt 150-400","x10^3/uL; x10^6/uL; g/dL; x10^3/uL","WBC <2 or >30; Hgb <7; Plt <50 or >1000","CBC with peripheral blood smear review"),
  t("Sickling","Sickling test","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Sickle cell disease screening"),
  t("Malaria","Malaria Test","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","No parasites seen",null,null,"Malaria parasite detection"),
  t("ABORH","Blood group & Rh","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All",null,null,null,"ABO and Rh blood group typing"),
  t("XMATCH","Cross match","Biochemistry","Hematology","Whole blood EDTA + Serum","EDTA tube + SST tube","Blood (venous)","Adult","All","Compatible",null,null,"Pre-transfusion compatibility testing"),
  t("WB","Whole blood","Biochemistry","Hematology","Whole blood","Blood bag","Blood (venous)","Adult","All",null,null,null,"Whole blood transfusion product"),
  t("PRBC","Packed RBC","Biochemistry","Hematology","Packed red blood cells","Blood bag","Blood (venous)","Adult","All",null,null,null,"Red blood cell transfusion product"),
  t("FFP","Plasma","Biochemistry","Hematology","Fresh frozen plasma","Blood bag","Blood (venous)","Adult","All",null,null,null,"Fresh frozen plasma transfusion product"),
  t("CRYO","Cryoprecipitate","Biochemistry","Hematology","Cryoprecipitate","Blood bag","Blood (venous)","Adult","All",null,null,null,"Cryoprecipitate transfusion; fibrinogen replacement"),
  t("PLT","Platelets","Biochemistry","Hematology","Platelet concentrate","Blood bag","Blood (venous)","Adult","All",null,null,null,"Platelet transfusion product"),
  t("Rh-Ab","Rh Ab titer","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Rh antibody titer; pregnancy monitoring"),
  t("LE-Cell","Lupus erythematosus preparation","Biochemistry","Hematology","Whole blood","Heparinized tube","Blood (venous)","Adult","All","Negative",null,null,"SLE screening (historical test)"),
  t("HbH","Hemoglobin H preparation","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Alpha-thalassemia detection; HbH inclusions"),
  t("Anti-B2GP1","Anti-beta-2 glycoprotein IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antiphospholipid syndrome"),
  // BIOCHEMISTRY - Infectious Disease
  t("HBsAg-T","HBsAg titer","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis B surface antigen (quantitative)"),
  t("HBsAg-S","HBsAg screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis B surface antigen screening"),
  t("HBs-Ab","HBs Ab IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Immune >=10","mIU/mL",null,"Hepatitis B immunity status"),
  t("HBeAg","HBe Ag","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis B infectivity"),
  t("HBe-Ab","Hbe Ab IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Hepatitis B seroconversion"),
  t("HBc-Ab","HBc Ab IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Past/present HBV infection"),
  t("HBV-Screen","HBV screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"HBV full panel (HBsAg, HBsAb, HBeAg, HBeAb, HBcAb)"),
  t("HCV-T","HCV IgG titer","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis C antibody (quantitative)"),
  t("HCV-S","HCV screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis C antibody screening"),
  t("HAV-T","HAV Titer","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis A antibody (quantitative)"),
  t("HAV-S","HAV screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis A antibody screening"),
  t("HIV-T","HIV titer","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"HIV antibody (quantitative)"),
  t("HIV-S","HIV screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"HIV screening (4th gen Ag/Ab combo)"),
  t("HEV-S","HEV screen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis E antibody screening"),
  t("VDRL","Venereal disease research laboratory","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis screening"),
  t("RPR","Rapid Plasma Reagin","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis screening; treatment monitoring"),
  t("FTA-ABS","FTA-ABS","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis confirmation"),
  t("CMV-IgM","Cytomegalovirus- IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute CMV infection"),
  t("CMV-IgG","Cytomegalovirus- IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"CMV immunity/past infection"),
  t("EBV-IgM","Epstein Barr virus IgM","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute EBV/infectious mononucleosis"),
  t("EBV-IgG","Epstein Barr virus IgG","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Past EBV infection"),
  t("Toxo-IgM","Toxoplasmosis-IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute toxoplasmosis; pregnancy screening"),
  t("Toxo-IgG","Toxoplasmosis-IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Toxoplasma immunity"),
  t("Rubella-IgM","Rubella virus-IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute rubella; pregnancy screening"),
  t("Rubella-IgG","Rubella virus-IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Immune >=10","IU/mL",null,"Rubella immunity"),
  t("HSV-IgM","Herpes simplex virus 1/2-IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute herpes infection"),
  t("HSV-IgG","Herpes simplex virus 1/2-IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Past herpes infection"),
  t("Brucella-IgM","Brucella IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute brucellosis"),
  t("Brucella-IgG","Brucella IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Brucellosis; chronic/past infection"),
  t("Widal","Widal Test","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative (<1:80)",null,null,"Typhoid fever (limited utility)"),
  t("Malaria-RDT","Malaria Rapid Test","Biochemistry","Infectious Disease","Whole blood","EDTA tube","Blood (venous/capillary)","Adult","All","Negative",null,null,"Malaria screening"),
  t("Malaria-Smear","Malaria Thick/Thin Smear","Biochemistry","Infectious Disease","Whole blood","EDTA tube","Blood (venous/capillary)","Adult","All","No parasites seen",null,null,"Malaria diagnosis; species identification"),
  t("Dengue-NS1","Dengue NS1 Antigen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Early dengue diagnosis (day 1-5)"),
  t("Dengue-IgM","Dengue IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute dengue infection"),
  t("Leish-Ab","Leishmania Antibody","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Visceral leishmaniasis"),
  t("TB-IGRA","TB QuantiFERON/IGRA","Biochemistry","Infectious Disease","Whole blood","Special QFT tubes","Blood (venous)","Adult","All","Negative",null,null,"Latent TB infection"),
  t("Mantoux","Tuberculin Skin Test","Biochemistry","Infectious Disease","N/A","N/A","Forearm (intradermal)","Adult","All","<5mm negative; >=10mm positive (varies)","mm",null,"Latent TB screening"),
  // BIOCHEMISTRY - Electrophoresis
  t("SPE","Serum protein Electrophoresis","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","Normal pattern",null,null,"Myeloma; chronic inflammation; liver disease"),
  t("UPE","Urine protein Electrophoresis","Biochemistry","Electrophoresis","24h Urine","Sterile urine container","Urinary tract","Adult","All","No monoclonal band",null,null,"Bence Jones protein; myeloma"),
  t("IFE-S","Serum immune fixation","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","No monoclonal band",null,null,"Monoclonal gammopathy typing"),
  t("BJP","Urine Bence Jones protein Electrophoresis","Biochemistry","Electrophoresis","24h Urine","Sterile urine container","Urinary tract","Adult","All","No monoclonal band",null,null,"Bence Jones protein detection/typing"),
  t("FLC","Free Light Chains (Kappa/Lambda)","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","Kappa 3.3-19.4; Lambda 5.7-26.3; Ratio 0.26-1.65","mg/L",null,"Myeloma monitoring; AL amyloidosis"),
  t("Hb-HPLC","Hb Electrophoresis HPLC","Biochemistry","Electrophoresis","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","HbA >95%; HbA2 2-3.5%; HbF <2%","%",null,"Hemoglobin variants by HPLC"),
  t("HbA1c-HPLC","HbA1C by HPLC","Biochemistry","Electrophoresis","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal <5.7%; Prediabetes 5.7-6.4%; Diabetes >=6.5","%",null,"Glycated hemoglobin by HPLC method"),
  t("Hb-Cap","Hb capillary's Electrophoresis","Biochemistry","Electrophoresis","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","HbA >95%; HbA2 2-3.5%; HbF <2%","%",null,"Hemoglobin variants by capillary electrophoresis"),
  t("HbA1c-Cap","HbA1C by Capillary's Electrophoresis","Biochemistry","Electrophoresis","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal <5.7%; Prediabetes 5.7-6.4%; Diabetes >=6.5","%",null,"Glycated hemoglobin by capillary electrophoresis"),
  // BIOCHEMISTRY - Tumor Markers
  t("AFP","Alpha-fetoprotein","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<10","ng/mL",null,"Hepatocellular carcinoma; germ cell tumors"),
  t("CEA","Carcino embryonic antigen","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","Non-smoker <3; Smoker <5","ng/mL",null,"Colorectal cancer monitoring"),
  t("CA19-9","Cancer Antigen 19-9","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<37","U/mL",null,"Pancreatic/biliary cancer"),
  t("CA125","Cancer Antigen 125","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<35","U/mL",null,"Ovarian cancer monitoring"),
  t("CA15-3","Cancer Antigen 15-3","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<30","U/mL",null,"Breast cancer monitoring"),
  t("PSA","Prostate Specific Antigen","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","Male","<4.0","ng/mL",null,"Prostate cancer screening/monitoring"),
  t("fPSA","Free prostate Specific Antigen","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","Male",null,null,null,"Prostate cancer risk stratification"),
  // MICROBIOLOGY - Abscess
  t("ABS-M","Abscess for C/S","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All","No growth",null,null,"Abscess for C/S (manual)"),
  t("ABS-A","Abscess for C/S","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All","No growth",null,null,"Abscess for C/S (automated)"),
  t("ABS-GS","Gram stain","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("ABS-AFB","Acid Fast Bacilli stain","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("ABS-TCC","Total cells counting","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All",null,"cells/uL",null,"Total cells counting"),
  t("ABS-DWC","Differential WBC Counting","Microbiology","Abscess","Abscess aspirate","Sterile container","Abscess site","Adult","All",null,"%",null,"Differential WBC Counting"),
  // MICROBIOLOGY - Urine Culture
  t("UC-M","Urine for c/s","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All","No significant growth (<10^4 CFU/mL)","CFU/mL",null,"Urine for c/s (manual)"),
  t("UC-DE","Direct Examination","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All",null,null,null,"Direct Examination (GUE)"),
  t("UC-GS","Gram stain","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("UC-AFB","Acid Fast Bacilli stain for T.B (urine)","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain for T.B (T.B in urine)"),
  // MICROBIOLOGY - Stool Culture
  t("SC-M","stool for c/s","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No enteric pathogen isolated",null,null,"Stool for c/s (manual)"),
  t("SC-A","stool for c/s","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No enteric pathogen isolated",null,null,"Stool for c/s (automated)"),
  t("SC-DE","Direct Examination","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All",null,null,null,"Direct Examination (GSE)"),
  t("FOB","Fecal occult blood","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","Negative",null,null,"FOB"),
  t("SC-SS","S.S. agar cultivation","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No growth",null,null,"Cultivation for Salmonella and Shigella"),
  t("SC-TCBS","TCBS agar cultivation Vibrio cholerae","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No growth",null,null,"TCBS agar cultivation for Vibrio cholerae"),
  // MICROBIOLOGY - Blood Culture
  t("BC-M","Blood for C/S","Microbiology","Blood Culture","Blood","Blood culture bottle","Blood (venous)","Adult","All","No growth",null,null,"Blood for C/S (manual)"),
  t("BC-A","Blood for C/S","Microbiology","Blood Culture","Blood","Blood culture bottle","Blood (venous)","Adult","All","No growth",null,null,"Blood for C/S (automated)"),
  // MICROBIOLOGY - Sputum Culture
  t("Sput-M","sputum for C/S","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","Normal flora / No pathogen",null,null,"Sputum for C/S (manual)"),
  t("Sput-A","Sputum for C/S","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","Normal flora / No pathogen",null,null,"Sputum for C/S (automated)"),
  t("Sput-GS","Gram stain","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("Sput-AFB","Acid Fast Bacilli stain for T.B","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain for T.B"),
  t("Sput-Fungal","Mycological Cultivation","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","No growth",null,null,"Fungal identification & anti-fungal Sensitivity"),
  // MICROBIOLOGY - Wound Culture
  t("WC-M","Wound Swab","Microbiology","Wound Culture","Wound swab","Swab in transport medium","Wound site","Adult","All","No pathogen isolated",null,null,"Wound Swab C/S or Ear Swab (manual)"),
  t("WC-A","Wound Swab","Microbiology","Wound Culture","Wound swab","Swab in transport medium","Wound site","Adult","All","No pathogen isolated",null,null,"Wound swab C/S or Ear Swab (automated)"),
  t("WC-Fungal","Mycological Cultivation","Microbiology","Wound Culture","Wound swab","Swab in transport medium","Wound site","Adult","All","No growth",null,null,"Fungal identification & anti-fungal Sensitivity"),
  t("WC-Eye","Eye Swab","Microbiology","Wound Culture","Eye swab","Swab in transport medium","Conjunctiva / Cornea","Adult","All","No organisms seen",null,null,"Gram stain"),
  // MICROBIOLOGY - Nasal Swab
  t("NS","Nasal Swab","Microbiology","Nasal Swab","Nasal swab","Swab in transport medium","Nasal cavity","Adult","All","Normal flora",null,null,"Nasal Swab c/s"),
  // MICROBIOLOGY - Throat Swab
  t("TS","Throat Swab","Microbiology","Throat Swab","Throat swab","Swab in transport medium","Oropharynx","Adult","All","Normal flora",null,null,"Throat Swab c/s"),
  t("TS-GS","Gram stain","Microbiology","Throat Swab","Throat swab","Swab in transport medium","Oropharynx","Adult","All","No organisms seen",null,null,"Gram stain"),
  // MICROBIOLOGY - High Vaginal Swab
  t("HVS-DE","Direct exam and Gram Stain","Microbiology","High Vaginal Swab","High vaginal swab","Swab in transport medium","Vagina (high)","Adult","Female",null,null,null,"Direct exam and Gram stain"),
  t("HVS-TV","Wet preparation Trichomonas vaginales","Microbiology","High Vaginal Swab","High vaginal swab","Swab in transport medium","Vagina (high)","Adult","Female","Not seen",null,null,"Wet preparation for Trichomonas vaginales"),
  t("HVS-GS","Gram stain","Microbiology","High Vaginal Swab","High vaginal swab","Swab in transport medium","Vagina (high)","Adult","Female","No organisms seen",null,null,"Gram stain"),
  t("HVS-Fungal","Mycological Cultivation","Microbiology","High Vaginal Swab","High vaginal swab","Swab in transport medium","Vagina (high)","Adult","Female","No growth",null,null,"Fungal identification & anti-fungal Sensitivity"),
  // MICROBIOLOGY - Urethral Swab
  t("US-DE","Urethral Swab","Microbiology","Urethral Swab","Urethral swab","Swab in transport medium","Urethra","Adult","All",null,null,null,"Direct exam and Gram stain"),
  t("US-GC","Urethral Swab or Urethral Discharge","Microbiology","Urethral Swab","Urethral swab","Swab in transport medium","Urethra","Adult","All","No organisms seen",null,null,"For Gonococcal staining gram stain"),
  t("US-Skin","Skin lesions Swab","Microbiology","Urethral Swab","Skin swab","Swab in transport medium","Skin lesion","Adult","All","No pathogen isolated",null,null,"Skin lesions Swab c/s"),
  t("US-Cerv","Cervical Swab","Microbiology","Urethral Swab","Cervical swab","Swab in transport medium","Cervix","Adult","Female","No pathogen isolated",null,null,"Cervical Swab c/s"),
  t("US-Oral","Oral swab","Microbiology","Urethral Swab","Oral swab","Swab in transport medium","Oral cavity","Adult","All","Normal flora",null,null,"Oral swab c/s"),
  t("US-Burns","Infected burns Swab","Microbiology","Urethral Swab","Burns swab","Swab in transport medium","Burn wound","Adult","All","No pathogen isolated",null,null,"Infected burns Swab c/s"),
  // MICROBIOLOGY - Pleural fluid
  t("PF-M","Pleural Fluid for C/S","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All","No growth",null,null,"Pleural Fluid for C/S (manual)"),
  t("PF-A","Pleural Fluid for C/S","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All","No growth",null,null,"Pleural fluid for C/S (automated)"),
  t("PF-Sugar","Pleural Fluid for Sugar","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All",null,"mg/dL",null,"Pleural Fluid for Sugar"),
  t("PF-Prot","Pleural Fluid for Protein","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All",null,"g/dL",null,"Pleural Fluid for Protein"),
  t("PF-GS","Gram stain","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("PF-AFB","Acid Fast Bacilli stain","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("PF-TCC","Total cells counting","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All",null,"cells/uL",null,"Total cells counting"),
  t("PF-DWC","Differential WBC Counting","Microbiology","Pleural fluid","Pleural fluid","Sterile container","Pleural space","Adult","All",null,"%",null,"Differential WBC Counting"),
  // MICROBIOLOGY - Ascitic fluid
  t("AF-M","Ascitic Fluid for C/S","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All","No growth",null,null,"Ascitic Fluid C/S (manual)"),
  t("AF-A","Ascitic Fluid for C/S","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All","No growth",null,null,"Ascitic Fluid C/S (automated)"),
  t("AF-GS","Gram stain","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("AF-AFB","Acid Fast Bacilli stain","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("AF-TCC","Total cells counting","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All",null,"cells/uL",null,"Total cells counting"),
  t("AF-DWC","Differential WBC Counting","Microbiology","Ascitic fluid","Ascitic fluid","Sterile container","Peritoneal cavity","Adult","All",null,"%",null,"Differential WBC Counting"),
  // MICROBIOLOGY - Synovial fluid
  t("SF-M","Synovial Fluid for C/S","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All","No growth",null,null,"Synovial Fluid C/S (manual)"),
  t("SF-A","Synovial Fluid for C/S","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All","No growth",null,null,"Synovial Fluid C/S (automated)"),
  t("SF-Sugar","Synovial Fluid for Sugar","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All",null,"mg/dL",null,"Synovial Fluid for Sugar"),
  t("SF-Prot","Synovial Fluid for Protein","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All",null,"g/dL",null,"Synovial Fluid for Protein"),
  t("SF-GS","Gram stain","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("SF-AFB","Acid Fast Bacilli stain","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("SF-TCC","Total cells counting","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All",null,"cells/uL",null,"Total cells counting"),
  t("SF-DWC","Differential WBC Counting","Microbiology","Synovial fluid","Synovial fluid","Sterile container","Joint space","Adult","All",null,"%",null,"Differential WBC Counting"),
  // MICROBIOLOGY - Cerebro-Spinal fluid
  t("CSF-M","CSF for C/S","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No growth",null,null,"CSF for C/S (manual)"),
  t("CSF-A","CSF for C/S","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No growth",null,null,"CSF for C/S (automated)"),
  t("CSF-Prot","CSF for Protein","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","15-45","mg/dL",null,"CSF for Protein"),
  t("CSF-Sugar","CSF for Sugar","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","40-70","mg/dL",null,"CSF for Sugar"),
  t("CSF-GS","Gram stain","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("CSF-AFB","Acid Fast Bacilli stain","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("CSF-DWC","Differential WBC Counting","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","WBC <5","cells/uL",null,"Differential WBC Counting"),
  t("CSF-Bruc","CSF for Brucellosis","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","Negative",null,null,"CSF for Brucellosis"),
  t("CSF-Syph","CSF for Syphilis","Microbiology","Cerebro-Spinal fluid","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","Non-reactive",null,null,"CSF for Syphilis"),
  // MICROBIOLOGY - Seminal fluid
  t("SemF-CS","Seminal Fluid for C/S","Microbiology","Seminal fluid","Seminal fluid","Sterile container","Genital tract (male)","Adult","Male","No significant growth",null,null,"Seminal Fluid for C/S"),
  t("SemF-DE","Direct Examination","Microbiology","Seminal fluid","Seminal fluid","Sterile container","Genital tract (male)","Adult","Male",null,null,null,"Direct Examination (SFA)"),
  t("SemF-GC","Gram stain (GC)","Microbiology","Seminal fluid","Seminal fluid","Sterile container","Genital tract (male)","Adult","Male","No organisms seen",null,null,"Gram stain (GC)"),
  t("SemF-AFB","Acid Fast Bacilli stain","Microbiology","Seminal fluid","Seminal fluid","Sterile container","Genital tract (male)","Adult","Male","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  // MICROBIOLOGY - Peritoneal fluid
  t("PerF-M","Peritoneal Fluid for C/S","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All","No growth",null,null,"Peritoneal Fluid C/S (manual)"),
  t("PerF-A","Peritoneal Fluid for C/S","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All","No growth",null,null,"Peritoneal Fluid for C/S"),
  t("PerF-DE","Direct Examination","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All",null,null,null,"Direct Examination"),
  t("PerF-GS","Gram stain","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All","No organisms seen",null,null,"Gram stain"),
  t("PerF-AFB","Acid Fast Bacilli stain","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All","No AFB seen",null,null,"Acid Fast Bacilli stain"),
  t("PerF-TCC","Total cells counting","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All",null,"cells/uL",null,"Total cells counting"),
  t("PerF-DWC","Differential WBC Counting","Microbiology","Peritoneal fluid","Peritoneal fluid","Sterile container","Peritoneal cavity","Adult","All",null,"%",null,"Differential WBC Counting"),
  // HISTOPATHOLOGY - General
  t("H-Thyroid","Thyroid gland","Histopathology","General","Thyroid tissue","10% Neutral Buffered Formalin","Thyroid","Adult","All",null,null,null,"Thyroid gland pathology"),
  t("H-Lung","Lung branch scope","Histopathology","General","Lung biopsy","10% Neutral Buffered Formalin","Lung","Adult","All",null,null,null,"Lung bronchoscopy biopsy"),
  t("H-Brain","Brain","Histopathology","General","Brain biopsy","10% Neutral Buffered Formalin","Brain","Adult","All",null,null,null,"CNS tumor; demyelination; infection"),
  t("H-BreastM","Breast mass","Histopathology","General","Breast tissue","10% Neutral Buffered Formalin","Breast","Adult","Female",null,null,null,"Breast mass evaluation"),
  t("H-Mastec","Mastectomy","Histopathology","General","Mastectomy specimen","10% Neutral Buffered Formalin","Breast","Adult","Female",null,null,null,"Breast cancer staging; margin assessment"),
  t("H-Saliv","Salivary gland","Histopathology","General","Salivary gland tissue","10% Neutral Buffered Formalin","Salivary gland","Adult","All",null,null,null,"Salivary gland pathology"),
  t("H-Skin","Skin","Histopathology","General","Skin biopsy","10% Neutral Buffered Formalin","Skin","Adult","All",null,null,null,"Dermatologic diagnosis"),
  t("H-Bone","Bone","Histopathology","General","Bone biopsy","10% Neutral Buffered Formalin / Decalcifier","Bone","Adult","All",null,null,null,"Bone tumor; osteomyelitis"),
  t("H-Spleen","Spleen","Histopathology","General","Spleen tissue","10% Neutral Buffered Formalin","Spleen","Adult","All",null,null,null,"Spleen pathology"),
  t("H-Append","Appendix","Histopathology","General","Appendix specimen","10% Neutral Buffered Formalin","Appendix","Adult","All",null,null,null,"Appendicitis; appendiceal tumors"),
  t("H-Testis","Testis","Histopathology","General","Testicular tissue","10% Neutral Buffered Formalin","Testis","Adult","Male",null,null,null,"Testicular pathology; germ cell tumors"),
  t("H-Colon","Colon","Histopathology","General","Colon biopsy/resection","10% Neutral Buffered Formalin","Colon","Adult","All",null,null,null,"Colon pathology; colorectal cancer"),
  t("H-Colono","Colonoscopy","Histopathology","General","Colonoscopy biopsy","10% Neutral Buffered Formalin","Colon (endoscopic)","Adult","All",null,null,null,"Colonoscopy biopsy evaluation"),
  t("H-LN","Lymph-node","Histopathology","General","Lymph node biopsy","10% Neutral Buffered Formalin","Lymph node","Adult","All",null,null,null,"Lymphoma; metastatic disease"),
  t("H-Disc","Discectomy- Iaminectomy","Histopathology","General","Disc/lamina tissue","10% Neutral Buffered Formalin","Spine","Adult","All",null,null,null,"Discectomy/laminectomy specimen"),
  t("H-Duod","Duodenal","Histopathology","General","Duodenal biopsy","10% Neutral Buffered Formalin","Duodenum","Adult","All",null,null,null,"Duodenal pathology; celiac disease"),
  t("H-Prostec","Prostatectomy","Histopathology","General","Prostatectomy specimen","10% Neutral Buffered Formalin","Prostate","Adult","Male",null,null,null,"Prostate cancer staging"),
  t("H-ProstCh","Prostatic chips","Histopathology","General","Prostatic chips (TURP)","10% Neutral Buffered Formalin","Prostate","Adult","Male",null,null,null,"BPH; prostate cancer"),
  t("H-CystOv","Cyst-ovary","Histopathology","General","Ovarian cyst","10% Neutral Buffered Formalin","Ovary","Adult","Female",null,null,null,"Ovarian cyst pathology"),
  t("H-Uterus","Uterus","Histopathology","General","Uterus specimen","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Uterine pathology"),
  t("H-UtOv","Uterus with ovary","Histopathology","General","Uterus + ovary specimen","10% Neutral Buffered Formalin","Uterus / Ovary","Adult","Female",null,null,null,"Hysterectomy with oophorectomy"),
  t("H-POG","Product of gestation","Histopathology","General","Products of conception","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Product of gestation evaluation"),
  t("H-DC","D& C","Histopathology","General","Endometrial curettings","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Dilatation and curettage specimen"),
  t("H-Polyp","Polyp","Histopathology","General","Polyp specimen","10% Neutral Buffered Formalin","Various","Adult","All",null,null,null,"Polyp pathology evaluation"),
  t("H-PAP","Pap Smear","Histopathology","General","Cervical scrape","ThinPrep vial","Cervix","Adult","Female","NILM (Negative for intraepithelial lesion)",null,null,"Cervical cancer screening"),
  t("H-CSF","C.S.F Cytology","Histopathology","General","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","Negative for malignant cells",null,null,"CSF cytology evaluation"),
  t("H-Kidney","Kidney","Histopathology","General","Kidney biopsy","10% Neutral Buffered Formalin","Kidney","Adult","All",null,null,null,"Renal pathology; glomerulonephritis"),
  t("H-GB","Gall bladder","Histopathology","General","Gallbladder specimen","10% Neutral Buffered Formalin","Gallbladder","Adult","All",null,null,null,"Cholecystitis; gallbladder cancer"),
  t("H-Corp","Corpectomy","Histopathology","General","Corpectomy specimen","10% Neutral Buffered Formalin / Decalcifier","Spine","Adult","All",null,null,null,"Corpectomy specimen evaluation"),
  t("H-Soft","Soft tissue","Histopathology","General","Soft tissue biopsy","10% Neutral Buffered Formalin","Soft tissue","Adult","All",null,null,null,"Soft tissue tumor; sarcoma"),
  t("H-TTM","Tissue Tumer marker","Histopathology","General","Tissue block","FFPE block","Tumor tissue","Adult","All",null,null,null,"Tissue tumor marker evaluation"),
  t("H-Muscle","Muscles(bx)","Histopathology","General","Muscle biopsy","Fresh / Formalin","Skeletal muscle","Adult","All",null,null,null,"Myopathy; vasculitis"),
  t("H-Sinus","Sinus","Histopathology","General","Sinus tissue","10% Neutral Buffered Formalin","Paranasal sinus","Adult","All",null,null,null,"Sinus pathology; polyps"),
  t("H-LiverC","core biopsy (liver)","Histopathology","General","Liver core biopsy","10% Neutral Buffered Formalin","Liver","Adult","All",null,null,null,"Hepatitis staging; cirrhosis; liver mass"),
  t("H-OvTube","Ovary with tube","Histopathology","General","Ovary + fallopian tube","10% Neutral Buffered Formalin","Ovary / Fallopian tube","Adult","Female",null,null,null,"Salpingo-oophorectomy specimen"),
  t("H-FNAC","F.N.A.C","Histopathology","General","FNA aspirate","Slides / CytoLyt","Various (mass/nodule)","Adult","All",null,null,null,"Fine needle aspiration cytology"),
  t("H-Endo","Endoscopic (bx)","Histopathology","General","Endoscopic biopsy","10% Neutral Buffered Formalin","GI tract (endoscopic)","Adult","All",null,null,null,"Endoscopic biopsy evaluation"),
  t("H-Gyneco","Gynecomastia","Histopathology","General","Breast tissue (male)","10% Neutral Buffered Formalin","Breast","Adult","Male",null,null,null,"Gynecomastia evaluation"),
  t("H-SlideR","Slide review","Histopathology","General","Prepared slides","N/A","Various","Adult","All",null,null,null,"Slide review / second opinion"),
  t("H-Fibroid","Fibroid","Histopathology","General","Uterine fibroid","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Uterine leiomyoma evaluation"),
  t("H-Hemic","Hemicolectomy","Histopathology","General","Hemicolectomy specimen","10% Neutral Buffered Formalin","Colon","Adult","All",null,null,null,"Colorectal cancer staging"),
  t("H-Femur","Femur","Histopathology","General","Femur specimen","10% Neutral Buffered Formalin / Decalcifier","Femur","Adult","All",null,null,null,"Femur pathology; bone tumor"),
  t("H-UlcMass","Ulcerity mass","Histopathology","General","Ulcerative mass biopsy","10% Neutral Buffered Formalin","Various","Adult","All",null,null,null,"Ulcerative mass evaluation"),
  t("H-Ectopic","Ectopic pregnancy","Histopathology","General","Ectopic pregnancy tissue","10% Neutral Buffered Formalin","Fallopian tube","Adult","Female",null,null,null,"Ectopic pregnancy confirmation"),
  t("H-Abort","Abortion","Histopathology","General","Products of conception","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Abortion specimen evaluation"),
  t("H-UBladd","Urinary bladder","Histopathology","General","Bladder biopsy","10% Neutral Buffered Formalin","Urinary bladder","Adult","All",null,null,null,"Urothelial carcinoma; cystitis"),
  t("H-CellBl","Cell block","Histopathology","General","Cell block preparation","10% Neutral Buffered Formalin","Various (fluid)","Adult","All",null,null,null,"Cell block for cytology"),
  t("H-Mass","Mass","Histopathology","General","Mass biopsy/excision","10% Neutral Buffered Formalin","Various","Adult","All",null,null,null,"Mass pathology evaluation"),
  t("H-NeckM","Neak mass","Histopathology","General","Neck mass biopsy","10% Neutral Buffered Formalin","Neck","Adult","All",null,null,null,"Neck mass evaluation"),
  t("H-Endom","Endometriosis","Histopathology","General","Endometriotic tissue","10% Neutral Buffered Formalin","Various (pelvic)","Adult","Female",null,null,null,"Endometriosis confirmation"),
  t("H-TissBn","Tissue &bone","Histopathology","General","Tissue and bone specimen","10% Neutral Buffered Formalin / Decalcifier","Various","Adult","All",null,null,null,"Tissue and bone pathology"),
  t("H-Hernia","Hernia","Histopathology","General","Hernia sac","10% Neutral Buffered Formalin","Abdominal wall","Adult","All",null,null,null,"Hernia sac evaluation"),
  t("H-NasPap","Nasal papilloma","Histopathology","General","Nasal papilloma","10% Neutral Buffered Formalin","Nasal cavity","Adult","All",null,null,null,"Nasal papilloma evaluation"),
  t("H-EndoBx","Endometrial biopsy","Histopathology","General","Endometrial biopsy","10% Neutral Buffered Formalin","Uterus","Adult","Female",null,null,null,"Endometrial pathology; AUB workup"),
  t("H-SpStain","Special Stains","Histopathology","General","Tissue block","FFPE block / Slides","Various","Adult","All",null,null,null,"Organism identification; tissue characterization"),
];

export async function seedTestReferenceRanges() {
  console.log("Seeding test reference ranges...");
  console.log(`Total tests to insert: ${testData.length}`);

  try {
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < testData.length; i += batchSize) {
      const batch = testData.slice(i, i + batchSize);
      const values = batch.map((test) => ({
        workspaceid: WORKSPACE_ID,
        testcode: test.testcode,
        testname: test.testname,
        unit: test.unit || "N/A",
        agegroup: (test.agegroup || "ALL") as "NEO" | "PED" | "ADULT" | "ALL",
        sex: (test.sex || "ANY") as "M" | "F" | "ANY",
        referencetext: test.referencetext || null,
        panictext: test.panictext || null,
        labtype: test.labtype,
        grouptests: test.grouptests,
        sampletype: test.sampletype,
        containertype: test.containertype || null,
        bodysite: test.bodysite || null,
        clinicalindication: test.clinicalindication || null,
        isactive: "Y" as const,
        createdby: CREATED_BY,
      }));

      await db.insert(testReferenceRanges).values(values);
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${testData.length} tests...`);
    }

    console.log(`\n✓ Successfully seeded ${inserted} tests across ${new Set(testData.map(t => t.labtype)).size} lab types`);

    const labCounts: Record<string, number> = {};
    testData.forEach(t => {
      labCounts[t.labtype] = (labCounts[t.labtype] || 0) + 1;
    });
    console.log("\nSummary by lab type:");
    Object.entries(labCounts).sort().forEach(([lab, count]) => {
      console.log(`  ${lab}: ${count} tests`);
    });

  } catch (error) {
    console.error("Error seeding test reference ranges:", error);
    throw error;
  }
}

if (require.main === module) {
  seedTestReferenceRanges()
    .then(() => {
      console.log("\nTest reference ranges seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

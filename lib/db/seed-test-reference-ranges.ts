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
  // BIOCHEMISTRY - Glyco Metabolism
  t("FBS","Fasting Blood Sugar","Biochemistry","Glyco Metabolism","Serum","SST tube","Blood (venous)","Adult","All","Fasting: 70-99; Random: 70-140","mg/dL","<54 or >400","Diabetes screening/monitoring"),
  t("HbA1c","Glycated hemoglobin","Biochemistry","Glyco Metabolism","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal <5.7%; Prediabetes 5.7-6.4%; Diabetes >=6.5","%",null,"Diabetes diagnosis/monitoring"),
  // BIOCHEMISTRY - Lipid Profile
  t("CHOL","Cholesterol","Biochemistry","Lipid Profile","Serum","SST tube","Blood (venous)","Adult","All","Desirable <200","mg/dL",null,"Cardiovascular risk assessment"),
  t("Trig","Triglyceride","Biochemistry","Lipid Profile","Serum","SST tube","Blood (venous)","Adult","All","Normal <150","mg/dL",null,"Metabolic syndrome; pancreatitis risk"),
  t("HDL","High Density Lipoprotein","Biochemistry","Lipid Profile","Serum","SST tube","Blood (venous)","Adult","All","Low <40 (M) / <50 (F); Protective >=60","mg/dL",null,"Cardiovascular risk stratification"),
  t("LDL","Low Density Lipoprotein","Biochemistry","Lipid Profile","Serum","SST tube","Blood (venous)","Adult","All","Optimal <100","mg/dL",null,"ASCVD risk management"),
  // BIOCHEMISTRY - Renal Function
  t("Urea","B.Urea","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","7-20","mg/dL",">90","Renal function; dehydration"),
  t("CRE","Creatinine","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","Male: 0.74-1.35; Female: 0.59-1.04","mg/dL",">6.0","Renal function; AKI/CKD monitoring"),
  t("UA","Uric Acid","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","Male: 3.4-7.0; Female: 2.4-6.0","mg/dL",null,"Gout; tumor lysis risk"),
  t("ELEC-NKCl","Electrolyte (Na-K-Cl)","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","Na 135-145; K 3.5-5.1; Cl 98-107","mmol/L","Na <120/>160; K <2.5/>6.5; Cl <80/>120","Dehydration; renal/adrenal disorders"),
  t("ELEC-NKCa","Electrolyte (Na-K-Ca)","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","Na 135-145; K 3.5-5.1; Ca 8.5-10.5","mmol/L / mg/dL","Na <120/>160; K <2.5/>6.5; Ca <6.0/>13.0","Electrolyte disorders"),
  t("Ca","Total calcium","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","8.5-10.5","mg/dL","<6.0 or >13.0","Hypo/hypercalcemia"),
  t("K","Potassium","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","3.5-5.1","mmol/L","<2.5 or >6.5","Arrhythmia risk; renal/adrenal disorders"),
  t("ALP","Alkaline phosphatase","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","44-147","U/L",null,"Cholestasis; bone disease"),
  t("CU","Copper","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","70-140","ug/dL",null,"Wilson disease"),
  t("CPK-MB","Creatine phosphokinase-MB","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","<5","ng/mL",">25","Myocardial injury adjunct"),
  t("CPK","Creatine phosphokinase-Total","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","30-200","U/L",">5000","Rhabdomyolysis; myositis"),
  t("GGT","Gamma Glutamyl transferase","Biochemistry","Renal Function","Serum","SST tube","Blood (venous)","Adult","All","Male: 9-48; Female: 8-35","U/L",null,"Cholestasis; alcohol-related liver disease"),
  // BIOCHEMISTRY - Liver Function
  t("TP","Total protein","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","6.0-8.3","g/dL",null,"Nutritional status; liver/renal disease"),
  t("ALB","Albumin","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","3.5-5.5","g/dL",null,"Liver synthetic function; nutritional status"),
  t("TBIL","Total bilirubin","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","0.1-1.2","mg/dL",">10","Jaundice evaluation; liver disease"),
  t("DBIL","Direct bilirubin","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","0.0-0.3","mg/dL",null,"Obstructive vs hepatocellular jaundice"),
  t("ALT","Alanine aminotransferase","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","7-56","U/L",null,"Hepatocellular injury"),
  t("AST","Aspartate aminotransferase","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","10-40","U/L",null,"Hepatocellular injury; cardiac/muscle damage"),
  t("LDH","Lactate dehydrogenase","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","120-246","U/L",null,"Hemolysis; tissue damage; tumor marker"),
  t("AMY","Amylase","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","28-100","U/L",null,"Acute pancreatitis; salivary gland disease"),
  t("LIP","Lipase","Biochemistry","Liver Function","Serum","SST tube","Blood (venous)","Adult","All","0-60","U/L",null,"Acute pancreatitis (more specific than amylase)"),
  // BIOCHEMISTRY - General
  t("CRP","C-Reactive Protein","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<5","mg/L",null,"Infection/inflammation marker"),
  t("hsCRP","High-sensitivity CRP","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<1 low risk; 1-3 moderate; >3 high risk","mg/L",null,"Cardiovascular risk stratification"),
  t("RF","Rheumatoid Factor","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","Negative (<14)","IU/mL",null,"Rheumatoid arthritis; autoimmune disease"),
  t("ASO","Anti-Streptolysin O","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<200","IU/mL",null,"Post-streptococcal disease"),
  t("PCT","Procalcitonin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","<0.05","ng/mL",">2.0","Bacterial sepsis; antibiotic stewardship"),
  t("ESR","Erythrocyte Sedimentation Rate","Biochemistry","General","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Male: 0-15; Female: 0-20","mm/hr",null,"Non-specific inflammation marker"),
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
  t("Transferrin","Transferrin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","200-360","mg/dL",null,"Iron transport; nutritional status"),
  t("B2M","Beta-2 Microglobulin","Biochemistry","General","Serum","SST tube","Blood (venous)","Adult","All","0.7-1.8","mg/L",null,"Lymphoproliferative disorders; renal function"),
  // BIOCHEMISTRY - Serology
  t("ANA","Antinuclear Antibody","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"SLE; autoimmune disease screening"),
  t("dsDNA","Anti-double stranded DNA","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative (<30)","IU/mL",null,"SLE diagnosis/monitoring"),
  t("ANCA","Anti-neutrophil cytoplasmic Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Vasculitis (GPA, MPA)"),
  t("c-ANCA","c-ANCA (PR3)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Granulomatosis with polyangiitis"),
  t("p-ANCA","p-ANCA (MPO)","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Microscopic polyangiitis; Churg-Strauss"),
  t("AMA","Anti-mitochondrial Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Primary biliary cholangitis"),
  t("ASMA","Anti-smooth muscle Ab","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hepatitis"),
  t("Anti-CCP","Anti-cyclic citrullinated peptide","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative (<20)","U/mL",null,"Rheumatoid arthritis (high specificity)"),
  t("C3","Complement C3","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","90-180","mg/dL",null,"SLE activity; immune complex disease"),
  t("C4","Complement C4","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","10-40","mg/dL",null,"SLE activity; hereditary angioedema"),
  t("CH50","Total Complement","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","30-75","U/mL",null,"Complement pathway evaluation"),
  t("IgG","Immunoglobulin G","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","700-1600","mg/dL",null,"Immunodeficiency; chronic infection"),
  t("IgA","Immunoglobulin A","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","70-400","mg/dL",null,"IgA deficiency; celiac disease"),
  t("IgM","Immunoglobulin M","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","40-230","mg/dL",null,"Acute infection; Waldenstrom"),
  t("IgE","Total Immunoglobulin E","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","<100","IU/mL",null,"Allergic disease; parasitic infection"),
  t("Sp-IgE","Specific IgE panel","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Class 0: <0.35","kU/L",null,"Allergen-specific sensitization"),
  t("ENA","Extractable Nuclear Antigen panel","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Connective tissue disease subtyping"),
  t("Anti-GBM","Anti-glomerular basement membrane","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Goodpasture syndrome"),
  t("Anti-PLA2R","Anti-phospholipase A2 receptor","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Primary membranous nephropathy"),
  t("DAT","Direct Antiglobulin Test","Biochemistry","Serology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hemolytic anemia"),
  t("IAT","Indirect Antiglobulin Test","Biochemistry","Serology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antibody screening; cross-match"),
  // BIOCHEMISTRY - Immunity
  t("CD4","CD4 count","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","500-1500","cells/uL","<200","HIV monitoring; immunodeficiency"),
  t("CD8","CD8 count","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","150-1000","cells/uL",null,"Immune status evaluation"),
  t("CD4/CD8","CD4/CD8 ratio","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","1.0-3.0","Ratio",null,"HIV staging; immune dysregulation"),
  t("NK","Natural Killer cells","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","7-31","%",null,"Immune surveillance; recurrent pregnancy loss"),
  t("Lymph-Sub","Lymphocyte subsets","Biochemistry","Immunity","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All",null,null,null,"Immunodeficiency workup"),
  t("IL-6","Interleukin-6","Biochemistry","Immunity","Serum","SST tube","Blood (venous)","Adult","All","<7","pg/mL",null,"Cytokine storm; sepsis; inflammation"),
  // BIOCHEMISTRY - Polymerase Chain Reaction
  t("CMV-PCR","CMV DNA PCR","Biochemistry","Polymerase Chain Reaction","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"CMV viremia in immunocompromised"),
  t("EBV-PCR","EBV DNA PCR","Biochemistry","Polymerase Chain Reaction","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"EBV-related lymphoproliferative disease"),
  t("HBV-PCR","HBV DNA PCR","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"Hepatitis B viral load; treatment monitoring"),
  t("HCV-PCR","HCV RNA PCR","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected","IU/mL",null,"Hepatitis C viral load; treatment monitoring"),
  t("HIV-PCR","HIV RNA PCR","Biochemistry","Polymerase Chain Reaction","Plasma EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected","copies/mL",null,"HIV viral load; ART monitoring"),
  t("TB-PCR","TB PCR (GeneXpert)","Biochemistry","Polymerase Chain Reaction","Sputum/BAL/Tissue","Sterile container","Respiratory tract","Adult","All","Not Detected",null,null,"Rapid TB diagnosis; rifampicin resistance"),
  t("COVID-PCR","SARS-CoV-2 PCR","Biochemistry","Polymerase Chain Reaction","Nasopharyngeal swab","VTM tube","Nasopharynx","Adult","All","Not Detected",null,null,"COVID-19 diagnosis"),
  t("HPV-PCR","HPV DNA PCR","Biochemistry","Polymerase Chain Reaction","Cervical swab","ThinPrep vial","Cervix","Adult","Female","Not Detected",null,null,"Cervical cancer screening"),
  t("Parvo-PCR","Parvovirus B19 PCR","Biochemistry","Polymerase Chain Reaction","Serum","SST tube","Blood (venous)","Adult","All","Not Detected",null,null,"Aplastic crisis; hydrops fetalis"),
  t("BK-PCR","BK Virus PCR","Biochemistry","Polymerase Chain Reaction","Plasma/Urine","EDTA tube / Sterile container","Blood (venous) / Urinary tract","Adult","All","Not Detected","copies/mL",null,"BK nephropathy in transplant"),
  t("JC-PCR","JC Virus PCR","Biochemistry","Polymerase Chain Reaction","CSF","Sterile container","CNS (lumbar puncture)","Adult","All","Not Detected",null,null,"PML diagnosis"),
  t("HSV-PCR","HSV 1/2 PCR","Biochemistry","Polymerase Chain Reaction","Swab/CSF","VTM tube / Sterile container","Lesion / CNS","Adult","All","Not Detected",null,null,"Herpes encephalitis; genital herpes"),
  t("VZV-PCR","VZV PCR","Biochemistry","Polymerase Chain Reaction","Swab/CSF","VTM tube / Sterile container","Lesion / CNS","Adult","All","Not Detected",null,null,"Varicella/zoster confirmation"),
  t("Entero-PCR","Enterovirus PCR","Biochemistry","Polymerase Chain Reaction","CSF/Stool","Sterile container","CNS / GI tract","Adult","All","Not Detected",null,null,"Viral meningitis"),
  t("Adeno-PCR","Adenovirus PCR","Biochemistry","Polymerase Chain Reaction","Swab/Stool","VTM tube / Sterile container","Respiratory / GI tract","Adult","All","Not Detected",null,null,"Adenoviral infection in immunocompromised"),
  t("Flu-PCR","Influenza A/B PCR","Biochemistry","Polymerase Chain Reaction","Nasopharyngeal swab","VTM tube","Nasopharynx","Adult","All","Not Detected",null,null,"Influenza diagnosis"),
  t("RSV-PCR","RSV PCR","Biochemistry","Polymerase Chain Reaction","Nasopharyngeal swab","VTM tube","Nasopharynx","Pediatric","All","Not Detected",null,null,"Bronchiolitis; respiratory infection"),
  t("Resp-Panel","Respiratory Pathogen Panel","Biochemistry","Polymerase Chain Reaction","Nasopharyngeal swab","VTM tube","Nasopharynx","Adult","All","Not Detected",null,null,"Multiplex respiratory pathogen detection"),
  t("GI-Panel","GI Pathogen Panel PCR","Biochemistry","Polymerase Chain Reaction","Stool","Sterile container","GI tract","Adult","All","Not Detected",null,null,"Infectious diarrhea workup"),
  t("Mening-Panel","Meningitis/Encephalitis Panel","Biochemistry","Polymerase Chain Reaction","CSF","Sterile container","CNS (lumbar puncture)","Adult","All","Not Detected",null,null,"Rapid CNS infection diagnosis"),
  t("STI-Panel","STI Panel PCR","Biochemistry","Polymerase Chain Reaction","Urethral/Cervical/Urine","Swab / Sterile container","Genital tract / Urinary tract","Adult","All","Not Detected",null,null,"Chlamydia/Gonorrhea/Trichomonas screening"),
  t("CT-NG","Chlamydia/Gonorrhea PCR","Biochemistry","Polymerase Chain Reaction","Urine/Swab","Sterile container / Swab","Genital tract / Urinary tract","Adult","All","Not Detected",null,null,"STI screening"),
  t("BCR-ABL","BCR-ABL1 Quantitative PCR","Biochemistry","Polymerase Chain Reaction","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected","%IS",null,"CML monitoring; treatment response"),
  t("JAK2","JAK2 V617F Mutation","Biochemistry","Polymerase Chain Reaction","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"Polycythemia vera; myeloproliferative neoplasms"),
  t("FLT3","FLT3 Mutation","Biochemistry","Polymerase Chain Reaction","Whole blood/BM","EDTA tube","Blood (venous) / Bone marrow","Adult","All","Not Detected",null,null,"AML prognosis/targeted therapy"),
  t("NPM1","NPM1 Mutation","Biochemistry","Polymerase Chain Reaction","Whole blood/BM","EDTA tube","Blood (venous) / Bone marrow","Adult","All","Not Detected",null,null,"AML prognosis"),
  t("BRCA","BRCA1/BRCA2 Mutation","Biochemistry","Polymerase Chain Reaction","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"Hereditary breast/ovarian cancer risk"),
  t("KRAS","KRAS Mutation","Biochemistry","Polymerase Chain Reaction","Tissue/Blood","FFPE block / EDTA tube","Tumor tissue / Blood (venous)","Adult","All","Not Detected",null,null,"Colorectal/lung cancer targeted therapy"),
  t("EGFR","EGFR Mutation","Biochemistry","Polymerase Chain Reaction","Tissue/Blood","FFPE block / EDTA tube","Tumor tissue / Blood (venous)","Adult","All","Not Detected",null,null,"NSCLC targeted therapy"),
  t("BRAF","BRAF V600E Mutation","Biochemistry","Polymerase Chain Reaction","Tissue/Blood","FFPE block / EDTA tube","Tumor tissue / Blood (venous)","Adult","All","Not Detected",null,null,"Melanoma/colorectal/thyroid cancer"),
  t("MSI","Microsatellite Instability","Biochemistry","Polymerase Chain Reaction","Tissue","FFPE block","Tumor tissue","Adult","All","MSS (Stable)",null,null,"Lynch syndrome; immunotherapy eligibility"),
  t("HER2","HER2 Amplification","Biochemistry","Polymerase Chain Reaction","Tissue","FFPE block","Tumor tissue","Adult","All","Not Amplified",null,null,"Breast/gastric cancer targeted therapy"),
  // BIOCHEMISTRY - Hematology
  t("CBC","Complete Blood Count","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","WBC 4.5-11; RBC M 4.5-5.5/F 4.0-5.0; Hgb M 13.5-17.5/F 12-16; Plt 150-400","x10^3/uL; x10^6/uL; g/dL; x10^3/uL","WBC <2 or >30; Hgb <7; Plt <50 or >1000","General health; infection; anemia; bleeding"),
  t("Retic","Reticulocyte count","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","0.5-2.5","%",null,"Anemia classification; marrow response"),
  t("PBS","Peripheral Blood Smear","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal morphology",null,null,"Morphologic abnormalities; parasites"),
  t("PT","Prothrombin Time","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","11-13.5","seconds",">20","Extrinsic pathway; warfarin monitoring"),
  t("INR","International Normalized Ratio","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","0.9-1.1 (therapeutic 2-3)","Ratio",">5","Warfarin monitoring; coagulopathy"),
  t("aPTT","Activated Partial Thromboplastin Time","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","25-35","seconds",">60","Intrinsic pathway; heparin monitoring"),
  t("FIB","Fibrinogen","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","200-400","mg/dL","<100","DIC; liver disease; bleeding risk"),
  t("BT","Bleeding Time","Biochemistry","Hematology","N/A","N/A","Forearm skin","Adult","All","2-9","minutes",">15","Platelet function screening"),
  t("CT-Coag","Clotting Time","Biochemistry","Hematology","Whole blood","Plain tube","Blood (venous)","Adult","All","5-10","minutes",">15","Coagulation screening"),
  t("Hgb-Elec","Hemoglobin Electrophoresis","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","HbA >95%; HbA2 2-3.5%; HbF <2%","%",null,"Thalassemia; sickle cell disease"),
  t("G6PD","G6PD Activity","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Normal activity","U/g Hb",null,"G6PD deficiency; hemolytic anemia"),
  t("BMA","Bone Marrow Aspirate","Biochemistry","Hematology","Bone marrow aspirate","EDTA tube / slides","Bone marrow (iliac crest)","Adult","All","Normal cellularity and morphology",null,null,"Hematologic malignancy; cytopenias"),
  t("BMB","Bone Marrow Biopsy","Biochemistry","Hematology","Bone marrow trephine","Formalin container","Bone marrow (iliac crest)","Adult","All","Normal cellularity",null,null,"Marrow architecture; fibrosis; infiltration"),
  t("Flow","Flow Cytometry","Biochemistry","Hematology","Whole blood/BM EDTA","EDTA tube","Blood (venous) / Bone marrow","Adult","All",null,null,null,"Leukemia/lymphoma immunophenotyping"),
  t("Coomb-D","Direct Coombs Test","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Negative",null,null,"Autoimmune hemolytic anemia"),
  t("Coomb-I","Indirect Coombs Test","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antibody screening; cross-match"),
  t("FDP","Fibrin Degradation Products","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","<5","ug/mL",null,"DIC; fibrinolysis"),
  t("AT-III","Antithrombin III","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","80-120","%",null,"Thrombophilia workup"),
  t("Prot-C","Protein C Activity","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","70-140","%",null,"Thrombophilia workup"),
  t("Prot-S","Protein S Activity","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","60-130","%",null,"Thrombophilia workup"),
  t("FV-Leiden","Factor V Leiden Mutation","Biochemistry","Hematology","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","Not Detected",null,null,"Hereditary thrombophilia"),
  t("Lupus-AC","Lupus Anticoagulant","Biochemistry","Hematology","Plasma Sodium citrate","Sodium citrate tube","Blood (venous)","Adult","All","Negative",null,null,"Antiphospholipid syndrome"),
  t("aCL","Anti-cardiolipin Antibodies","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative","GPL/MPL",null,"Antiphospholipid syndrome"),
  t("Anti-B2GP1","Anti-Beta2 Glycoprotein I","Biochemistry","Hematology","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Antiphospholipid syndrome"),
  // BIOCHEMISTRY - Infectious Disease
  t("HBsAg","Hepatitis B Surface Antigen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis B screening"),
  t("Anti-HBs","Hepatitis B Surface Antibody","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Immune >=10","mIU/mL",null,"Hepatitis B immunity status"),
  t("HBeAg","Hepatitis B e Antigen","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis B infectivity"),
  t("Anti-HBe","Hepatitis B e Antibody","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Hepatitis B seroconversion"),
  t("Anti-HBc-T","Anti-HBc Total","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Past/present HBV infection"),
  t("Anti-HBc-M","Anti-HBc IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Acute hepatitis B"),
  t("Anti-HCV","Hepatitis C Antibody","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Hepatitis C screening"),
  t("HAV-IgM","Hepatitis A IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Acute hepatitis A"),
  t("HAV-IgG","Hepatitis A IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Hepatitis A immunity"),
  t("HIV-Ag/Ab","HIV Antigen/Antibody combo","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"HIV screening (4th gen)"),
  t("VDRL","VDRL","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis screening"),
  t("RPR","Rapid Plasma Reagin","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis screening; treatment monitoring"),
  t("FTA-ABS","FTA-ABS","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Non-reactive",null,null,"Syphilis confirmation"),
  t("CMV-IgM","CMV IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute CMV infection"),
  t("CMV-IgG","CMV IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"CMV immunity/past infection"),
  t("EBV-IgM","EBV VCA IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute EBV/infectious mononucleosis"),
  t("EBV-IgG","EBV VCA IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Past EBV infection"),
  t("Toxo-IgM","Toxoplasma IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute toxoplasmosis; pregnancy screening"),
  t("Toxo-IgG","Toxoplasma IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Toxoplasma immunity"),
  t("Rubella-IgM","Rubella IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute rubella; pregnancy screening"),
  t("Rubella-IgG","Rubella IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Immune >=10","IU/mL",null,"Rubella immunity"),
  t("HSV-IgM","HSV 1/2 IgM","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All","Negative",null,null,"Acute herpes infection"),
  t("HSV-IgG","HSV 1/2 IgG","Biochemistry","Infectious Disease","Serum","SST tube","Blood (venous)","Adult","All",null,null,null,"Past herpes infection"),
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
  t("SPEP","Serum Protein Electrophoresis","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","Normal pattern",null,null,"Myeloma; chronic inflammation; liver disease"),
  t("UPEP","Urine Protein Electrophoresis","Biochemistry","Electrophoresis","24h Urine","Sterile urine container","Urinary tract","Adult","All","No monoclonal band",null,null,"Bence Jones protein; myeloma"),
  t("IFE-S","Immunofixation Electrophoresis (Serum)","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","No monoclonal band",null,null,"Monoclonal gammopathy typing"),
  t("IFE-U","Immunofixation Electrophoresis (Urine)","Biochemistry","Electrophoresis","24h Urine","Sterile urine container","Urinary tract","Adult","All","No monoclonal band",null,null,"Bence Jones protein typing"),
  t("FLC","Free Light Chains (Kappa/Lambda)","Biochemistry","Electrophoresis","Serum","SST tube","Blood (venous)","Adult","All","Kappa 3.3-19.4; Lambda 5.7-26.3; Ratio 0.26-1.65","mg/L",null,"Myeloma monitoring; AL amyloidosis"),
  t("Hb-Elec","Hemoglobin Electrophoresis","Biochemistry","Electrophoresis","Whole blood EDTA","EDTA tube","Blood (venous)","Adult","All","HbA >95%; HbA2 2-3.5%; HbF <2%","%",null,"Thalassemia; sickle cell disease"),
  // BIOCHEMISTRY - Tumor Markers
  t("AFP","Alpha-fetoprotein","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<10","ng/mL",null,"Hepatocellular carcinoma; germ cell tumors"),
  t("CEA","Carcinoembryonic Antigen","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","Non-smoker <3; Smoker <5","ng/mL",null,"Colorectal cancer monitoring"),
  t("CA19-9","Cancer Antigen 19-9","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<37","U/mL",null,"Pancreatic/biliary cancer"),
  t("CA125","Cancer Antigen 125","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<35","U/mL",null,"Ovarian cancer monitoring"),
  t("CA15-3","Cancer Antigen 15-3","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<30","U/mL",null,"Breast cancer monitoring"),
  t("PSA","Prostate Specific Antigen","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","Male","<4.0","ng/mL",null,"Prostate cancer screening/monitoring"),
  t("fPSA","Free PSA","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","Male",null,null,null,"Prostate cancer risk stratification"),
  t("CA72-4","Cancer Antigen 72-4","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<6.9","U/mL",null,"Gastric/ovarian cancer"),
  t("NSE","Neuron-Specific Enolase","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<16.3","ng/mL",null,"Small cell lung cancer; neuroblastoma"),
  t("SCC","Squamous Cell Carcinoma Antigen","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<1.5","ng/mL",null,"Squamous cell carcinoma monitoring"),
  t("CYFRA","CYFRA 21-1","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<3.3","ng/mL",null,"NSCLC monitoring"),
  t("HE4","Human Epididymis Protein 4","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","Female","Premenopausal <70; Postmenopausal <140","pmol/L",null,"Ovarian cancer (with CA125)"),
  t("S100","S100 Protein","Biochemistry","Tumor Markers","Serum","SST tube","Blood (venous)","Adult","All","<0.1","ug/L",null,"Melanoma monitoring"),
  // MICROBIOLOGY - Blood Culture
  t("BC-Aero","Blood Culture Aerobic","Microbiology","Blood Culture","Blood","Blood culture bottle (aerobic)","Blood (venous)","Adult","All","No growth",null,null,"Bacteremia; sepsis"),
  t("BC-Anaero","Blood Culture Anaerobic","Microbiology","Blood Culture","Blood","Blood culture bottle (anaerobic)","Blood (venous)","Adult","All","No growth",null,null,"Anaerobic bacteremia"),
  t("BC-Fungal","Blood Culture Fungal","Microbiology","Blood Culture","Blood","Blood culture bottle","Blood (venous)","Adult","All","No growth",null,null,"Fungemia; candidemia"),
  t("BC-Myco","Blood Culture Mycobacterial","Microbiology","Blood Culture","Blood","Mycobacterial blood culture bottle","Blood (venous)","Adult","All","No growth",null,null,"Mycobacteremia (TB/NTM)"),
  // MICROBIOLOGY - Urine Culture
  t("UC","Urine Culture","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All","No significant growth (<10^4 CFU/mL)","CFU/mL",null,"Urinary tract infection"),
  t("UC-Cath","Catheter Urine Culture","Microbiology","Urine Culture","Catheter urine","Sterile urine container","Urinary tract (catheter)","Adult","All","No significant growth","CFU/mL",null,"Catheter-associated UTI"),
  t("UC-Fungal","Urine Culture Fungal","Microbiology","Urine Culture","Mid-stream urine","Sterile urine container","Urinary tract","Adult","All","No growth",null,null,"Fungal UTI"),
  // MICROBIOLOGY - Sputum Culture
  t("Sput-C","Sputum Culture","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","Normal flora / No pathogen",null,null,"Lower respiratory tract infection"),
  t("Sput-AFB","Sputum AFB Culture","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","No AFB growth",null,null,"Pulmonary tuberculosis"),
  t("Sput-Fungal","Sputum Fungal Culture","Microbiology","Sputum Culture","Sputum","Sterile container","Respiratory tract (lower)","Adult","All","No growth",null,null,"Pulmonary fungal infection"),
  t("BAL-C","BAL Culture","Microbiology","Sputum Culture","Bronchoalveolar lavage","Sterile container","Respiratory tract (lower)","Adult","All","No significant growth","CFU/mL",null,"Pneumonia in ventilated/immunocompromised"),
  // MICROBIOLOGY - Wound Culture
  t("WC","Wound Culture","Microbiology","Wound Culture","Wound swab","Swab in transport medium","Wound site","Adult","All","No pathogen isolated",null,null,"Wound infection; surgical site infection"),
  t("WC-Deep","Deep Tissue Culture","Microbiology","Wound Culture","Deep tissue/aspirate","Sterile container","Wound site (deep)","Adult","All","No growth",null,null,"Deep wound/abscess infection"),
  t("WC-Burns","Burns Culture","Microbiology","Wound Culture","Burns swab","Swab in transport medium","Burn wound","Adult","All","No pathogen isolated",null,null,"Burn wound infection"),
  // MICROBIOLOGY - Stool Culture
  t("SC","Stool Culture","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No enteric pathogen isolated",null,null,"Bacterial gastroenteritis"),
  t("SC-OVA","Stool Ova and Parasites","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","No ova or parasites seen",null,null,"Parasitic infection"),
  t("C-DIFF","C. difficile Toxin","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","Negative",null,null,"C. difficile infection; antibiotic-associated diarrhea"),
  t("H-PYLORI-Ag","H. pylori Stool Antigen","Microbiology","Stool Culture","Stool","Sterile container","GI tract","Adult","All","Negative",null,null,"H. pylori infection diagnosis"),
  // MICROBIOLOGY - CSF Culture
  t("CSF-C","CSF Culture","Microbiology","CSF Culture","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No growth",null,null,"Bacterial meningitis"),
  t("CSF-AFB","CSF AFB Culture","Microbiology","CSF Culture","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No AFB growth",null,null,"TB meningitis"),
  t("CSF-Fungal","CSF Fungal Culture","Microbiology","CSF Culture","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","No growth",null,null,"Fungal meningitis (Cryptococcus)"),
  t("CSF-Analysis","CSF Analysis","Microbiology","CSF Culture","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","WBC <5; Protein 15-45; Glucose 40-70","cells/uL; mg/dL; mg/dL",null,"Meningitis/encephalitis evaluation"),
  // MICROBIOLOGY - Throat Culture
  t("TC","Throat Culture","Microbiology","Throat Culture","Throat swab","Swab in transport medium","Oropharynx","Adult","All","Normal flora",null,null,"Streptococcal pharyngitis"),
  t("RADT","Rapid Strep Test","Microbiology","Throat Culture","Throat swab","Swab","Oropharynx","Adult","All","Negative",null,null,"Group A Strep rapid detection"),
  // MICROBIOLOGY - Ear Culture
  t("EC","Ear Culture","Microbiology","Ear Culture","Ear swab","Swab in transport medium","External ear canal","Adult","All","No pathogen isolated",null,null,"Otitis externa/media"),
  // MICROBIOLOGY - Eye Culture
  t("EyeC","Eye Culture","Microbiology","Eye Culture","Eye swab/discharge","Swab in transport medium","Conjunctiva / Cornea","Adult","All","No pathogen isolated",null,null,"Conjunctivitis; keratitis"),
  // MICROBIOLOGY - Nasal Culture
  t("NC","Nasal Culture","Microbiology","Nasal Culture","Nasal swab","Swab in transport medium","Nasal cavity","Adult","All","Normal flora",null,null,"MRSA screening; sinusitis"),
  t("NP-Swab","Nasopharyngeal Swab","Microbiology","Nasal Culture","Nasopharyngeal swab","VTM tube","Nasopharynx","Adult","All","No pathogen detected",null,null,"Respiratory virus detection"),
  // MICROBIOLOGY - Genital Culture
  t("GC-HVS","High Vaginal Swab Culture","Microbiology","Genital Culture","High vaginal swab","Swab in transport medium","Vagina (high)","Adult","Female","Normal flora",null,null,"Vaginitis; cervicitis"),
  t("GC-Endo","Endocervical Swab Culture","Microbiology","Genital Culture","Endocervical swab","Swab in transport medium","Endocervix","Adult","Female","No pathogen isolated",null,null,"Cervicitis; STI evaluation"),
  t("GC-Ureth","Urethral Swab Culture","Microbiology","Genital Culture","Urethral swab","Swab in transport medium","Urethra","Adult","All","No pathogen isolated",null,null,"Urethritis; STI evaluation"),
  t("GC-Semen","Semen Culture","Microbiology","Genital Culture","Semen","Sterile container","Genital tract (male)","Adult","Male","No significant growth",null,null,"Prostatitis; male infertility workup"),
  t("GBS","Group B Strep Screen","Microbiology","Genital Culture","Vaginal/rectal swab","Swab in transport medium","Vagina / Rectum","Adult","Female","Negative",null,null,"GBS colonization in pregnancy"),
  // MICROBIOLOGY - Tissue Culture
  t("TissC","Tissue Culture","Microbiology","Tissue Culture","Tissue biopsy","Sterile container","Various (surgical site)","Adult","All","No growth",null,null,"Deep-seated infection"),
  t("TissC-AFB","Tissue AFB Culture","Microbiology","Tissue Culture","Tissue biopsy","Sterile container","Various","Adult","All","No AFB growth",null,null,"Extrapulmonary TB"),
  t("TissC-Fungal","Tissue Fungal Culture","Microbiology","Tissue Culture","Tissue biopsy","Sterile container","Various","Adult","All","No growth",null,null,"Deep fungal infection"),
  // MICROBIOLOGY - Body Fluid Culture
  t("BFC-Pleural","Pleural Fluid Culture","Microbiology","Body Fluid Culture","Pleural fluid","Sterile container","Pleural space","Adult","All","No growth",null,null,"Empyema; parapneumonic effusion"),
  t("BFC-Ascitic","Ascitic Fluid Culture","Microbiology","Body Fluid Culture","Ascitic fluid","Blood culture bottle / Sterile container","Peritoneal cavity","Adult","All","No growth",null,null,"Spontaneous bacterial peritonitis"),
  t("BFC-Synovial","Synovial Fluid Culture","Microbiology","Body Fluid Culture","Synovial fluid","Sterile container","Joint space","Adult","All","No growth",null,null,"Septic arthritis"),
  t("BFC-Pericardial","Pericardial Fluid Culture","Microbiology","Body Fluid Culture","Pericardial fluid","Sterile container","Pericardial space","Adult","All","No growth",null,null,"Pericarditis; pericardial effusion"),
  // MICROBIOLOGY - Catheter Tip Culture
  t("CTC","Catheter Tip Culture","Microbiology","Catheter Tip Culture","Catheter tip","Sterile container","Catheter insertion site","Adult","All","<15 CFU (Maki roll)","CFU",null,"Catheter-related bloodstream infection"),
  // MICROBIOLOGY - Fungal Culture
  t("FC-Skin","Skin Fungal Culture","Microbiology","Fungal Culture","Skin scraping","Sterile container","Skin","Adult","All","No growth",null,null,"Dermatophytosis; cutaneous fungal infection"),
  t("FC-Nail","Nail Fungal Culture","Microbiology","Fungal Culture","Nail clipping","Sterile container","Nail","Adult","All","No growth",null,null,"Onychomycosis"),
  t("FC-Hair","Hair Fungal Culture","Microbiology","Fungal Culture","Hair sample","Sterile container","Scalp","Adult","All","No growth",null,null,"Tinea capitis"),
  t("CrAg","Cryptococcal Antigen","Microbiology","Fungal Culture","Serum/CSF","SST tube / Sterile container","Blood (venous) / CNS","Adult","All","Negative",null,null,"Cryptococcal meningitis"),
  t("Galacto","Galactomannan","Microbiology","Fungal Culture","Serum/BAL","SST tube / Sterile container","Blood (venous) / Respiratory tract","Adult","All","Negative (Index <0.5)",null,null,"Invasive aspergillosis"),
  t("BDG","Beta-D-Glucan","Microbiology","Fungal Culture","Serum","SST tube","Blood (venous)","Adult","All","<60","pg/mL",null,"Invasive fungal infection screening"),
  // MICROBIOLOGY - Drain Fluid Culture
  t("DFC","Drain Fluid Culture","Microbiology","Drain Fluid Culture","Drain fluid","Sterile container","Drain site","Adult","All","No growth",null,null,"Post-surgical infection monitoring"),
  // HISTOPATHOLOGY - General
  t("HISTO-BX","Histopathology Biopsy","Histopathology","General","Tissue biopsy","10% Neutral Buffered Formalin","Various (biopsy site)","Adult","All",null,null,null,"Tissue diagnosis; malignancy evaluation"),
  t("HISTO-EXC","Histopathology Excision","Histopathology","General","Excision specimen","10% Neutral Buffered Formalin","Various (excision site)","Adult","All",null,null,null,"Tumor margins; definitive diagnosis"),
  t("HISTO-RES","Histopathology Resection","Histopathology","General","Resection specimen","10% Neutral Buffered Formalin","Various (organ)","Adult","All",null,null,null,"Cancer staging; margin assessment"),
  t("FNA","Fine Needle Aspirate","Histopathology","General","FNA aspirate","Slides / CytoLyt","Various (mass/nodule)","Adult","All",null,null,null,"Thyroid nodule; lymph node; mass evaluation"),
  t("PAP","Pap Smear","Histopathology","General","Cervical scrape","ThinPrep vial","Cervix","Adult","Female","NILM (Negative for intraepithelial lesion)",null,null,"Cervical cancer screening"),
  t("IHC","Immunohistochemistry","Histopathology","General","Tissue block","FFPE block","Tumor tissue","Adult","All",null,null,null,"Tumor subtyping; origin determination"),
  t("FS","Frozen Section","Histopathology","General","Fresh tissue","Fresh (no fixative)","Various (intraoperative)","Adult","All",null,null,null,"Intraoperative margin/diagnosis"),
  t("CYTO-Fluid","Cytology Body Fluid","Histopathology","General","Body fluid","Sterile container","Pleural/Peritoneal/Pericardial","Adult","All","Negative for malignant cells",null,null,"Malignant effusion evaluation"),
  t("CYTO-Urine","Urine Cytology","Histopathology","General","Urine","Sterile container","Urinary tract","Adult","All","Negative for malignant cells",null,null,"Urothelial carcinoma screening"),
  t("CYTO-Sputum","Sputum Cytology","Histopathology","General","Sputum","Sterile container","Respiratory tract","Adult","All","Negative for malignant cells",null,null,"Lung cancer screening"),
  t("CYTO-BAL","BAL Cytology","Histopathology","General","Bronchoalveolar lavage","Sterile container","Respiratory tract (lower)","Adult","All","Normal differential",null,null,"Interstitial lung disease; infection"),
  t("CYTO-CSF","CSF Cytology","Histopathology","General","Cerebrospinal fluid","Sterile container","CNS (lumbar puncture)","Adult","All","Negative for malignant cells",null,null,"Leptomeningeal carcinomatosis"),
  t("SP-STAIN","Special Stains","Histopathology","General","Tissue block","FFPE block / Slides","Various","Adult","All",null,null,null,"Organism identification; tissue characterization"),
  t("EM","Electron Microscopy","Histopathology","General","Tissue","Glutaraldehyde fixative","Various","Adult","All",null,null,null,"Renal biopsy; ultrastructural diagnosis"),
  t("FISH","Fluorescence In Situ Hybridization","Histopathology","General","Tissue/Blood","FFPE block / EDTA tube","Tumor tissue / Blood","Adult","All",null,null,null,"Gene amplification/translocation"),
  t("Placenta","Placental Pathology","Histopathology","General","Placenta","10% Neutral Buffered Formalin","Placenta","Adult","Female",null,null,null,"Adverse pregnancy outcome evaluation"),
  t("BM-Bx","Bone Marrow Biopsy (Histopath)","Histopathology","General","Bone marrow trephine","10% Neutral Buffered Formalin / Decalcifier","Bone marrow (iliac crest)","Adult","All","Normal cellularity and architecture",null,null,"Hematologic malignancy; marrow infiltration"),
  t("Skin-Bx","Skin Biopsy","Histopathology","General","Skin punch/shave/excision","10% Neutral Buffered Formalin","Skin","Adult","All",null,null,null,"Dermatologic diagnosis; melanoma"),
  t("GI-Bx","GI Biopsy","Histopathology","General","GI mucosal biopsy","10% Neutral Buffered Formalin","GI tract (endoscopic)","Adult","All",null,null,null,"Celiac disease; IBD; H. pylori; malignancy"),
  t("Liver-Bx","Liver Biopsy","Histopathology","General","Liver core biopsy","10% Neutral Buffered Formalin","Liver","Adult","All",null,null,null,"Hepatitis staging; cirrhosis; liver mass"),
  t("Renal-Bx","Renal Biopsy","Histopathology","General","Renal core biopsy","10% Neutral Buffered Formalin / Glutaraldehyde / Fresh","Kidney","Adult","All",null,null,null,"Glomerulonephritis; nephrotic syndrome"),
  t("Prostate-Bx","Prostate Biopsy","Histopathology","General","Prostate core biopsy","10% Neutral Buffered Formalin","Prostate","Adult","Male",null,null,null,"Prostate cancer diagnosis; Gleason grading"),
  t("Breast-Bx","Breast Biopsy","Histopathology","General","Breast core/excision","10% Neutral Buffered Formalin","Breast","Adult","Female",null,null,null,"Breast cancer diagnosis; receptor status"),
  t("LN-Bx","Lymph Node Biopsy","Histopathology","General","Lymph node excision/core","10% Neutral Buffered Formalin","Lymph node","Adult","All",null,null,null,"Lymphoma; metastatic disease; granulomatous disease"),
  t("Thyroid-FNA","Thyroid FNA","Histopathology","General","Thyroid FNA","Slides / CytoLyt","Thyroid","Adult","All","Bethesda I-VI classification",null,null,"Thyroid nodule evaluation"),
  t("Bone-Bx","Bone Biopsy","Histopathology","General","Bone biopsy","10% Neutral Buffered Formalin / Decalcifier","Bone","Adult","All",null,null,null,"Bone tumor; osteomyelitis; metabolic bone disease"),
  t("Lung-Bx","Lung Biopsy","Histopathology","General","Lung biopsy (transbronchial/CT-guided)","10% Neutral Buffered Formalin","Lung","Adult","All",null,null,null,"Lung mass; interstitial lung disease"),
  t("Brain-Bx","Brain Biopsy","Histopathology","General","Brain biopsy","10% Neutral Buffered Formalin","Brain","Adult","All",null,null,null,"CNS tumor; demyelination; infection"),
  t("Muscle-Bx","Muscle Biopsy","Histopathology","General","Muscle biopsy","Fresh / Formalin","Skeletal muscle","Adult","All",null,null,null,"Myopathy; vasculitis; mitochondrial disease"),
  t("Nerve-Bx","Nerve Biopsy","Histopathology","General","Nerve biopsy (sural)","10% Neutral Buffered Formalin / Glutaraldehyde","Peripheral nerve","Adult","All",null,null,null,"Neuropathy; vasculitis; amyloidosis"),
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

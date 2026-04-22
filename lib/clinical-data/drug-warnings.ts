/**
 * Clinical Drug Warnings Database
 * Common drug-food interactions, pregnancy warnings, and special populations
 */

export interface DrugWarning {
  drugNames: string[]; // Generic or brand names
  type: "food" | "pregnancy" | "breastfeeding" | "pediatric" | "geriatric" | "renal" | "hepatic";
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  recommendation: string;
}

// Common drug-food interactions
export const drugFoodInteractions: DrugWarning[] = [
  {
    drugNames: ["warfarin", "coumadin"],
    type: "food",
    severity: "major",
    description: "Vitamin K-rich foods (leafy greens, broccoli) can reduce warfarin effectiveness",
    recommendation: "Maintain consistent vitamin K intake. Avoid sudden dietary changes.",
  },
  {
    drugNames: ["metronidazole", "flagyl", "tinidazole"],
    type: "food",
    severity: "major",
    description: "Alcohol consumption can cause severe disulfiram-like reaction (nausea, vomiting, flushing)",
    recommendation: "Avoid alcohol during treatment and for 3 days after completion.",
  },
  {
    drugNames: ["tetracycline", "doxycycline", "minocycline"],
    type: "food",
    severity: "moderate",
    description: "Dairy products, calcium, iron, and antacids reduce absorption",
    recommendation: "Take 1 hour before or 2 hours after meals containing dairy or supplements.",
  },
  {
    drugNames: ["levothyroxine", "synthroid"],
    type: "food",
    severity: "moderate",
    description: "Food, especially high-fiber, soy, and calcium can reduce absorption",
    recommendation: "Take on empty stomach, 30-60 minutes before breakfast.",
  },
  {
    drugNames: ["grapefruit", "simvastatin", "atorvastatin", "lovastatin"],
    type: "food",
    severity: "major",
    description: "Grapefruit juice increases statin levels, raising risk of muscle damage",
    recommendation: "Avoid grapefruit and grapefruit juice entirely during treatment.",
  },
  {
    drugNames: ["monoamine oxidase inhibitors", "maoi", "phenelzine", "tranylcypromine"],
    type: "food",
    severity: "critical",
    description: "Tyramine-rich foods (aged cheese, cured meats, fermented foods) can cause hypertensive crisis",
    recommendation: "Strict dietary restrictions. Provide patient with tyramine-free diet list.",
  },
];

// Pregnancy warnings (FDA categories)
export const pregnancyWarnings: DrugWarning[] = [
  {
    drugNames: ["isotretinoin", "accutane"],
    type: "pregnancy",
    severity: "critical",
    description: "Category X: Severe birth defects. Absolutely contraindicated in pregnancy.",
    recommendation: "Pregnancy test required. Two forms of contraception mandatory.",
  },
  {
    drugNames: ["warfarin", "coumadin"],
    type: "pregnancy",
    severity: "critical",
    description: "Category X in 1st trimester: Fetal warfarin syndrome, CNS abnormalities",
    recommendation: "Switch to heparin or LMWH if pregnancy planned or confirmed.",
  },
  {
    drugNames: ["ace inhibitors", "lisinopril", "enalapril", "ramipril"],
    type: "pregnancy",
    severity: "critical",
    description: "Category D: Fetal renal dysfunction, oligohydramnios, skull hypoplasia",
    recommendation: "Discontinue immediately if pregnancy detected. Use alternatives.",
  },
  {
    drugNames: ["methotrexate"],
    type: "pregnancy",
    severity: "critical",
    description: "Category X: Teratogenic. Causes neural tube defects and skeletal abnormalities",
    recommendation: "Contraception required. Wait 3 months after stopping before conception.",
  },
  {
    drugNames: ["valproic acid", "valproate", "depakote"],
    type: "pregnancy",
    severity: "critical",
    description: "Category D: Neural tube defects (spina bifida), developmental delays",
    recommendation: "Use only if benefits outweigh risks. Folic acid supplementation essential.",
  },
];

// Breastfeeding warnings
export const breastfeedingWarnings: DrugWarning[] = [
  {
    drugNames: ["lithium"],
    type: "breastfeeding",
    severity: "major",
    description: "Excreted in breast milk. Risk of infant toxicity (lethargy, hypotonia)",
    recommendation: "Avoid breastfeeding or use alternative treatment.",
  },
  {
    drugNames: ["aspirin", "salicylates"],
    type: "breastfeeding",
    severity: "moderate",
    description: "Risk of Reye's syndrome in nursing infant",
    recommendation: "Use lowest effective dose. Monitor infant for unusual symptoms.",
  },
  {
    drugNames: ["codeine", "tramadol"],
    type: "breastfeeding",
    severity: "major",
    description: "Ultra-rapid metabolizers: Infant respiratory depression and death reported",
    recommendation: "Avoid. Use alternative analgesics (acetaminophen, ibuprofen).",
  },
];

// Geriatric warnings (Beers Criteria)
export const geriatricWarnings: DrugWarning[] = [
  {
    drugNames: ["benzodiazepines", "diazepam", "lorazepam", "alprazolam"],
    type: "geriatric",
    severity: "major",
    description: "Beers Criteria: Increased fall risk, cognitive impairment, delirium",
    recommendation: "Avoid if possible. Use lowest dose for shortest duration. Consider alternatives.",
  },
  {
    drugNames: ["anticholinergics", "diphenhydramine", "hydroxyzine"],
    type: "geriatric",
    severity: "major",
    description: "Beers Criteria: Confusion, constipation, urinary retention, falls",
    recommendation: "Avoid in elderly. Use non-sedating alternatives.",
  },
  {
    drugNames: ["nsaids", "ibuprofen", "naproxen", "indomethacin"],
    type: "geriatric",
    severity: "moderate",
    description: "Increased GI bleeding risk, renal impairment, cardiovascular events",
    recommendation: "Use lowest dose for shortest duration. Consider gastroprotection.",
  },
];

// Pediatric warnings
export const pediatricWarnings: DrugWarning[] = [
  {
    drugNames: ["aspirin", "salicylates"],
    type: "pediatric",
    severity: "critical",
    description: "Reye's syndrome risk in children with viral infections",
    recommendation: "Contraindicated under age 12 for viral illnesses. Use acetaminophen instead.",
  },
  {
    drugNames: ["tetracycline", "doxycycline"],
    type: "pediatric",
    severity: "major",
    description: "Permanent tooth discoloration and enamel hypoplasia in children under 8",
    recommendation: "Avoid in children under 8 years unless no alternatives available.",
  },
  {
    drugNames: ["fluoroquinolones", "ciprofloxacin", "levofloxacin"],
    type: "pediatric",
    severity: "moderate",
    description: "Cartilage damage and tendon rupture risk in growing children",
    recommendation: "Reserve for serious infections when no alternatives available.",
  },
];

// Helper function to check warnings
export function checkDrugWarnings(drugName: string): DrugWarning[] {
  const allWarnings = [
    ...drugFoodInteractions,
    ...pregnancyWarnings,
    ...breastfeedingWarnings,
    ...geriatricWarnings,
    ...pediatricWarnings,
  ];

  return allWarnings.filter((warning) =>
    warning.drugNames.some((name) =>
      drugName.toLowerCase().includes(name.toLowerCase())
    )
  );
}

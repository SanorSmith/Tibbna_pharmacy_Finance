/**
 * Clinical Drug Alternatives Database
 * Therapeutic alternatives and clinical decision support
 */

export interface DrugAlternative {
  originalDrug: string[];
  alternatives: {
    name: string;
    class: string;
    advantages: string[];
    considerations: string[];
    monitoring: string[];
  }[];
  indication: string;
}

export const therapeuticAlternatives: DrugAlternative[] = [
  {
    originalDrug: ["warfarin", "coumadin"],
    indication: "Anticoagulation",
    alternatives: [
      {
        name: "Apixaban (Eliquis)",
        class: "Direct Oral Anticoagulant (DOAC)",
        advantages: [
          "No routine monitoring required",
          "Fewer drug-food interactions",
          "Lower bleeding risk",
          "Fixed dosing",
        ],
        considerations: [
          "More expensive",
          "No reversal agent readily available",
          "Requires good renal function",
        ],
        monitoring: ["Renal function annually", "CBC if bleeding suspected"],
      },
      {
        name: "Rivaroxaban (Xarelto)",
        class: "Direct Oral Anticoagulant (DOAC)",
        advantages: [
          "Once daily dosing",
          "No monitoring required",
          "Predictable pharmacokinetics",
        ],
        considerations: [
          "Take with food for absorption",
          "Renal dose adjustment needed",
        ],
        monitoring: ["Renal function every 6-12 months"],
      },
    ],
  },
  {
    originalDrug: ["nsaids", "ibuprofen", "naproxen"],
    indication: "Pain/Inflammation",
    alternatives: [
      {
        name: "Acetaminophen (Tylenol)",
        class: "Analgesic/Antipyretic",
        advantages: [
          "Safer GI profile",
          "No antiplatelet effect",
          "Safe in renal impairment",
          "Pregnancy Category B",
        ],
        considerations: [
          "Hepatotoxic in overdose",
          "Less anti-inflammatory effect",
          "Max 4g/day (3g in elderly)",
        ],
        monitoring: ["Liver function if chronic use"],
      },
      {
        name: "Celecoxib (Celebrex)",
        class: "COX-2 Selective NSAID",
        advantages: [
          "Lower GI bleeding risk",
          "Once or twice daily dosing",
          "Effective anti-inflammatory",
        ],
        considerations: [
          "Cardiovascular risk",
          "Sulfa allergy contraindication",
          "More expensive",
        ],
        monitoring: ["Blood pressure", "Renal function", "Cardiovascular risk"],
      },
    ],
  },
  {
    originalDrug: ["benzodiazepines", "diazepam", "lorazepam", "alprazolam"],
    indication: "Anxiety",
    alternatives: [
      {
        name: "Buspirone",
        class: "Anxiolytic",
        advantages: [
          "No dependence potential",
          "No sedation",
          "Safe in elderly",
          "No withdrawal syndrome",
        ],
        considerations: [
          "Takes 2-4 weeks for effect",
          "Not effective for panic disorder",
          "Multiple daily dosing",
        ],
        monitoring: ["Symptom improvement", "Side effects"],
      },
      {
        name: "SSRI (Sertraline, Escitalopram)",
        class: "Antidepressant",
        advantages: [
          "Treats underlying anxiety disorder",
          "No dependence",
          "Once daily dosing",
          "Also treats depression",
        ],
        considerations: [
          "4-6 weeks for full effect",
          "Initial anxiety increase possible",
          "Sexual side effects",
        ],
        monitoring: ["Mood", "Suicidal ideation (initial weeks)", "Side effects"],
      },
    ],
  },
  {
    originalDrug: ["proton pump inhibitors", "omeprazole", "pantoprazole"],
    indication: "GERD/Ulcer",
    alternatives: [
      {
        name: "H2 Receptor Antagonists (Famotidine)",
        class: "H2 Blocker",
        advantages: [
          "Fewer drug interactions",
          "Lower fracture risk",
          "No vitamin B12 deficiency",
          "Available OTC",
        ],
        considerations: [
          "Less potent acid suppression",
          "Twice daily dosing often needed",
          "Tachyphylaxis possible",
        ],
        monitoring: ["Symptom control", "Renal function"],
      },
      {
        name: "Lifestyle modifications + Antacids",
        class: "Non-pharmacologic",
        advantages: [
          "No systemic side effects",
          "Addresses root cause",
          "Cost-effective",
        ],
        considerations: [
          "Requires patient commitment",
          "May not be sufficient alone",
          "Slower symptom relief",
        ],
        monitoring: ["Symptom diary", "Weight management", "Diet compliance"],
      },
    ],
  },
];

// Helper function to find alternatives
export function findAlternatives(drugName: string): DrugAlternative | null {
  return (
    therapeuticAlternatives.find((alt) =>
      alt.originalDrug.some((name) =>
        drugName.toLowerCase().includes(name.toLowerCase())
      )
    ) || null
  );
}

// Dosage adjustment recommendations
export interface DosageAdjustment {
  condition: "renal" | "hepatic" | "elderly" | "pediatric";
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
}

export const dosageAdjustments: Record<string, DosageAdjustment[]> = {
  "metformin": [
    {
      condition: "renal",
      severity: "moderate",
      recommendation: "Reduce dose by 50% if eGFR 30-45 mL/min. Contraindicated if eGFR <30.",
    },
  ],
  "digoxin": [
    {
      condition: "renal",
      severity: "moderate",
      recommendation: "Reduce dose by 25-50% based on CrCl. Monitor levels closely.",
    },
    {
      condition: "elderly",
      severity: "mild",
      recommendation: "Start with 0.125mg daily. Elderly more sensitive to toxicity.",
    },
  ],
  "gabapentin": [
    {
      condition: "renal",
      severity: "moderate",
      recommendation: "Adjust dose based on CrCl. May need 50-75% reduction.",
    },
  ],
};

/**
 * API Route: Drug Interactions Checker
 * Uses FDA OpenFDA API to check for drug-drug interactions
 * Endpoint: POST /api/pharmacy/drug-interactions
 */

import { NextRequest, NextResponse } from "next/server";
import { checkDrugWarnings } from "@/lib/clinical-data/drug-warnings";
import { findAlternatives } from "@/lib/clinical-data/drug-alternatives";

interface DrugInput {
  name: string;
  genericName?: string;
}

interface InteractionResult {
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  drugs: string[];
  source: string;
  type?: string;
  recommendation?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { drugs, patientId, workspaceId, checkAllergies = false } = body as { 
      drugs: DrugInput[];
      patientId?: string;
      workspaceId?: string;
      checkAllergies?: boolean;
    };

    if (!drugs || drugs.length < 2) {
      return NextResponse.json(
        { error: "At least 2 drugs are required" },
        { status: 400 }
      );
    }

    const interactions: InteractionResult[] = [];
    const allergyWarnings: any[] = [];
    const clinicalWarnings: any[] = [];
    const alternatives: any[] = [];
    let patientMedications: any[] = [];

    // If patient context provided, fetch their current medications and allergies
    if (patientId && workspaceId) {
      try {
        const patientDataRes = await fetch(
          `${request.nextUrl.origin}/api/pharmacy/patient-medications?workspaceid=${workspaceId}&patientid=${patientId}&includeAllergies=true`
        );
        
        if (patientDataRes.ok) {
          const patientData = await patientDataRes.json();
          patientMedications = patientData.medications || [];

          // Check for allergy conflicts
          if (checkAllergies && patientData.allergies) {
            for (const drug of drugs) {
              for (const allergy of patientData.allergies) {
                if (
                  drug.name.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
                  (drug.genericName && drug.genericName.toLowerCase().includes(allergy.allergen.toLowerCase()))
                ) {
                  allergyWarnings.push({
                    severity: allergy.severity === "life-threatening" ? "critical" : "major",
                    description: `ALLERGY ALERT: Patient has documented ${allergy.severity} allergy to ${allergy.allergen}. Reaction: ${allergy.reaction}`,
                    drugs: [drug.name],
                    source: "Patient Allergy Record",
                    type: "allergy",
                  });
                }
              }
            }
          }

          // Add patient's current medications to interaction check
          if (patientMedications.length > 0) {
            drugs.push(...patientMedications.map((med: any) => ({
              name: med.drugname,
              genericName: med.genericname,
            })));
          }
        } else {
          // Add warning when patient medications API fails
          const errorText = await patientDataRes.text();
          console.error("Error fetching patient medications:", errorText);
          clinicalWarnings.push({
            severity: "minor",
            description: "Could not fetch patient's current medications for interaction checking. Only checking interactions between the new medications being prescribed.",
            drugs: drugs.map(d => d.name),
            source: "System",
            type: "data_unavailable",
            recommendation: "Review patient's medication history manually for potential interactions."
          });
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        // Continue with interaction check even if patient data fetch fails
      }
    }

    // Check for clinical warnings (drug-food, pregnancy, etc.) and alternatives
    for (const drug of drugs) {
      const drugName = drug.genericName || drug.name;
      
      // Check clinical warnings
      const warnings = checkDrugWarnings(drugName);
      for (const warning of warnings) {
        clinicalWarnings.push({
          severity: warning.severity,
          description: `${warning.type.toUpperCase()} WARNING: ${warning.description}`,
          drugs: [drug.name],
          source: "Clinical Guidelines",
          type: warning.type,
          recommendation: warning.recommendation,
        });
      }

      // Find therapeutic alternatives
      const drugAlternatives = findAlternatives(drugName);
      if (drugAlternatives) {
        alternatives.push({
          drug: drug.name,
          indication: drugAlternatives.indication,
          alternatives: drugAlternatives.alternatives,
        });
      }
    }

    // Query FDA OpenFDA API for each drug
    for (const drug of drugs) {
      const searchTerm = drug.genericName || drug.name;
      
      try {
        // Search FDA drug label database
        const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(searchTerm)}"&limit=1`;
        
        const response = await fetch(fdaUrl);
        
        if (!response.ok) {
          console.warn(`FDA API error for ${searchTerm}:`, response.status);
          continue;
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const label = data.results[0];
          
          // Extract interaction information from various fields
          const interactionFields = [
            label.drug_interactions,
            label.warnings,
            label.precautions,
            label.contraindications,
          ].filter(Boolean);

          // Parse interactions
          for (const field of interactionFields) {
            if (Array.isArray(field)) {
              for (const text of field) {
                // Check if this interaction mentions other selected drugs
                const mentionedDrugs = drugs.filter(
                  (d) =>
                    d.name !== drug.name &&
                    (text.toLowerCase().includes(d.name.toLowerCase()) ||
                      (d.genericName &&
                        text.toLowerCase().includes(d.genericName.toLowerCase())))
                );

                if (mentionedDrugs.length > 0) {
                  // Determine severity based on keywords
                  let severity: InteractionResult["severity"] = "moderate";
                  const lowerText = text.toLowerCase();

                  if (
                    lowerText.includes("contraindicated") ||
                    lowerText.includes("fatal") ||
                    lowerText.includes("life-threatening") ||
                    lowerText.includes("serious") ||
                    lowerText.includes("severe")
                  ) {
                    severity = "critical";
                  } else if (
                    lowerText.includes("caution") ||
                    lowerText.includes("monitor") ||
                    lowerText.includes("adjust")
                  ) {
                    severity = "major";
                  } else if (
                    lowerText.includes("may") ||
                    lowerText.includes("possible")
                  ) {
                    severity = "minor";
                  }

                  interactions.push({
                    severity,
                    description: text.substring(0, 500), // Limit length
                    drugs: [drug.name, ...mentionedDrugs.map((d) => d.name)],
                    source: "FDA OpenFDA",
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching FDA data for ${searchTerm}:`, error);
      }
    }

    // Combine all warnings (allergies, clinical warnings, drug interactions)
    const allWarnings = [...allergyWarnings, ...clinicalWarnings, ...interactions];

    // Remove duplicates and sort by severity
    const uniqueInteractions = Array.from(
      new Map(
        allWarnings.map((item) => [item.description, item])
      ).values()
    );

    const severityOrder: Record<string, number> = { critical: 0, major: 1, moderate: 2, minor: 3 };
    uniqueInteractions.sort(
      (a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
    );

    return NextResponse.json({
      interactions: uniqueInteractions,
      checkedDrugs: drugs.map((d) => d.name),
      patientMedications: patientMedications.map((m: any) => m.drugname),
      allergyWarnings: allergyWarnings.length,
      clinicalWarnings: clinicalWarnings.length,
      alternatives: alternatives,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Drug interaction check error:", error);
    return NextResponse.json(
      { error: "Failed to check drug interactions" },
      { status: 500 }
    );
  }
}

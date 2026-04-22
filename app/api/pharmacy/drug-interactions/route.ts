/**
 * API Route: Drug Interactions Checker
 * Uses FDA OpenFDA API to check for drug-drug interactions
 * Endpoint: POST /api/pharmacy/drug-interactions
 */

import { NextRequest, NextResponse } from "next/server";

interface DrugInput {
  name: string;
  genericName?: string;
}

interface InteractionResult {
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  drugs: string[];
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { drugs } = body as { drugs: DrugInput[] };

    if (!drugs || drugs.length < 2) {
      return NextResponse.json(
        { error: "At least 2 drugs are required" },
        { status: 400 }
      );
    }

    const interactions: InteractionResult[] = [];

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

    // Remove duplicates and sort by severity
    const uniqueInteractions = Array.from(
      new Map(
        interactions.map((item) => [item.description, item])
      ).values()
    );

    const severityOrder = { critical: 0, major: 1, moderate: 2, minor: 3 };
    uniqueInteractions.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    return NextResponse.json({
      interactions: uniqueInteractions,
      checkedDrugs: drugs.map((d) => d.name),
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

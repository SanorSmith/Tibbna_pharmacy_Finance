/**
 * Example usage of Medication Summary Template
 * 
 * This demonstrates how to create a medication summary composition
 * using the template_medication_summary_v1 template.
 */

import { createMedicationSummaryComposition, MedicationItem } from "../medication-summary";
import { createOpenEHRComposition } from "../openehr";

// Example medication data
const medications: MedicationItem[] = [
  {
    medicationName: "Amoxicillin 500mg Capsule",
    doseAmount: 500,
    doseUnit: "mg",
    route: "oral",
    frequency: "every 8 hours",
    duration: "7 days",
    clinicalIndication: "Bacterial infection",
    prescribingReason: "Upper respiratory tract infection",
    dateStarted: "2025-03-11T10:00:00Z",
    status: "ACTIVE",
    comment: "Take with food"
  },
  {
    medicationName: "Metformin 1000mg Tablet",
    doseAmount: 1000,
    doseUnit: "mg",
    route: "oral",
    frequency: "twice daily",
    duration: "ongoing",
    clinicalIndication: "Type 2 diabetes",
    prescribingReason: "Blood glucose control",
    dateStarted: "2025-02-01T08:00:00Z",
    status: "ACTIVE",
    comment: "Take after meals"
  },
  {
    medicationName: "Lisinopril 10mg Tablet",
    doseAmount: 10,
    doseUnit: "mg",
    route: "oral",
    frequency: "once daily",
    duration: "ongoing",
    clinicalIndication: "Hypertension",
    prescribingReason: "Blood pressure control",
    dateStarted: "2025-01-15T09:00:00Z",
    status: "ACTIVE",
    comment: "Monitor blood pressure regularly"
  }
];

/**
 * Example: Create a medication summary composition
 */
export async function createMedicationSummaryExample(ehrId: string) {
  try {
    console.log("📋 Creating medication summary composition...");
    
    // Create the composition data
    const compositionData = createMedicationSummaryComposition({
      medications,
      composerName: "Dr. John Smith",
      endTime: undefined // Optional end time
    });
    
    console.log("📊 Composition data created:");
    console.log(`   - Medications: ${medications.length}`);
    console.log(`   - Composer: Dr. John Smith`);
    console.log(`   - Template: template_medication_summary_v1`);
    
    // Create the composition in OpenEHR
    const compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_medication_summary_v1",
      compositionData
    );
    
    console.log("✅ Medication summary composition created successfully!");
    console.log(`📝 Composition UID: ${compositionUid}`);
    
    return compositionUid;
    
  } catch (error) {
    console.error("❌ Failed to create medication summary:", error);
    throw error;
  }
}

/**
 * Example: Update medication summary with stopped medication
 */
export function createUpdatedMedicationSummary() {
  const updatedMedications: MedicationItem[] = [
    ...medications,
    {
      medicationName: "Ibuprofen 400mg Tablet",
      doseAmount: 400,
      doseUnit: "mg",
      route: "oral",
      frequency: "as needed",
      duration: "3 days",
      clinicalIndication: "Pain relief",
      prescribingReason: "Post-surgical pain",
      dateStarted: "2025-03-05T14:00:00Z",
      dateStopped: "2025-03-08T14:00:00Z",
      status: "COMPLETED",
      comment: "Take for pain only as needed"
    }
  ];
  
  return createMedicationSummaryComposition({
    medications: updatedMedications,
    composerName: "Dr. John Smith"
  });
}

/**
 * Example: Discontinue a medication
 */
export function createDiscontinuedMedicationSummary() {
  const discontinuedMedications: MedicationItem[] = [
    medications[0], // Keep amoxicillin
    {
      ...medications[1], // Metformin - now discontinued
      dateStopped: "2025-03-10T08:00:00Z",
      status: "CANCELLED",
      comment: "Discontinued due to side effects"
    },
    medications[2]  // Keep lisinopril
  ];
  
  return createMedicationSummaryComposition({
    medications: discontinuedMedications,
    composerName: "Dr. John Smith"
  });
}

// Export for use in API routes
export { medications as exampleMedications };

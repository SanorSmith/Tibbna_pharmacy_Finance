"use client";
import { useState } from "react";
import { History, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DrugAutocomplete } from "@/components/ui/drug-autocomplete";

// Prescriptions interfaces (openEHR compliant)
export interface PrescriptionRecord {
  composition_uid: string;
  recorded_time: string;
  medication_item: string;
  product_name?: string;
  active_ingredient?: string;
  usage?: string;
  valid_until?: string;
   instructions?: string;
   issued_from?: string;
  medication_item_code?: string;
  medication_item_terminology?: string;
  order_type?: string;
  dose_amount?: string;
  dose_unit?: string;
  dose_formula?: string;
  route: string;
  route_code?: string;
  body_site?: string;
  body_site_code?: string;
  administration_method?: string;
  administration_method_code?: string;
  timing_directions: string;
  frequency?: string;
  interval?: string;
  as_required?: boolean;
  as_required_criterion?: string;
  direction_duration?: string;
  medication_safety?: string;
  maximum_dose_amount?: string;
  maximum_dose_unit?: string;
  maximum_dose_period?: string;
  additional_instruction?: string;
  patient_instruction?: string;
  clinical_indication?: string;
  clinical_indication_code?: string;
  clinical_indication_terminology?: string;
  comment?: string;
  prescribed_by: string;
  status: string;
}

interface MedsTabProps {
  workspaceid: string;
  patientid: string;
  prescriptions: PrescriptionRecord[];
  loadingPrescriptions: boolean;
  loadPrescriptions: () => void;
}

export function MedsTab({ workspaceid, patientid, prescriptions, loadingPrescriptions, loadPrescriptions }: MedsTabProps) {
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showMedicationSummary, setShowMedicationSummary] = useState(false);
  const [medicationSummaryData, setMedicationSummaryData] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] =
    useState<PrescriptionRecord | null>(null);
  const [medicationsList, setMedicationsList] = useState<typeof prescriptionForm[]>([]);
  const [prescriptionForm, setPrescriptionForm] = useState({
    // Medication Item (with terminology support)
    medicationItem: "",
    medicationItemCode: "",
    medicationItemTerminology: "SNOMED-CT", // SNOMED-CT, RxNorm, dm+d, etc.

    // Dose Direction
    doseAmount: "",
    doseUnit: "",
    doseFormula: "",

    // Route and Site
    route: "",
    routeCode: "",
    bodySite: "",
    bodySiteCode: "",

    // Administration
    administrationMethod: "",
    administrationMethodCode: "",

    // Timing
    timingDirections: "",
    frequency: "",
    interval: "",
    asRequired: false,
    asRequiredCriterion: "",

    // Duration
    directionDuration: "",

    // Usage / course
    usage: "",

    // Validity
    validUntil: "",

    // Clinical Indication (with ICD-10/SNOMED support)
    clinicalIndication: "",
    clinicalIndicationCode: "",
    clinicalIndicationTerminology: "ICD-10", // ICD-10 or SNOMED-CT

    // Medication Safety
    medicationSafety: "",
    maximumDoseAmount: "",
    maximumDoseUnit: "",
    maximumDosePeriod: "",

    // Additional Instructions
    additionalInstruction: "",
    patientInstruction: "",

    // Order Details
    orderType: "dose-based", // dose-based or product-based
    comment: "",
  });

  // Whether we are viewing active prescriptions or history (expired)
  const [showHistory, setShowHistory] = useState(false);

  // Fetch medication summary from OpenEHR
  const fetchMedicationSummary = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/medications`);
      if (res.ok) {
        const data = await res.json();
        setMedicationSummaryData(data);
        setShowMedicationSummary(true);
      } else {
        alert("Failed to fetch medication summary");
      }
    } catch (error) {
      console.error("Error fetching medication summary:", error);
      alert("Error fetching medication summary");
    }
  };

  // Add medication to list
  const handleAddToList = () => {
    if (
      !prescriptionForm.medicationItem ||
      !prescriptionForm.route ||
      !prescriptionForm.doseAmount ||
      !prescriptionForm.doseUnit ||
      !prescriptionForm.timingDirections
    ) {
      alert(
        "Please fill in all required fields (Medication Item, Route, Dose Amount, Dose Unit, Timing Directions)"
      );
      return;
    }

    setMedicationsList([...medicationsList, { ...prescriptionForm }]);
    
    // Reset form
    setPrescriptionForm({
      medicationItem: "",
      medicationItemCode: "",
      medicationItemTerminology: "SNOMED-CT",
      doseAmount: "",
      doseUnit: "",
      doseFormula: "",
      route: "",
      routeCode: "",
      bodySite: "",
      bodySiteCode: "",
      administrationMethod: "",
      administrationMethodCode: "",
      timingDirections: "",
      frequency: "",
      interval: "",
      asRequired: false,
      asRequiredCriterion: "",
      directionDuration: "",
      usage: "",
      validUntil: "",
      clinicalIndication: "",
      clinicalIndicationCode: "",
      clinicalIndicationTerminology: "ICD-10",
      medicationSafety: "",
      maximumDoseAmount: "",
      maximumDoseUnit: "",
      maximumDosePeriod: "",
      additionalInstruction: "",
      patientInstruction: "",
      orderType: "dose-based",
      comment: "",
    });
  };

  // Remove medication from list
  const handleRemoveFromList = (index: number) => {
    setMedicationsList(medicationsList.filter((_, i) => i !== index));
  };

  // Submit all medications
  const handleSubmitPrescriptions = async () => {
    if (medicationsList.length === 0) {
      alert("Please add at least one medication to the list");
      return;
    }

    try {
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/prescriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescriptions: medicationsList,
          }),
        }
      );

      if (res.ok) {
        await loadPrescriptions();
        setShowPrescriptionForm(false);
        setMedicationsList([]);
        setPrescriptionForm({
          medicationItem: "",
          medicationItemCode: "",
          medicationItemTerminology: "SNOMED-CT",
          doseAmount: "",
          doseUnit: "",
          doseFormula: "",
          route: "",
          routeCode: "",
          bodySite: "",
          bodySiteCode: "",
          administrationMethod: "",
          administrationMethodCode: "",
          timingDirections: "",
          frequency: "",
          interval: "",
          asRequired: false,
          asRequiredCriterion: "",
          directionDuration: "",
          usage: "",
          validUntil: "",
          clinicalIndication: "",
          clinicalIndicationCode: "",
          clinicalIndicationTerminology: "ICD-10",
          medicationSafety: "",
          maximumDoseAmount: "",
          maximumDoseUnit: "",
          maximumDosePeriod: "",
          additionalInstruction: "",
          patientInstruction: "",
          orderType: "dose-based",
          comment: "",
        });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create prescriptions");
      }
    } catch (error) {
      console.error("Error creating prescriptions:", error);
      alert("Error creating prescriptions");
    }
  };

  return (
    <>
       <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">
              {showHistory ? "Prescription History" : "Prescriptions"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
                onClick={fetchMedicationSummary}
              >
                System → Medication Summary
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
                onClick={() => setShowPrescriptionForm(true)}
              >
                + New Prescription
              </Button>
              <Button
                variant={showHistory ? "outline" : "secondary"}
                size="sm"
                onClick={() => setShowHistory((prev) => !prev)}
                className="bg-orange-500 hover:bg-orange-600 text-white hover:text-white flex items-center gap-1"
              >
                <History className="w-4 h-4" />
                <span>{showHistory ? "Show Active" : "History"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPrescriptions ? (
            <p className="text-sm text-muted-foreground">
              Loading prescriptions...
            </p>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Prescriptions
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                No prescriptions have been recorded yet
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowPrescriptionForm(true)}
                variant="outline"
              >
                Create First Prescription
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-semibold bg-blue-100/90 text-blue-800">
                    <th className="p-3 text-left text-sm font-semibold">
                      Medication
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Dosage
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Route
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Usage
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Prescribed By
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Dates
                    </th>
                    <th className="p-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="p-3 text-right text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showHistory
                    ? prescriptions.filter((p) => p.status === "expired")
                    : prescriptions.filter((p) => p.status !== "expired")
                  ).map((prescription) => (
                    <tr
                      key={prescription.composition_uid}
                      className="border-b hover:bg-muted/30"
                    >
                      <td className="p-3 text-sm">
                        <div className="text-sm font-medium">
                          {prescription.medication_item}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {prescription.dose_amount || prescription.dose_unit
                          ? `${prescription.dose_amount ?? ""}${prescription.dose_unit ? ` ${prescription.dose_unit}` : ""}`
                          : prescription.timing_directions || "N/A"}
                      </td>
                      <td className="p-3 text-sm">{prescription.route}</td>
                      <td className="p-3 text-sm">
                        {prescription.usage || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {prescription.prescribed_by}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        <div>
                          {new Date(
                            prescription.recorded_time
                          ).toLocaleDateString()}
                        </div>
                        {prescription.valid_until && (
                          <div className="text-xs text-muted-foreground">
                            Valid until: {prescription.valid_until}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            prescription.status === "active"
                              ? "bg-green-200 text-green-800"
                              : prescription.status === "expired"
                              ? "bg-red-200 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {prescription.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPrescription(prescription);
                            setShowDetails(true);
                          }}
                          className="bg-blue-100/90 hover:bg-blue-200"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Form Dialog */}
      <Dialog
        open={showPrescriptionForm}
        onOpenChange={setShowPrescriptionForm}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New Prescription
            </DialogTitle>
            <DialogDescription>
              Create a medication order for this patient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Medication Name with Autocomplete */}
            <div>
              <label className="text-sm font-medium">
                Medication Name *
              </label>
              <div className="mt-1.5">
                <DrugAutocomplete
                  workspaceid={workspaceid}
                  value={prescriptionForm.medicationItem}
                  onChange={(value) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      medicationItem: value,
                    })
                  }
                  onSelect={(drug) => {
                    // Auto-populate form fields from selected drug
                    const route = drug.route?.match(/Route:\s*([^,]+)/i)?.[1]?.trim() || "";
                    
                    setPrescriptionForm({
                      ...prescriptionForm,
                      medicationItem: drug.name,
                      route: route.charAt(0).toUpperCase() + route.slice(1),
                      doseUnit: drug.unit === "tablet" || drug.unit === "capsule" ? drug.unit : "mg",
                      // Pre-fill strength as dose amount if it's numeric
                      doseAmount: drug.strength.match(/^\d+/)?.[0] || "",
                    });
                  }}
                  placeholder="Type to search medications (e.g., Amoxicillin, Metformin)"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Start typing to see suggestions. Select a drug to auto-fill form fields.
              </p>
            </div>

            {/* Dose & Route */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Dose Amount *</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., 500"
                  value={prescriptionForm.doseAmount}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      doseAmount: e.target.value,
                    })
                  }
                  aria-label="Dose amount"
                  title="Enter the dose amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unit *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.doseUnit}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      doseUnit: e.target.value,
                    })
                  }
                  aria-label="Dose unit"
                  title="Select the dose unit"
                >
                  <option value="">Select...</option>
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="mcg">mcg</option>
                  <option value="ml">ml</option>
                  <option value="tablet">tablet(s)</option>
                  <option value="capsule">capsule(s)</option>
                  <option value="puff">puff(s)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Route *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.route}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      route: e.target.value,
                    })
                  }
                  aria-label="Route of administration"
                  title="Select the route of administration"
                >
                  <option value="">Select...</option>
                  <option value="Oral">Oral</option>
                  <option value="Intravenous">IV</option>
                  <option value="Intramuscular">IM</option>
                  <option value="Subcutaneous">SC</option>
                  <option value="Topical">Topical</option>
                  <option value="Inhalation">Inhalation</option>
                </select>
              </div>
            </div>

            {/* Frequency & Duration */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Timing Directions *</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., Three times daily"
                  value={prescriptionForm.timingDirections}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      timingDirections: e.target.value,
                    })
                  }
                  aria-label="Timing Directions"
                  title="Enter the timing directions"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., 7 days"
                  value={prescriptionForm.directionDuration}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      directionDuration: e.target.value,
                    })
                  }
                  aria-label="Duration"
                  title="Enter the duration of treatment"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valid until</label>
                <input
                  type="date"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.validUntil}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      validUntil: e.target.value,
                    })
                  }
                  aria-label="Valid until"
                  title="Last date this prescription is valid"
                />
              </div>
            </div>

            {/* Usage / course description */}
            <div>
              <label className="text-sm font-medium">Usage</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="e.g., 1 tablet in the evening, 3 days/week."
                value={prescriptionForm.usage}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    usage: e.target.value,
                  })
                }
                aria-label="Usage"
                title="How the patient should take the medicine"
              />
            </div>

            {/* PRN */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="asRequired"
                checked={prescriptionForm.asRequired}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    asRequired: e.target.checked,
                  })
                }
                aria-label="As required checkbox"
                title="Check if medication is to be taken as needed"
              />
              <label htmlFor="asRequired" className="text-sm font-medium">
                As Required (PRN)
              </label>
            </div>
            {prescriptionForm.asRequired && (
              <div>
                <label className="text-sm font-medium">PRN Criterion</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., for pain"
                  value={prescriptionForm.asRequiredCriterion}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      asRequiredCriterion: e.target.value,
                    })
                  }
                  aria-label="PRN criterion"
                  title="Specify when the medication should be taken as needed"
                />
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="text-sm font-medium">Instructions</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="e.g., Take with food"
                value={prescriptionForm.additionalInstruction}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    additionalInstruction: e.target.value,
                  })
                }
                aria-label="Additional instructions"
                title="Enter any additional instructions for taking the medication"
              />
            </div>

            {/* Clinical Indication */}
            <div>
              <label className="text-sm font-medium">
                Clinical Indication
              </label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Bacterial infection"
                value={prescriptionForm.clinicalIndication}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    clinicalIndication: e.target.value,
                  })
                }
                aria-label="Clinical indication"
                title="Enter the clinical reason for this prescription"
              />
            </div>

            {/* Add to List Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddToList}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add to Prescription List
              </Button>
            </div>

            {/* Medications List */}
            {medicationsList.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">
                    Medications to Prescribe ({medicationsList.length})
                  </label>
                </div>
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {medicationsList.map((med, index) => (
                    <div key={index} className="p-3 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium">{med.medicationItem}</div>
                        <div className="text-sm text-muted-foreground">
                          {med.doseAmount} {med.doseUnit} • {med.route} • {med.timingDirections}
                          {med.directionDuration && ` • ${med.directionDuration}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromList(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPrescriptionForm(false);
                  setMedicationsList([]);
                  setPrescriptionForm({
                    medicationItem: "",
                    medicationItemCode: "",
                    medicationItemTerminology: "SNOMED-CT",
                    doseAmount: "",
                    doseUnit: "",
                    doseFormula: "",
                    route: "",
                    routeCode: "",
                    bodySite: "",
                    bodySiteCode: "",
                    administrationMethod: "",
                    administrationMethodCode: "",
                    timingDirections: "",
                    frequency: "",
                    interval: "",
                    asRequired: false,
                    asRequiredCriterion: "",
                    directionDuration: "",
                    usage: "",
                    validUntil: "",
                    clinicalIndication: "",
                    clinicalIndicationCode: "",
                    clinicalIndicationTerminology: "ICD-10",
                    medicationSafety: "",
                    maximumDoseAmount: "",
                    maximumDoseUnit: "",
                    maximumDosePeriod: "",
                    additionalInstruction: "",
                    patientInstruction: "",
                    orderType: "dose-based",
                    comment: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmitPrescriptions}
                disabled={medicationsList.length === 0}
              >
                Submit {medicationsList.length > 0 ? `${medicationsList.length} Prescription${medicationsList.length > 1 ? 's' : ''}` : 'Prescriptions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Details Dialog */}
      <Dialog
        open={showDetails && selectedPrescription !== null}
        onOpenChange={(open) => {
          setShowDetails(open);
          if (!open) {
            setSelectedPrescription(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPrescription?.product_name ||
                selectedPrescription?.medication_item ||
                "Prescription details"}
            </DialogTitle>
            <DialogDescription>
              Complete information about this medication order
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4 text-sm">
              {/* Medication Information */}
              <div>
                <h4 className="font-medium">Medication Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-xs text-gray-500">Medication:</span>
                    <p className="font-medium">
                      {selectedPrescription.medication_item}
                    </p>
                  </div>
                  {selectedPrescription.product_name && (
                    <div>
                      <span className="text-xs text-gray-500">
                        Product name:
                      </span>
                      <p className="font-medium">
                        {selectedPrescription.product_name}
                      </p>
                    </div>
                  )}
                  {selectedPrescription.active_ingredient && (
                    <div>
                      <span className="text-xs text-gray-500">
                        Active ingredient:
                      </span>
                      <p className="font-medium">
                        {selectedPrescription.active_ingredient}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">Dosage:</span>
                    <p className="font-medium">
                      {selectedPrescription.dose_amount ||
                        selectedPrescription.timing_directions ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Route:</span>
                    <p className="font-medium">
                      {selectedPrescription.route}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Timing:</span>
                    <p className="font-medium">
                      {selectedPrescription.timing_directions || "-"}
                    </p>
                  </div>
                  {selectedPrescription.usage && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Usage:</span>
                      <p className="mt-1">
                        {selectedPrescription.usage}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Information */}
              <div>
                <h4 className="font-medium">Clinical Information</h4>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">
                      Date of issue:
                    </span>
                    <p className="mt-1">
                      {new Date(
                        selectedPrescription.recorded_time
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedPrescription.valid_until && (
                    <div>
                      <span className="text-xs text-gray-500">
                        Valid until:
                      </span>
                      <p className="mt-1">
                        {selectedPrescription.valid_until}
                      </p>
                    </div>
                  )}
                  {selectedPrescription.clinical_indication && (
                    <div>
                      <span className="text-xs text-gray-500">
                        Clinical indication:
                      </span>
                      <p className="mt-1">
                        {selectedPrescription.clinical_indication}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Information */}
              <div>
                <h4 className="font-medium">Provider Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-xs text-gray-500">
                      Prescribed by:
                    </span>
                    <p className="font-medium">
                      {selectedPrescription.prescribed_by}
                    </p>
                  </div>
                  {selectedPrescription.issued_from && (
                    <div>
                      <span className="text-xs text-gray-500">Workplace:</span>
                      <p className="font-medium">
                        {selectedPrescription.issued_from}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Instructions */}
              {(selectedPrescription.additional_instruction ||
                selectedPrescription.instructions ||
                selectedPrescription.comment) && (
                <div>
                  <h4 className="font-medium">Notes & Instructions</h4>
                  <div className="mt-2 space-y-2">
                    {(selectedPrescription.additional_instruction ||
                      selectedPrescription.instructions) && (
                      <div>
                        <span className="text-xs text-gray-500">
                          Instructions:
                        </span>
                        <p className="mt-1">
                          {selectedPrescription.additional_instruction ||
                            selectedPrescription.instructions}
                        </p>
                      </div>
                    )}
                    {selectedPrescription.comment && (
                      <div>
                        <span className="text-xs text-gray-500">Comment:</span>
                        <p className="mt-1">
                          {selectedPrescription.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="bg-blue-200/90 hover:bg-blue-300"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Medication Summary Modal */}
      <Dialog
        open={showMedicationSummary}
        onOpenChange={setShowMedicationSummary}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              System → Medication Summary (generated)
            </DialogTitle>
            <DialogDescription>
              Complete medication history and current active medications from OpenEHR system
            </DialogDescription>
          </DialogHeader>

          {medicationSummaryData && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Total Events</h4>
                  <p className="text-2xl font-bold">{medicationSummaryData.totalEvents}</p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Active Medications</h4>
                  <p className="text-2xl font-bold text-green-600">{medicationSummaryData.activeMedications}</p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Patient ID</h4>
                  <p className="text-lg font-semibold">{medicationSummaryData.patientName}</p>
                </Card>
              </div>

              {/* Medication Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Medication Timeline</h3>
                <div className="space-y-3">
                  {Object.entries(medicationSummaryData.timeline || {}).map(([medication, events]: [string, any]) => (
                    <Card key={medication} className="p-4">
                      <h4 className="font-medium text-blue-600 mb-2">{medication}</h4>
                      <div className="space-y-2">
                        {events.map((event: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{event.actionState}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.time).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Route: {event.route} | Quantity: {event.quantity} {event.unit}
                              </div>
                              {event.batchNumber && (
                                <div className="text-xs text-muted-foreground">
                                  Batch: {event.batchNumber} | Expires: {event.expiryDate}
                                </div>
                              )}
                              {event.composer && (
                                <div className="text-xs text-muted-foreground">
                                  By: {event.composer}
                                </div>
                              )}
                            </div>
                            <Badge 
                              variant={event.actionState.includes("dispensed") ? "default" : "outline"}
                              className="text-xs"
                            >
                              {event.actionState}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowMedicationSummary(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

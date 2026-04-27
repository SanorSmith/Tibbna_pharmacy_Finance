"use client";
import { useState, useEffect } from "react";
import { History, Plus, Trash2, Printer, ChevronDown, ChevronUp, Calendar, User, Pill } from "lucide-react";
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
  patient?: {
    patientid: string;
    firstname: string;
    middlename?: string | null;
    lastname: string;
    dateofbirth?: string | null;
    gender?: string | null;
    nationalid?: string | null;
  };
}

export function MedsTab({ workspaceid, patientid, prescriptions, loadingPrescriptions, loadPrescriptions, patient: patientProp }: MedsTabProps) {
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPrescription, setSelectedPrescription] =
    useState<PrescriptionRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [medicationSummaryData, setMedicationSummaryData] = useState<any>(null);
  const [showMedicationSummary, setShowMedicationSummary] = useState(false);
  const [medicationsList, setMedicationsList] = useState<typeof prescriptionForm[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<string | null>(null);

  // Fetch current user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const userData = await response.json();
          console.log('User data:', userData); // Debug: log user data structure
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUser();
  }, []);
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

  // Group prescriptions by order (same date/time = same order)
  const groupPrescriptionsByOrder = (prescriptions: PrescriptionRecord[]) => {
    const orders = new Map<string, PrescriptionRecord[]>();
    
    prescriptions.forEach(prescription => {
      // Group by date (same day prescriptions are considered same order)
      const orderDate = new Date(prescription.recorded_time).toISOString().split('T')[0];
      const orderTime = new Date(prescription.recorded_time).toISOString().split('T')[1].substring(0, 5); // HH:MM
      const orderKey = `${orderDate}_${orderTime}`;
      
      if (!orders.has(orderKey)) {
        orders.set(orderKey, []);
      }
      orders.get(orderKey)!.push(prescription);
    });
    
    return Array.from(orders.entries()).map(([key, items]) => ({
      orderKey: key,
      orderDate: items[0].recorded_time,
      prescribedBy: items[0].prescribed_by,
      medications: items,
      status: items.every(p => p.status === 'active') ? 'active' : 
              items.every(p => p.status === 'expired') ? 'expired' : 'mixed'
    }));
  };

  const toggleOrder = (orderKey: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderKey)) {
      newExpanded.delete(orderKey);
    } else {
      newExpanded.add(orderKey);
    }
    setExpandedOrders(newExpanded);
  };

  const printOrder = async (orderKey: string) => {
    try {
      // Find the order
      const order = groupPrescriptionsByOrder(prescriptions).find(o => o.orderKey === orderKey);
      if (!order) {
        alert('Order not found');
        return;
      }

      console.log('Patient prop:', patientProp); // Debug log

      // Import the HTML generator
      const { generatePrescriptionOrderHTML } = await import('@/lib/prescription-order-html');
      
      // Prepare data
      const prescriptionData = {
        facility: {
          name: currentUser?.workspaces?.find((w: any) => w.workspace.workspaceid === workspaceid)?.workspace?.name || 'Healthcare Center',
          address: currentUser?.workspaces?.find((w: any) => w.workspace.workspaceid === workspaceid)?.workspace?.address || null,
          phone: currentUser?.workspaces?.find((w: any) => w.workspace.workspaceid === workspaceid)?.workspace?.phone || null,
        },
        patient: patientProp ? {
          patientid: patientProp.patientid,
          firstname: patientProp.firstname,
          middlename: patientProp.middlename,
          lastname: patientProp.lastname,
          dateofbirth: patientProp.dateofbirth,
          gender: patientProp.gender,
          age: patientProp.dateofbirth ? Math.floor((new Date().getTime() - new Date(patientProp.dateofbirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
          nationalid: patientProp.nationalid,
        } : null,
        prescribedBy: order.prescribedBy,
        orderDate: order.orderDate,
        medications: order.medications.map(med => ({
          medication_item: med.medication_item,
          dose_amount: med.dose_amount,
          dose_unit: med.dose_unit,
          route: med.route,
          timing_directions: med.timing_directions,
          usage: med.usage,
          valid_until: med.valid_until,
          additional_instruction: med.additional_instruction,
          clinical_indication: med.clinical_indication,
        })),
      };

      console.log('Prescription data:', prescriptionData); // Debug log

      // Generate and print
      const html = generatePrescriptionOrderHTML(prescriptionData);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print prescription order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Fetch medication summary from OpenEHR
  const fetchMedicationSummary = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/medications`);
      if (res.ok) {
        const data = await res.json();
        setMedicationSummaryData(data);
        setShowMedicationSummary(true);
      } else {
        const error = await res.json();
        console.error("Failed to fetch medication summary:", error);
        alert(`Failed to fetch medication summary: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error fetching medication summary:", error);
      alert("Error fetching medication summary. Please check console for details.");
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
                className="bg-blue-600 hover:bg-blue-700 text-white !important"
                size="sm"
                onClick={fetchMedicationSummary}
              >
                Medication Summary
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
                onClick={() => setShowPrescriptionForm(true)}
              >
                + New Prescription
              </Button>
              <Button
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
            <div className="space-y-3">
              {groupPrescriptionsByOrder(
                showHistory
                  ? prescriptions.filter((p) => p.status === "expired")
                  : prescriptions.filter((p) => p.status !== "expired")
              ).map((order) => {
                const isExpanded = expandedOrders.has(order.orderKey);
                const isPrintSelected = selectedOrderForPrint === order.orderKey;
                
                return (
                  <Card 
                    key={order.orderKey} 
                    className={`border-2 ${isPrintSelected ? 'print-only' : ''} ${
                      order.status === 'active' ? 'border-green-200' : 
                      order.status === 'expired' ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Pill className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-semibold text-base">
                                Prescription Order - {order.medications.length} medication{order.medications.length > 1 ? 's' : ''}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(order.orderDate).toLocaleDateString()} at {new Date(order.orderDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {order.prescribedBy}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={
                              order.status === 'active' ? 'bg-green-200 text-green-800' : 
                              order.status === 'expired' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'
                            }
                          >
                            {order.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printOrder(order.orderKey)}
                            className="print:hidden"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOrder(order.orderKey)}
                            className="print:hidden"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {order.medications.map((prescription, idx) => (
                            <div 
                              key={prescription.composition_uid}
                              className={`p-3 rounded-lg border ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <div className="font-medium text-sm">{prescription.medication_item}</div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <div><span className="font-medium">Dosage:</span> {prescription.dose_amount || prescription.dose_unit
                                      ? `${prescription.dose_amount ?? ""}${prescription.dose_unit ? ` ${prescription.dose_unit}` : ""}`
                                      : prescription.timing_directions || "N/A"}</div>
                                    <div><span className="font-medium">Route:</span> {prescription.route}</div>
                                    <div><span className="font-medium">Usage:</span> {prescription.usage || "-"}</div>
                                    {prescription.valid_until && (
                                      <div><span className="font-medium">Valid until:</span> {prescription.valid_until}</div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPrescription(prescription);
                                    setShowDetails(true);
                                  }}
                                  className="ml-2 print:hidden"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Form Dialog */}
      <Dialog
        open={showPrescriptionForm}
        onOpenChange={setShowPrescriptionForm}
      >
        <DialogContent className="w-[90vw] max-w-[1200px] max-h-[90vh] overflow-y-auto">
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
                    let route = "";
                    
                    // Handle different route data formats
                    if (drug.route) {
                      if (typeof drug.route === 'string') {
                        // If route is already a simple string like "oral"
                        if (!drug.route.includes('Route:')) {
                          route = drug.route.toLowerCase();
                        } else {
                          // If route is in format "Route: Oral"
                          const routeMatch = drug.route.match(/Route:\s*([^,]+)/i);
                          route = routeMatch ? routeMatch[1].trim().toLowerCase() : drug.route.toLowerCase();
                        }
                      }
                    }
                    
                    // Map route names to dropdown values
                    const routeMapping: { [key: string]: string } = {
                      'oral': 'Oral',
                      'parenteral': 'Parenteral', 
                      'nasal': 'Nasal',
                      'rectal': 'Rectal',
                      'vaginal': 'Vaginal',
                      'implant': 'Implant',
                      'inhalation': 'Inhalation',
                      'instillation': 'Instillation',
                      'sublingual': 'Sublingual',
                      'buccal': 'Sublingual',
                      'oromucosal': 'Sublingual',
                      'transdermal': 'Transdermal',
                      'intravenous': 'Parenteral',
                      'intramuscular': 'Parenteral',
                      'subcutaneous': 'Parenteral',
                      'topical': 'Transdermal'
                    };
                    
                    const formattedRoute = routeMapping[route] || route.charAt(0).toUpperCase() + route.slice(1);
                    
                    setPrescriptionForm({
                      ...prescriptionForm,
                      medicationItem: drug.name,
                      route: formattedRoute,
                      doseUnit: "mg", // Default to mg for all medications
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
                  <option value="g">g (gram)</option>
                  <option value="mg">mg (milligram)</option>
                  <option value="mcg">mcg (microgram)</option>
                  <option value="U">U (unit)</option>
                  <option value="TU">TU (thousand units)</option>
                  <option value="MU">MU (million units)</option>
                  <option value="mmol">mmol (millimole)</option>
                  <option value="ml">ml (milliliter)</option>
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
                  <option value="Implant">Implant</option>
                  <option value="Inhalation">Inhalation</option>
                  <option value="Instillation">Instillation</option>
                  <option value="Nasal">Nasal</option>
                  <option value="Oral">Oral</option>
                  <option value="Parenteral">Parenteral</option>
                  <option value="Rectal">Rectal</option>
                  <option value="Sublingual">Sublingual</option>
                  <option value="Transdermal">Transdermal</option>
                  <option value="Vaginal">Vaginal</option>
                </select>
              </div>
            </div>

            {/* Instructions & Usage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.additionalInstruction}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      additionalInstruction: e.target.value,
                    })
                  }
                  aria-label="Instructions"
                  title="Select specific instructions"
                >
                  <option value="">Select...</option>
                  <option value="Take with food">Take with food</option>
                  <option value="Take before meals">Take before meals</option>
                  <option value="Take after meals">Take after meals</option>
                  <option value="Take with plenty of water">Take with plenty of water</option>
                  <option value="Swallow whole, do not crush">Swallow whole, do not crush</option>
                  <option value="Chew well before swallowing">Chew well before swallowing</option>
                  <option value="Dissolve under tongue">Dissolve under tongue</option>
                  <option value="Shake well before use">Shake well before use</option>
                  <option value="Avoid driving after taking">Avoid driving after taking</option>
                  <option value="Avoid alcohol during treatment">Avoid alcohol during treatment</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Usage</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.usage}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      usage: e.target.value,
                    })
                  }
                  aria-label="Usage"
                  title="Select the usage purpose"
                >
                  <option value="">Select...</option>
                  <option value="For headache">For headache</option>
                  <option value="For fever">For fever</option>
                  <option value="For high blood pressure">For high blood pressure</option>
                  <option value="For diabetes">For diabetes</option>
                  <option value="For infection">For infection</option>
                  <option value="For asthma">For asthma</option>
                  <option value="For allergies">For allergies</option>
                  <option value="For stomach pain">For stomach pain</option>
                  <option value="For diarrhea">For diarrhea</option>
                  <option value="For anxiety">For anxiety</option>
                  <option value="For anemia">For anemia</option>
                  <option value="For vitamin deficiency">For vitamin deficiency</option>
                </select>
              </div>
            </div>

            {/* Timing Directions, Duration & Valid Until */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Timing Directions *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.timingDirections}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      timingDirections: e.target.value,
                    })
                  }
                  aria-label="Timing Directions"
                  title="Select the timing directions"
                >
                  <option value="">Select...</option>
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="Three times daily">Three times daily</option>
                  <option value="Four times daily">Four times daily</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every 8 hours">Every 8 hours</option>
                  <option value="Every 12 hours">Every 12 hours</option>
                  <option value="As needed">As needed</option>
                  <option value="When in pain">When in pain</option>
                  <option value="When fever rises">When fever rises</option>
                  <option value="Before sleep">Before sleep</option>
                  <option value="After meals">After meals</option>
                  <option value="Before meals">Before meals</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  value={prescriptionForm.directionDuration}
                  onChange={(e) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      directionDuration: e.target.value,
                    })
                  }
                  aria-label="Duration"
                  title="Select the duration"
                >
                  <option value="">Select...</option>
                  <option value="3 days">3 days</option>
                  <option value="5 days">5 days</option>
                  <option value="7 days">7 days</option>
                  <option value="10 days">10 days</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="Until finished">Until finished</option>
                </select>
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
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-3 text-sm">
              {/* Medication Information */}
              <div>
                <h4 className="font-medium mb-2">Medication Information</h4>
                <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Medication:</span>
                    <p className="font-medium text-sm">{selectedPrescription.medication_item}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Dosage:</span>
                    <p className="font-medium text-sm">
                      {(() => {
                        // Extract dosage with unit from timing_directions or dose_amount
                        if (selectedPrescription.timing_directions) {
                          const doseMatch = selectedPrescription.timing_directions.match(/(\d+)\s*(mg|g|mcg|ml|U|TU|MU|mmol)/i);
                          if (doseMatch) return `${doseMatch[1]} ${doseMatch[2]}`;
                        }
                        if (selectedPrescription.dose_amount && selectedPrescription.dose_unit) {
                          return `${selectedPrescription.dose_amount} ${selectedPrescription.dose_unit}`;
                        }
                        return selectedPrescription.dose_amount || "-";
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Route:</span>
                    <p className="font-medium text-sm">{selectedPrescription.route}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Timing:</span>
                    <p className="font-medium text-sm">
                      {(() => {
                        // Extract only frequency and duration from timing_directions
                        if (!selectedPrescription.timing_directions) return "-";
                        const timing = selectedPrescription.timing_directions;
                        // Remove dosage amount, unit, and route
                        const parts = timing.split(',').map((p: string) => p.trim());
                        const relevantParts = parts.filter((p: string) => 
                          !p.match(/^\d+\s*(mg|g|mcg|ml|U|TU|MU|mmol)/i) && 
                          !['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Rectal', 'Sublingual', 'Inhalation'].includes(p)
                        );
                        return relevantParts.join(', ') || timing;
                      })()}
                    </p>
                  </div>
                  {selectedPrescription.usage && (
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Usage:</span>
                      <p className="text-sm">{selectedPrescription.usage}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Information */}
              <div>
                <h4 className="font-medium mb-2">Clinical Information</h4>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Date of issue:</span>
                    <p className="text-sm">
                      {new Date(selectedPrescription.recorded_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Valid until:</span>
                    <p className="text-sm">{selectedPrescription.valid_until || "-"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Clinical indication:</span>
                    <p className="text-sm">{selectedPrescription.clinical_indication || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Provider Information */}
              <div>
                <h4 className="font-medium mb-2">Provider Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Prescribed by:</span>
                    <p className="font-medium text-sm">{selectedPrescription.prescribed_by}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Workplace:</span>
                    <p className="font-medium text-sm">{selectedPrescription.issued_from || "-"}</p>
                  </div>
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

      {/* Medication Summary Dialog */}
      <Dialog
        open={showMedicationSummary}
        onOpenChange={setShowMedicationSummary}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="text-2xl font-bold">Medication List</div>
              <div className="text-lg font-normal mt-1">{new Date().toLocaleDateString('en-US')}</div>
            </DialogTitle>
          </DialogHeader>

          {medicationSummaryData && (
            <div className="space-y-4">
              {/* Header with Patient and Hospital Info */}
              <div className="flex justify-between items-start print:block">
                {/* Hospital Info - Left */}
                <div className="text-sm space-y-1 print:mb-4">
                  <div className="font-bold text-lg print:text-base">
                    {currentUser?.workspaces?.find(w => w.workspace.workspaceid === workspaceid)?.workspace?.name || 
                     currentUser?.name || currentUser?.email || 'Healthcare Center'}
                  </div>
                  <div className="print:block">
                    {currentUser?.workspaces?.find(w => w.workspace.workspaceid === workspaceid)?.workspace?.address || 
                     'Address not available'}
                  </div>
                  <div className="print:block">
                    Tel: {currentUser?.workspaces?.find(w => w.workspace.workspaceid === workspaceid)?.workspace?.phone || 
                    'Phone not available'}
                  </div>
                  <div className="print:block">
                    {currentUser?.workspaces?.find(w => w.workspace.workspaceid === workspaceid)?.workspace?.website || 
                    currentUser?.email || 'Website not available'}
                  </div>
                </div>

                {/* Patient Info - Right */}
                <div className="text-sm space-y-1 text-right print:text-left print:mt-4">
                  <div className="font-bold">Patient Information</div>
                  <div className="print:block"><strong>Name:</strong> {medicationSummaryData.patientName}</div>
                  <div className="print:block"><strong>ID:</strong> {medicationSummaryData.nationalId || 'N/A'}</div>
                  <div className="print:block"><strong>Date:</strong> {new Date().toLocaleDateString('en-US')}</div>
                  <div className="print:block"><strong>Prescribed by:</strong> {currentUser?.name || currentUser?.email || 'N/A'}</div>
                </div>
              </div>

              {/* Medication List */}
              <div className="border rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold p-4 bg-muted border-b">Regular Medications</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium border-r">Valid from</th>
                        <th className="text-left p-3 font-medium border-r">Valid until</th>
                        <th className="text-left p-3 font-medium border-r">Medication</th>
                        <th className="text-left p-3 font-medium border-r">Treatment reason</th>
                        <th className="text-left p-3 font-medium border-r">Dosing</th>
                        <th className="text-left p-3 font-medium">Dosing instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicationSummaryData.events && medicationSummaryData.events.length > 0 ? (
                        medicationSummaryData.events.map((event: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/20">
                            <td className="p-3 border-r align-top">
                              {new Date(event.time).toLocaleDateString('sv-SE')}
                            </td>
                            <td className="p-3 border-r align-top">
                              {event.validUntil ? new Date(event.validUntil).toLocaleDateString('sv-SE') : '-'}
                            </td>
                            <td className="p-3 border-r align-top">
                              <div className="font-medium">{event.medication_item}</div>
                              {event.route && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {event.route}
                                </div>
                              )}
                            </td>
                            <td className="p-3 border-r align-top">
                              <div className="text-sm">
                                {event.comment || '-'}
                              </div>
                            </td>
                            <td className="p-3 border-r align-top">
                              {event.timingDirections ? (
                                <div className="text-sm">
                                  {/* Extract tablet count based on frequency, not dosage amount */}
                                  {(() => {
                                    const timing = event.timingDirections;
                                    const frequencyMatch = timing.match(/(once|twice|three times|four times|1|2|3|4)\s*(daily|a day)/i);
                                    
                                    if (frequencyMatch) {
                                      let freq = frequencyMatch[1].toLowerCase();
                                      
                                      // Use reasonable tablet counts (1 tablet per dose by default)
                                      // Could be enhanced to use actual tablet count from prescription data
                                      if (freq === 'once' || freq === '1') return '1 st';
                                      if (freq === 'twice' || freq === '2') return '1 + 1 st';
                                      if (freq === 'three times' || freq === '3') return '1 + 1 + 1 st';
                                      if (freq === 'four times' || freq === '4') return '1 + 1 + 1 + 1 st';
                                    }
                                    
                                    // If no clear frequency, default to 1 tablet
                                    return '1 st';
                                  })()}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">-</div>
                              )}
                            </td>
                            <td className="p-3 align-top">
                              <div className="text-sm">
                                {event.timingDirections ? (
                                  // Extract only the frequency and duration (e.g., "Three times daily, for 5 days")
                                  // Remove dosage amount, unit, and route from the beginning
                                  (() => {
                                    const parts = event.timingDirections.split(',').map((p: string) => p.trim());
                                    // Skip first part if it contains dosage (e.g., "652 mg")
                                    // Skip route part (e.g., "Oral")
                                    const relevantParts = parts.filter((p: string) => 
                                      !p.match(/^\d+\s*(mg|g|mcg|ml|U|TU|MU|mmol)/i) && 
                                      !['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Rectal', 'Sublingual', 'Inhalation'].includes(p)
                                    );
                                    return relevantParts.join(', ') || '-';
                                  })()
                                ) : '-'}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No medications found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  onClick={() => window.print()}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button onClick={() => setShowMedicationSummary(false)}
                  className="bg-blue-200/90 hover:bg-blue-300"
                  >
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

"use client";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lab Results interfaces (openEHR compliant)
export interface LabTestAnalyte {
  analyte_name: string;
  analyte_code?: string;
  result_value: string | number;
  result_unit?: string;
  reference_range?: string;
  result_status: string;
  result_flag?: string;
}

export interface LabTestResult {
  composition_uid: string;
  recorded_time: string;
  test_name: string;
  test_name_code?: string;
  protocol: string;
  specimen_type?: string;
  specimen_collection_time?: string;
  specimen_received_time?: string;
  specimen_id?: string;
  overall_test_status: string;
  clinical_information_provided?: string;
  test_results: LabTestAnalyte[];
  conclusion?: string;
  test_diagnosis?: string;
  laboratory_name: string;
  reported_by?: string;
  verified_by?: string;
  report_date: string;
}

export interface LabTestOrder {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requested_date: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  timing: string;
  request_id: string;
  narrative: string;
}

interface LabsTabProps {
  workspaceid: string;
  patientid: string;
}

export function LabsTab({ workspaceid, patientid }: LabsTabProps) {
  const [labResultRecords, setLabResultRecords] = useState<LabTestResult[]>([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTestResult | null>(null);
  
  const [showLabOrderForm, setShowLabOrderForm] = useState(false);
  const [labOrderForm, setLabOrderForm] = useState({
    service_name: "",
    service_type_code: "104177005",
    service_type_value: "Complete blood count (procedure)",
    description: "",
    clinical_indication: "",
    urgency: "routine",
    requested_date: "",
    requesting_provider: "",
    receiving_provider: "",
    timing: "",
    narrative: "",
  });

  const loadLabResults = useCallback(async () => {
    try {
      setLoadingLabResults(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/lab-results`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setLabResultRecords(data.labResults || []);
      } else {
        console.error("Failed to load lab results");
      }
    } catch (error) {
      console.error("Error loading lab results:", error);
    } finally {
      setLoadingLabResults(false);
    }
  }, [workspaceid, patientid]);

  // Load lab results when component mounts
  useEffect(() => {
    loadLabResults();
  }, [loadLabResults]);

  const saveLabOrder = async () => {
    if (!labOrderForm.service_name || !labOrderForm.clinical_indication) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      console.log("Saving lab order with data:", labOrderForm);
      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/lab-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labOrder: labOrderForm,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save lab order"
        );
      }

      const result = await response.json();
      console.log("Lab order saved successfully:", result);

      setShowLabOrderForm(false);
      setLabOrderForm({
        service_name: "",
        service_type_code: "104177005",
        service_type_value: "Complete blood count (procedure)",
        description: "",
        clinical_indication: "",
        urgency: "routine",
        requested_date: "",
        requesting_provider: "",
        receiving_provider: "",
        timing: "",
        narrative: "",
      });
      
      // Wait a moment for the composition to be available, then reload
      setTimeout(() => {
        loadLabResults();
      }, 500);
    } catch (error) {
      console.error("Error saving lab order:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save lab order"
      );
    }
  };

  return (
    <div>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Laboratory Test Results</CardTitle>
            <p className="text-sm text-muted-foreground">
              openEHR: Laboratory test result
            </p>
          </div>
         
        </div>
      </CardHeader>
      <CardContent>
        {loadingLabResults ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading lab results...
          </div>
        ) : labResultRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lab results found.
          </div>
        ) : (
          <div className="space-y-4">
            {labResultRecords.map((result) => (
              <div
                key={result.composition_uid}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {result.test_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Protocol: {result.protocol}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.laboratory_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        result.overall_test_status === "final"
                          ? "bg-green-100 text-green-800"
                          : result.overall_test_status === "preliminary"
                          ? "bg-yellow-100 text-yellow-800"
                          : result.overall_test_status === "amended"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {result.overall_test_status
                        .charAt(0)
                        .toUpperCase() +
                        result.overall_test_status.slice(1)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(result.report_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Specimen Details */}
                {result.specimen_type && (
                  <div className="mb-3 p-2 bg-muted/30 rounded">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Specimen Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Type:
                        </span>{" "}
                        {result.specimen_type}
                      </div>
                      {result.specimen_collection_time && (
                        <div>
                          <span className="text-muted-foreground">
                            Collected:
                          </span>{" "}
                          {new Date(
                            result.specimen_collection_time
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Test Results with Traffic Light Colors */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">Test Results</p>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left text-xs font-medium">
                            Analyte
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            Result
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            Range
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            Unit
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.test_results.map((analyte, idx) => (
                          <tr
                            key={idx}
                            className="border-b last:border-0 hover:bg-muted/30"
                          >
                            <td className="p-2 text-sm font-medium">
                              {analyte.analyte_name}
                            </td>
                            <td className="p-2 text-sm font-semibold">
                              {analyte.result_value}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {analyte.reference_range || "N/A"}
                            </td>
                            <td className="p-2 text-sm">
                              {analyte.result_unit || "-"}
                            </td>
                            <td className="p-2 text-sm">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  analyte.result_status === "normal"
                                    ? "bg-green-100 text-green-800"
                                    : analyte.result_status === "high" ||
                                      analyte.result_status === "low"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : analyte.result_status === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                                aria-label={`Result status: ${analyte.result_flag || analyte.result_status}`}
                                title={`Result status: ${analyte.result_flag || analyte.result_status}`}
                              >
                                {analyte.result_flag ||
                                  analyte.result_status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinical Information */}
                {result.clinical_information_provided && (
                  <div className="mb-3 p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium text-blue-900 mb-1">
                      Clinical Information Provided
                    </p>
                    <p className="text-sm">
                      {result.clinical_information_provided}
                    </p>
                  </div>
                )}

                {/* Conclusion */}
                {result.conclusion && (
                  <div className="mb-3 p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium text-purple-900 mb-1">
                      Conclusion
                    </p>
                    <p className="text-sm">{result.conclusion}</p>
                  </div>
                )}

                {/* Test Diagnosis */}
                {result.test_diagnosis && (
                  <div className="mb-3 p-2 bg-orange-50 rounded">
                    <p className="text-xs font-medium text-orange-900 mb-1">
                      Test Diagnosis
                    </p>
                    <p className="text-sm">{result.test_diagnosis}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div>
                    {result.reported_by && (
                      <span>Reported by: {result.reported_by}</span>
                    )}
                    {result.verified_by && (
                      <span className="ml-3">
                        Verified by: {result.verified_by}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTest(result);
                      setShowTestDetails(true);
                    }}
                    className="text-primary hover:underline"
                    aria-label="View detailed lab result information"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Test Details Dialog */}
    <Dialog open={showTestDetails} onOpenChange={setShowTestDetails}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lab Test Details</DialogTitle>
          <DialogDescription>
            Detailed information about the laboratory test
          </DialogDescription>
        </DialogHeader>
        {selectedTest && (
          <div className="space-y-4">
            {/* Laboratory Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Laboratory Name
                </div>
                <div className="text-base font-semibold">
                  {selectedTest.laboratory_name}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Test Date
                </div>
                <div className="text-base">{new Date(selectedTest.report_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Test Name */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Test Name
              </div>
              <div className="text-lg font-semibold">
                {selectedTest.test_name}
              </div>
            </div>

            {/* Results */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Test Results
              </div>
              <div className="space-y-2">
                {selectedTest.test_results?.map((analyte: LabTestAnalyte, index: number) => (
                  <div key={index} className="grid grid-cols-4 gap-2 text-sm border-b pb-2">
                    <div className="font-medium">{analyte.analyte_name}</div>
                    <div className="font-bold">{analyte.result_value} {analyte.result_unit}</div>
                    <div className="text-muted-foreground">{analyte.reference_range}</div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          analyte.result_status === "normal"
                            ? "bg-green-100 text-green-800"
                            : analyte.result_status === "abnormal"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {analyte.result_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Information */}
            {selectedTest.clinical_information_provided && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Clinical Information
                </div>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm">{selectedTest.clinical_information_provided}</p>
                </div>
              </div>
            )}

            {/* Conclusion */}
            {selectedTest.conclusion && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Conclusion
                </div>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm">{selectedTest.conclusion}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTestDetails(false)}
              >
                Close
              </Button>
              <Button>Download Report</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

     

      {/* Lab Order Form Dialog */}
      <Dialog open={showLabOrderForm} onOpenChange={setShowLabOrderForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
            <DialogDescription>
              Create a new laboratory test request based on openEHR service request template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label htmlFor="service_name" className="text-sm font-medium">
                Test Name *
              </label>
              <input
                id="service_name"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50"
                placeholder="Select test type below"
                value={labOrderForm.service_name}
                readOnly
                aria-label="Test name (auto-populated)"
                title="Test name is automatically populated when you select a test type"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select a test type below to auto-populate the test name
              </p>
            </div>

            {/* Service Type */}
            <div>
              <label htmlFor="service_type" className="text-sm font-medium">
                Test Type *
              </label>
              <select
                id="service_type"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={labOrderForm.service_type_code}
                onChange={(e) => {
                  const selected = e.target.value;
                  const testTypes: Record<string, { code: string; value: string; name: string }> = {
                    "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)" },
                    "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel" },
                    "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test" },
                    "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test" },
                    "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test" },
                  };
                  
                  const selectedType = testTypes[selected];
                  if (selectedType) {
                    setLabOrderForm({
                      ...labOrderForm,
                      service_name: selectedType.name,
                      service_type_code: selectedType.code,
                      service_type_value: selectedType.value,
                    });
                  }
                }}
                aria-label="Test type"
                title="Select the type of laboratory test"
              >
                <option value="">Select test type</option>
                <option value="104177005">Complete Blood Count (CBC)</option>
                <option value="257051000">Comprehensive Metabolic Panel</option>
                <option value="116276005">Blood Glucose</option>
                <option value="271749007">Serum Cholesterol</option>
                <option value="271658002">Serum Triglycerides</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a test type will automatically fill the test name and SNOMED-CT codes
              </p>
            </div>

            {/* Clinical Indication */}
            <div>
              <label htmlFor="clinical_indication" className="text-sm font-medium">
                Clinical Indication *
              </label>
              <textarea
                id="clinical_indication"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia."
                value={labOrderForm.clinical_indication}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    clinical_indication: e.target.value,
                  })
                }
                aria-label="Clinical indication"
                title="Describe the clinical reason for ordering this test"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional details about the test request"
                value={labOrderForm.description}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    description: e.target.value,
                  })
                }
                aria-label="Test description"
                title="Additional description for the laboratory test"
              />
            </div>

            {/* Urgency and Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="urgency" className="text-sm font-medium">
                  Urgency
                </label>
                <select
                  id="urgency"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={labOrderForm.urgency}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      urgency: e.target.value,
                    })
                  }
                  aria-label="Urgency"
                  title="Select the urgency of the test request"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                  <option value="asap">ASAP</option>
                </select>
              </div>
              <div>
                <label htmlFor="timing" className="text-sm font-medium">
                  Scheduled Date/Time
                </label>
                <input
                  id="timing"
                  type="datetime-local"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={labOrderForm.timing}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      timing: e.target.value,
                    })
                  }
                  aria-label="Scheduled timing"
                  title="When the test should be performed"
                />
              </div>
            </div>

            
            {/* Provider Information */}
           {/*  

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="requesting_provider" className="text-sm font-medium">
                  Requesting Provider
                </label>
                <input
                  id="requesting_provider"
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Dr. John Doe, General Medicine"
                  value={labOrderForm.requesting_provider}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      requesting_provider: e.target.value,
                    })
                  }
                  aria-label="Requesting provider"
                  title="Name of the healthcare provider ordering the test"
                />
              </div>
              <div>
                <label htmlFor="receiving_provider" className="text-sm font-medium">
                  Receiving Laboratory
                </label>
                <input
                  id="receiving_provider"
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Hematology Laboratory"
                  value={labOrderForm.receiving_provider}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      receiving_provider: e.target.value,
                    })
                  }
                  aria-label="Receiving provider"
                  title="Laboratory that will perform the test"
                />
              </div>
            </div> */}

            {/* Narrative */}
            <div>
              <label htmlFor="narrative" className="text-sm font-medium">
                Narrative Summary
              </label>
              <textarea
                id="narrative"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief summary of the lab order"
                value={labOrderForm.narrative}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    narrative: e.target.value,
                  })
                }
                aria-label="Narrative summary"
                title="Brief narrative summary of the lab order"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLabOrderForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={saveLabOrder}
              >
                Order Lab Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  </div>
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Scissors, Eye, RefreshCw } from "lucide-react";

// Care Plans interfaces (openEHR compliant)
export interface CarePlan {
  composition_uid: string;
  recorded_time: string;
  care_plan_name: string;
  
  // Problem/Diagnosis
  problem_diagnosis?: string;
  clinical_description?: string;
  body_site?: string;
  date_of_onset?: string;
  severity?: string;
  
  // Goal
  goal_name?: string;
  goal_description?: string;
  clinical_indication?: string;
  goal_start_date?: string;
  goal_end_date?: string;
  goal_outcome?: string;
  goal_comment?: string;
  
  // Service Request
  service_name?: string;
  service_description?: string;
  service_clinical_indication?: string;
  urgency?: string;
  requested_date?: string;
  request_status?: string;
  
  // Medication Order
  medication_item?: string;
  medication_route?: string;
  medication_directions?: string;
  clinical_indication_med?: string;
  
  created_by: string;
  status: string;
}

interface CarePlansTabProps {
  workspaceid: string;
  patientid: string;
}

export function CarePlansTab({ workspaceid, patientid }: CarePlansTabProps) {
  const [showCarePlanForm, setShowCarePlanForm] = useState(false);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loadingCarePlans, setLoadingCarePlans] = useState(false);
  const [selectedCarePlan, setSelectedCarePlan] = useState<CarePlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [savingCarePlan, setSavingCarePlan] = useState(false);
  
  // Operation-related state
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [savingOperation, setSavingOperation] = useState(false);
  const [operationFormData, setOperationFormData] = useState({
    operationname: "",
    scheduleddate: "",
    estimatedduration: "",
    operationtype: "elective" as "emergency" | "elective" | "urgent",
    theater: "",
    anesthesiatype: "",
    operationdiagnosis: "",
    preoperativeassessment: "",
    operationdetails: "",
  });

  const loadCarePlans = useCallback(async () => {
    try {
      setLoadingCarePlans(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/care-plans`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setCarePlans(data.carePlans || []);
      } else {
        console.error("Failed to load care plans:", res.status);
      }
    } catch (error) {
      console.error("Error loading care plans:", error);
    } finally {
      setLoadingCarePlans(false);
    }
  }, [workspaceid, patientid]);

  // Load care plans when component mounts
  useEffect(() => {
    loadCarePlans();
  }, [loadCarePlans]);

  const handleAddOperation = async () => {
    if (
      !operationFormData.operationname ||
      !operationFormData.scheduleddate
    ) {
      alert(
        "Please fill in required fields: Operation Name and Scheduled Date"
      );
      return;
    }

    try {
      setSavingOperation(true);
      const response = await fetch(`/api/d/${workspaceid}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...operationFormData,
          patientid,
          workspaceid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create operation");
      }

      setShowOperationDialog(false);
      setOperationFormData({
        operationname: "",
        scheduleddate: "",
        estimatedduration: "",
        operationtype: "elective",
        theater: "",
        anesthesiatype: "",
        operationdiagnosis: "",
        preoperativeassessment: "",
        operationdetails: "",
      });
    } catch (error) {
      console.error("Error creating operation:", error);
      alert("Failed to create operation");
    } finally {
      setSavingOperation(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Care Plans (openEHR)</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadCarePlans}
                disabled={loadingCarePlans}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingCarePlans ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => setShowOperationDialog(true)}>
                <Scissors className="h-4 w-4 mr-1" />
                Schedule Operation
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => setShowCarePlanForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Care Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCarePlans ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading care plans from openEHR...
            </div>
          ) : carePlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No care plans found. Click &quot;+ New Care Plan&quot; to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Care Plan Name</TableHead>
                    <TableHead>Problem/Diagnosis</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carePlans.map((plan) => (
                    <TableRow key={plan.composition_uid}>
                      <TableCell className="font-medium">
                        {plan.care_plan_name || plan.problem_diagnosis || "Care Plan"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {plan.problem_diagnosis || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {plan.goal_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            plan.status?.toLowerCase() === "active"
                              ? "bg-green-100 text-green-800"
                              : plan.status?.toLowerCase() === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : plan.status?.toLowerCase() === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {plan.status || "Active"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(plan.recorded_time).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {plan.created_by}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCarePlan(plan);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Plan Form Dialog - Minimal Required Fields */}
      <Dialog open={showCarePlanForm} onOpenChange={setShowCarePlanForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Care Plan (openEHR)</DialogTitle>
            <DialogDescription>
              Create a care plan with minimal required information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Required Fields Only */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="problemDiagnosis">Problem/Diagnosis *</Label>
                <Input
                  id="problemDiagnosis"
                  placeholder="e.g., Type 2 Diabetes Mellitus"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Primary medical condition or problem</p>
              </div>

              <div>
                <Label htmlFor="goalName">Care Goal *</Label>
                <Input
                  id="goalName"
                  placeholder="e.g., Achieve HbA1c below 7%"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Main objective of the care plan</p>
              </div>

              <div>
                <Label htmlFor="serviceName">Service/Intervention *</Label>
                <Input
                  id="serviceName"
                  placeholder="e.g., Diabetes Management Program"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Service or intervention to be provided</p>
              </div>
            </div>

            {/* Optional Fields - Collapsible */}
            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-sm">Additional Details (Optional)</summary>
              <div className="space-y-3 mt-4">
                <div>
                  <Label htmlFor="clinicalDescription">Clinical Description</Label>
                  <Textarea
                    id="clinicalDescription"
                    rows={2}
                    placeholder="Additional clinical details..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="goalDescription">Goal Description</Label>
                  <Textarea
                    id="goalDescription"
                    rows={2}
                    placeholder="Detailed goal description..."
                  />
                </div>

                <div>
                  <Label htmlFor="serviceDescription">Service Description</Label>
                  <Textarea
                    id="serviceDescription"
                    rows={2}
                    placeholder="Description of the service..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="severity">Severity</Label>
                    <Select defaultValue="mild">
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mild">Mild</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="urgency">Urgency</Label>
                    <Select defaultValue="Routine">
                      <SelectTrigger id="urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="goalStartDate">Goal Start Date</Label>
                    <Input id="goalStartDate" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="goalEndDate">Goal End Date</Label>
                    <Input id="goalEndDate" type="date" />
                  </div>
                </div>
              </div>
            </details>

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCarePlanForm(false)}
              disabled={savingCarePlan}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                const problemDiagnosis = (document.getElementById("problemDiagnosis") as HTMLInputElement)?.value?.trim();
                const goalName = (document.getElementById("goalName") as HTMLInputElement)?.value?.trim();
                const serviceName = (document.getElementById("serviceName") as HTMLInputElement)?.value?.trim();

                if (!problemDiagnosis || !goalName || !serviceName) {
                  alert("Please fill in all required fields (marked with *)");
                  return;
                }

                try {
                  setSavingCarePlan(true);
                  
                  // Get optional field values
                  const clinicalDescription = (document.getElementById("clinicalDescription") as HTMLTextAreaElement)?.value?.trim();
                  const goalDescription = (document.getElementById("goalDescription") as HTMLTextAreaElement)?.value?.trim();
                  const serviceDescription = (document.getElementById("serviceDescription") as HTMLTextAreaElement)?.value?.trim();
                  const severity = (document.getElementById("severity") as HTMLSelectElement)?.value;
                  const urgency = (document.getElementById("urgency") as HTMLSelectElement)?.value;
                  const goalStartDate = (document.getElementById("goalStartDate") as HTMLInputElement)?.value;
                  const goalEndDate = (document.getElementById("goalEndDate") as HTMLInputElement)?.value;

                  const res = await fetch(
                    `/api/d/${workspaceid}/patients/${patientid}/care-plans`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        carePlan: {
                          // Required fields
                          problemDiagnosis,
                          goalName,
                          serviceName,
                          
                          // Optional fields (only include if provided)
                          ...(clinicalDescription && { clinicalDescription }),
                          ...(goalDescription && { goalDescription }),
                          ...(serviceDescription && { serviceDescription }),
                          ...(severity && { severity }),
                          ...(urgency && { urgency }),
                          ...(goalStartDate && { goalStartDate }),
                          ...(goalEndDate && { goalEndDate }),
                          
                          // Default status
                          status: "Active",
                        },
                      }),
                    }
                  );

                  if (res.ok) {
                    await loadCarePlans();
                    setShowCarePlanForm(false);
                    alert("Care plan created successfully in openEHR!");
                    
                    // Clear form
                    (document.getElementById("problemDiagnosis") as HTMLInputElement).value = "";
                    (document.getElementById("goalName") as HTMLInputElement).value = "";
                    (document.getElementById("serviceName") as HTMLInputElement).value = "";
                    if (document.getElementById("clinicalDescription")) {
                      (document.getElementById("clinicalDescription") as HTMLTextAreaElement).value = "";
                    }
                    if (document.getElementById("goalDescription")) {
                      (document.getElementById("goalDescription") as HTMLTextAreaElement).value = "";
                    }
                    if (document.getElementById("serviceDescription")) {
                      (document.getElementById("serviceDescription") as HTMLTextAreaElement).value = "";
                    }
                  } else {
                    const error = await res.json();
                    alert(`Failed to create care plan: ${error.error}`);
                  }
                } catch (error) {
                  console.error("Error creating care plan:", error);
                  alert("Failed to create care plan. Please check the console for details.");
                } finally {
                  setSavingCarePlan(false);
                }
              }}
              disabled={savingCarePlan}
            >
              {savingCarePlan ? "Creating..." : "Create Care Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Operation Dialog */}
      <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Schedule Operation
            </DialogTitle>
            <DialogDescription>
              Schedule a surgical operation for this patient
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="operationname">Operation Name *</Label>
              <Input
                id="operationname"
                placeholder="e.g., Appendectomy"
                value={operationFormData.operationname}
                onChange={(e) =>
                  setOperationFormData({ ...operationFormData, operationname: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleddate">Scheduled Date & Time *</Label>
                <Input
                  id="scheduleddate"
                  type="datetime-local"
                  value={operationFormData.scheduleddate}
                  onChange={(e) =>
                    setOperationFormData({ ...operationFormData, scheduleddate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedduration">
                  Estimated Duration (minutes)
                </Label>
                <Input
                  id="estimatedduration"
                  type="number"
                  placeholder="e.g., 120"
                  value={operationFormData.estimatedduration}
                  onChange={(e) =>
                    setOperationFormData({
                      ...operationFormData,
                      estimatedduration: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operationtype">Operation Type</Label>
                <Select
                  value={operationFormData.operationtype}
                  onValueChange={(value: "emergency" | "elective" | "urgent") =>
                    setOperationFormData({ ...operationFormData, operationtype: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theater">Theater</Label>
                <Input
                  id="theater"
                  placeholder="e.g., Theater 1"
                  value={operationFormData.theater}
                  onChange={(e) =>
                    setOperationFormData({ ...operationFormData, theater: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anesthesiatype">Anesthesia Type</Label>
              <Input
                id="anesthesiatype"
                placeholder="e.g., General, Local, Spinal"
                value={operationFormData.anesthesiatype}
                onChange={(e) =>
                  setOperationFormData({ ...operationFormData, anesthesiatype: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationdiagnosis">Diagnosis</Label>
              <Textarea
                id="operationdiagnosis"
                placeholder="Enter diagnosis..."
                rows={2}
                value={operationFormData.operationdiagnosis}
                onChange={(e) =>
                  setOperationFormData({
                    ...operationFormData,
                    operationdiagnosis: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preoperativeassessment">
                Pre-operative Assessment
              </Label>
              <Textarea
                id="preoperativeassessment"
                placeholder="Enter pre-operative assessment..."
                rows={3}
                value={operationFormData.preoperativeassessment}
                onChange={(e) =>
                  setOperationFormData({
                    ...operationFormData,
                    preoperativeassessment: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationdetails">Operation Details</Label>
              <Textarea
                id="operationdetails"
                placeholder="Enter operation details..."
                rows={3}
                value={operationFormData.operationdetails}
                onChange={(e) => setOperationFormData({ ...operationFormData, operationdetails: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOperationDialog(false)}
              disabled={savingOperation}
            >
              Cancel
            </Button>
            <Button onClick={handleAddOperation} disabled={savingOperation} className="bg-orange-500 hover:bg-orange-600">
              {savingOperation ? "Scheduling..." : "Schedule Operation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Care Plan Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Care Plan Details</DialogTitle>
            <DialogDescription>
              Complete information from openEHR composition
            </DialogDescription>
          </DialogHeader>
          {selectedCarePlan && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Composition UID</p>
                    <p className="text-sm text-blue-700 font-mono">{selectedCarePlan.composition_uid}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Recorded Time</p>
                    <p className="text-sm text-blue-700">
                      {new Date(selectedCarePlan.recorded_time).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Created By</p>
                    <p className="text-sm text-blue-700">{selectedCarePlan.created_by}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Status</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCarePlan.status?.toLowerCase() === "active"
                          ? "bg-green-100 text-green-800"
                          : selectedCarePlan.status?.toLowerCase() === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {selectedCarePlan.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Problem/Diagnosis Section */}
              {selectedCarePlan.problem_diagnosis && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 text-amber-900">Problem/Diagnosis</h3>
                  <div className="space-y-2 bg-amber-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Problem/Diagnosis Name</p>
                      <p className="text-sm">{selectedCarePlan.problem_diagnosis}</p>
                    </div>
                    {selectedCarePlan.clinical_description && (
                      <div>
                        <p className="text-sm font-medium text-amber-900">Clinical Description</p>
                        <p className="text-sm">{selectedCarePlan.clinical_description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {selectedCarePlan.body_site && (
                        <div>
                          <p className="text-sm font-medium text-amber-900">Body Site</p>
                          <p className="text-sm">{selectedCarePlan.body_site}</p>
                        </div>
                      )}
                      {selectedCarePlan.severity && (
                        <div>
                          <p className="text-sm font-medium text-amber-900">Severity</p>
                          <p className="text-sm">{selectedCarePlan.severity}</p>
                        </div>
                      )}
                    </div>
                    {selectedCarePlan.date_of_onset && (
                      <div>
                        <p className="text-sm font-medium text-amber-900">Date of Onset</p>
                        <p className="text-sm">
                          {new Date(selectedCarePlan.date_of_onset).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Goal Section */}
              {selectedCarePlan.goal_name && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 text-green-900">Goal</h3>
                  <div className="space-y-2 bg-green-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-900">Goal Name</p>
                      <p className="text-sm">{selectedCarePlan.goal_name}</p>
                    </div>
                    {selectedCarePlan.goal_description && (
                      <div>
                        <p className="text-sm font-medium text-green-900">Goal Description</p>
                        <p className="text-sm">{selectedCarePlan.goal_description}</p>
                      </div>
                    )}
                    {selectedCarePlan.clinical_indication && (
                      <div>
                        <p className="text-sm font-medium text-green-900">Clinical Indication</p>
                        <p className="text-sm">{selectedCarePlan.clinical_indication}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {selectedCarePlan.goal_start_date && (
                        <div>
                          <p className="text-sm font-medium text-green-900">Start Date</p>
                          <p className="text-sm">
                            {new Date(selectedCarePlan.goal_start_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedCarePlan.goal_end_date && (
                        <div>
                          <p className="text-sm font-medium text-green-900">Target End Date</p>
                          <p className="text-sm">
                            {new Date(selectedCarePlan.goal_end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedCarePlan.goal_outcome && (
                      <div>
                        <p className="text-sm font-medium text-green-900">Expected Outcome</p>
                        <p className="text-sm">{selectedCarePlan.goal_outcome}</p>
                      </div>
                    )}
                    {selectedCarePlan.goal_comment && (
                      <div>
                        <p className="text-sm font-medium text-green-900">Comment</p>
                        <p className="text-sm">{selectedCarePlan.goal_comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Request Section */}
              {selectedCarePlan.service_name && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 text-purple-900">Service Request</h3>
                  <div className="space-y-2 bg-purple-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-900">Service Name</p>
                      <p className="text-sm">{selectedCarePlan.service_name}</p>
                    </div>
                    {selectedCarePlan.service_description && (
                      <div>
                        <p className="text-sm font-medium text-purple-900">Description</p>
                        <p className="text-sm">{selectedCarePlan.service_description}</p>
                      </div>
                    )}
                    {selectedCarePlan.service_clinical_indication && (
                      <div>
                        <p className="text-sm font-medium text-purple-900">Clinical Indication</p>
                        <p className="text-sm">{selectedCarePlan.service_clinical_indication}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      {selectedCarePlan.urgency && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Urgency</p>
                          <p className="text-sm">{selectedCarePlan.urgency}</p>
                        </div>
                      )}
                      {selectedCarePlan.requested_date && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Requested Date</p>
                          <p className="text-sm">
                            {new Date(selectedCarePlan.requested_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedCarePlan.request_status && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Request Status</p>
                          <p className="text-sm">{selectedCarePlan.request_status}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Medication Order Section */}
              {selectedCarePlan.medication_item && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-indigo-900">Medication Order</h3>
                  <div className="space-y-2 bg-indigo-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Medication Item</p>
                      <p className="text-sm">{selectedCarePlan.medication_item}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedCarePlan.medication_route && (
                        <div>
                          <p className="text-sm font-medium text-indigo-900">Route</p>
                          <p className="text-sm">{selectedCarePlan.medication_route}</p>
                        </div>
                      )}
                      {selectedCarePlan.clinical_indication_med && (
                        <div>
                          <p className="text-sm font-medium text-indigo-900">Clinical Indication</p>
                          <p className="text-sm">{selectedCarePlan.clinical_indication_med}</p>
                        </div>
                      )}
                    </div>
                    {selectedCarePlan.medication_directions && (
                      <div>
                        <p className="text-sm font-medium text-indigo-900">Directions</p>
                        <p className="text-sm">{selectedCarePlan.medication_directions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

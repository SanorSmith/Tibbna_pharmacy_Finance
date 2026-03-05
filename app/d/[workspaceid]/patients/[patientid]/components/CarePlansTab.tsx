"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Scissors, RefreshCw } from "lucide-react";

// Care Plans interfaces (openEHR compliant)
export interface CarePlan {
  composition_uid: string;
  recorded_time: string;
  care_plan_name: string;
  
  // Care Plan Overview Fields
  care_plan_description?: string;
  care_plan_reason?: string;
  care_plan_schedule?: string;
  care_plan_expire?: string;
  care_plan_completed?: string;
  care_plan_comment?: string;
  
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

  // Use React Query for caching
  const { data: carePlans = [], isLoading: loadingCarePlans, refetch: loadCarePlans } = useQuery({
    queryKey: ["care-plans", workspaceid, patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/care-plans`);
      if (!res.ok) {
        throw new Error("Failed to load care plans");
      }
      const data = await res.json();
      return (data.carePlans || []) as CarePlan[];
    },
  });

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
            <CardTitle className="text-xl font-semibold">Care Plans</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadCarePlans()}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Care Plan (openEHR)</DialogTitle>
            <DialogDescription>
              Create a care plan with minimal required information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Care Plan Fields - Only 7 fields from diagram */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="carePlanName" className="text-base">Care Plan Name *</Label>
                <Input
                  id="carePlanName"
                  placeholder="e.g., Diabetes Management Care Plan"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carePlanDescription" className="text-base">Description</Label>
                <Textarea
                  id="carePlanDescription"
                  rows={3}
                  placeholder="Comprehensive description of the care plan..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carePlanReason" className="text-base">Reason</Label>
                <Textarea
                  id="carePlanReason"
                  rows={3}
                  placeholder="Reason for establishing this care plan..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carePlanSchedule" className="text-base">Care Plan Schedule</Label>
                <Textarea
                  id="carePlanSchedule"
                  rows={3}
                  placeholder="e.g., Weekly check-ups, Monthly reviews..."
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carePlanExpire" className="text-base">Care Plan Expire</Label>
                  <Input
                    id="carePlanExpire"
                    type="date"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carePlanCompleted" className="text-base">Care Plan Completed</Label>
                  <Input
                    id="carePlanCompleted"
                    type="date"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="carePlanComment" className="text-base">Comment</Label>
                <Textarea
                  id="carePlanComment"
                  rows={3}
                  placeholder="Additional notes or comments..."
                  className="resize-none"
                />
              </div>
            </div>
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
                // Get only the 7 care plan fields
                const carePlanName = (document.getElementById("carePlanName") as HTMLInputElement)?.value?.trim();
                const carePlanDescription = (document.getElementById("carePlanDescription") as HTMLTextAreaElement)?.value?.trim();
                const carePlanReason = (document.getElementById("carePlanReason") as HTMLTextAreaElement)?.value?.trim();
                const carePlanSchedule = (document.getElementById("carePlanSchedule") as HTMLTextAreaElement)?.value?.trim();
                const carePlanExpire = (document.getElementById("carePlanExpire") as HTMLInputElement)?.value;
                const carePlanCompleted = (document.getElementById("carePlanCompleted") as HTMLInputElement)?.value;
                const carePlanComment = (document.getElementById("carePlanComment") as HTMLTextAreaElement)?.value?.trim();

                if (!carePlanName) {
                  alert("Please fill in the Care Plan Name (required field)");
                  return;
                }

                try {
                  setSavingCarePlan(true);

                  const res = await fetch(
                    `/api/d/${workspaceid}/patients/${patientid}/care-plans`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        carePlan: {
                          carePlanName,
                          carePlanDescription,
                          carePlanReason,
                          carePlanSchedule,
                          carePlanExpire,
                          carePlanCompleted,
                          carePlanComment,
                          status: carePlanCompleted ? "Completed" : "Active",
                        },
                      }),
                    }
                  );

                  if (res.ok) {
                    await loadCarePlans();
                    setShowCarePlanForm(false);
                    alert("Care plan created successfully in openEHR!");
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
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Care Plan Details</DialogTitle>
            <DialogDescription>
              Complete information about this care plan
            </DialogDescription>
          </DialogHeader>
          {selectedCarePlan && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="bg-blue-50 p-5 rounded-lg">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Care Plan Name</p>
                    <p className="text-base font-semibold text-blue-800">{selectedCarePlan.care_plan_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
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
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Created By</p>
                    <p className="text-sm text-blue-700">{selectedCarePlan.created_by}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Recorded Time</p>
                    <p className="text-sm text-blue-700">
                      {new Date(selectedCarePlan.recorded_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Care Plan Fields - Matching Input Form */}
              <div className="space-y-5">
                {selectedCarePlan.care_plan_description && (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">Description</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCarePlan.care_plan_description}</p>
                    </div>
                  </div>
                )}

                {selectedCarePlan.care_plan_reason && (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">Reason</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCarePlan.care_plan_reason}</p>
                    </div>
                  </div>
                )}

                {selectedCarePlan.care_plan_schedule && (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">Care Plan Schedule</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCarePlan.care_plan_schedule}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  {selectedCarePlan.care_plan_expire && (
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-gray-900">Care Plan Expire</p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {new Date(selectedCarePlan.care_plan_expire).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedCarePlan.care_plan_completed && (
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-gray-900">Care Plan Completed</p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {new Date(selectedCarePlan.care_plan_completed).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCarePlan.care_plan_comment && (
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">Comment</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCarePlan.care_plan_comment}</p>
                    </div>
                  </div>
                )}
              </div>

             
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

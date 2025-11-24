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

// Care Plans interfaces (openEHR compliant)
export interface CarePlan {
  composition_uid: string;
  recorded_time: string;
  care_plan_name: string;
  description?: string;
  reason?: string;
  care_plan_schedule?: string;
  care_plan_expire?: string;
  care_plan_completed?: string;
  comment?: string;
  created_by: string;
  status: string;
}

interface CarePlansTabProps {
  workspaceid: string;
  patientid: string;
  fullName: string;
}

export function CarePlansTab({ workspaceid, patientid, fullName }: CarePlansTabProps) {
  const [showCarePlanForm, setShowCarePlanForm] = useState(false);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loadingCarePlans, setLoadingCarePlans] = useState(false);

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
      }
    } catch (e) {
      console.error("Failed to load care plans:", e);
    } finally {
      setLoadingCarePlans(false);
    }
  }, [workspaceid, patientid]);

  // Load care plans when component mounts
  useEffect(() => {
    loadCarePlans();
  }, [loadCarePlans]);

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Care Plans</CardTitle>
            <Button size="sm" onClick={() => setShowCarePlanForm(true)}>
              + New Care Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCarePlans ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading care plans...
            </div>
          ) : carePlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No care plans found. Click &quot;+ New Care Plan&quot; to
              create one.
            </div>
          ) : (
            <div className="space-y-4">
              {carePlans.map((plan) => (
                <div
                  key={plan.composition_uid}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">
                        {plan.care_plan_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Created:{" "}
                        {new Date(plan.recorded_time).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === "active"
                          ? "bg-green-100 text-green-800"
                          : plan.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : plan.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {plan.status.charAt(0).toUpperCase() +
                        plan.status.slice(1)}
                    </span>
                  </div>

                  {plan.reason && (
                    <div className="mb-3 p-2 bg-amber-50 rounded text-sm">
                      <p className="font-medium text-amber-900 text-xs mb-1">
                        Reason
                      </p>
                      <p>{plan.reason}</p>
                    </div>
                  )}

                  {plan.description && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-900 text-xs mb-1">
                        Description
                      </p>
                      <p>{plan.description}</p>
                    </div>
                  )}

                  {plan.care_plan_schedule && (
                    <div className="mb-3 p-2 bg-purple-50 rounded text-sm">
                      <p className="font-medium text-purple-900 text-xs mb-1">
                        Schedule
                      </p>
                      <p>{plan.care_plan_schedule}</p>
                    </div>
                  )}

                  {plan.comment && (
                    <div className="mb-3 p-2 bg-green-50 rounded text-sm">
                      <p className="font-medium text-green-900 text-xs mb-1">
                        Comment
                      </p>
                      <p>{plan.comment}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
                    <div>
                      <span className="font-medium">Created by:</span>{" "}
                      {plan.created_by}
                    </div>
                    {plan.care_plan_expire && (
                      <div>
                        <span className="font-medium">Expires:</span>{" "}
                        {new Date(
                          plan.care_plan_expire
                        ).toLocaleDateString()}
                      </div>
                    )}
                    {plan.care_plan_completed && (
                      <div className="col-span-2">
                        <span className="font-medium">Completed:</span>{" "}
                        {new Date(
                          plan.care_plan_completed
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Plan Form Dialog */}
      <Dialog open={showCarePlanForm} onOpenChange={setShowCarePlanForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Care Plan</DialogTitle>
            <DialogDescription>
              Create a new care plan for {fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Care Plan Name */}
            <div>
              <label className="text-sm font-medium">Care Plan Name *</label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Cardiovascular Risk Management"
                id="carePlanName"
                aria-label="Care plan name"
                title="Enter the care plan name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Comprehensive description of the care plan..."
                id="carePlanDescription"
                aria-label="Care plan description"
                title="Enter a comprehensive description of the care plan"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium">Reason</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Reason for this care plan..."
                id="carePlanReason"
                aria-label="Reason for care plan"
                title="Enter the reason for this care plan"
              />
            </div>

            {/* Care Plan Schedule */}
            <div>
              <label className="text-sm font-medium">Care Plan Schedule</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Schedule and frequency of interventions..."
                id="carePlanSchedule"
                aria-label="Care plan schedule"
                title="Enter the schedule and frequency of interventions"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Expire Date</label>
                <input
                  type="date"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="carePlanExpire"
                  aria-label="Care plan expiration date"
                  title="Select the expiration date for this care plan"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="carePlanStatus"
                  defaultValue="active"
                  aria-label="Care plan status"
                  title="Select the status of this care plan"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional comments..."
                id="carePlanComment"
                aria-label="Additional comments"
                title="Enter any additional comments for the care plan"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCarePlanForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const carePlanName = (
                    document.getElementById("carePlanName") as HTMLInputElement
                  )?.value;

                  if (!carePlanName) {
                    alert("Please fill in the care plan name");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patientid}/care-plans`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          carePlan: {
                            carePlanName,
                            description: (
                              document.getElementById(
                                "carePlanDescription"
                              ) as HTMLTextAreaElement
                            )?.value,
                            reason: (
                              document.getElementById(
                                "carePlanReason"
                              ) as HTMLTextAreaElement
                            )?.value,
                            carePlanSchedule: (
                              document.getElementById(
                                "carePlanSchedule"
                              ) as HTMLTextAreaElement
                            )?.value,
                            carePlanExpire: (
                              document.getElementById(
                                "carePlanExpire"
                              ) as HTMLInputElement
                            )?.value
                              ? new Date(
                                  (
                                    document.getElementById(
                                      "carePlanExpire"
                                    ) as HTMLInputElement
                                  ).value
                                ).toISOString()
                              : undefined,
                            comment: (
                              document.getElementById(
                                "carePlanComment"
                              ) as HTMLTextAreaElement
                            )?.value,
                            status: (
                              document.getElementById(
                                "carePlanStatus"
                              ) as HTMLSelectElement
                            )?.value,
                          },
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadCarePlans();
                      setShowCarePlanForm(false);
                      // Clear form
                      (
                        document.getElementById(
                          "carePlanName"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "carePlanDescription"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "carePlanReason"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "carePlanSchedule"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "carePlanExpire"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "carePlanComment"
                        ) as HTMLTextAreaElement
                      ).value = "";
                    } else {
                      const error = await res.json();
                      alert(`Failed to create care plan: ${error.error}`);
                    }
                  } catch (error) {
                    console.error("Error creating care plan:", error);
                    alert("Failed to create care plan");
                  }
                }}
              >
                Create Care Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

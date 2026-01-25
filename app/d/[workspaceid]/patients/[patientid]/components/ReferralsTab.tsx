"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Referrals interfaces (openEHR compliant)
export interface ReferralRecord {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  receiving_physician?: string;
  clinical_indication: string;
  urgency: string;
  comment?: string;
  referred_by: string;
  status: string;
}

interface ReferralsTabProps {
  workspaceid: string;
  patientid: string;
}

export function ReferralsTab({ workspaceid, patientid }: ReferralsTabProps) {
  const [showReferralForm, setShowReferralForm] = useState(false);
  // const [departments, setDepartments] = useState<{ departmentid: string; name: string }[]>([]);
  // const [doctors, setDoctors] = useState<{ staffid: string; firstname: string; lastname: string; email: string }[]>([]);
  const [referralForm, setReferralForm] = useState({
    department: "",
    receivingPhysician: "",
    clinicalIndication: "",
    urgency: "routine",
    comment: "",
  });

  // Use React Query for caching
  const { data: referrals = [], isLoading: loadingReferrals, refetch: loadReferrals } = useQuery({
    queryKey: ["referrals", workspaceid, patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/referrals`);
      if (!res.ok) {
        throw new Error("Failed to load referrals");
      }
      const data = await res.json();
      return (data.referrals || []) as ReferralRecord[];
    },
  });

  // Load departments and doctors separately (not using React Query for now to avoid complexity)
/*   const loadDepartmentsAndDoctors = async () => {
    try {
      // Load departments
      const deptRes = await fetch(`/api/d/${workspaceid}/departments`);
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }

      // Load doctors (staff with role="doctor")
      const staffRes = await fetch(`/api/d/${workspaceid}/staff`);
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const doctorsOnly = (staffData.staff || []).filter(
          (staff: { role: string }) => staff.role === "doctor"
        );
        setDoctors(doctorsOnly);
      }
    } catch (error) {
      console.error("Error loading departments and doctors:", error);
    }
  }; */

  return (
    <>
       <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Referrals</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setShowReferralForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <span className="mr-1">+</span> New Referral
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReferrals ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading referrals...
                </p>
              </div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No Referrals</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a referral to another physician or department
              </p>
              <Button
                onClick={() => setShowReferralForm(true)}
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create First Referral
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-semibold text-sm">Date</th>
                    <th className="text-left p-3 font-semibold text-sm">Department</th>
                    <th className="text-left p-3 font-semibold text-sm">Receiving Physician</th>
                    <th className="text-left p-3 font-semibold text-sm">Clinical Indication</th>
                    <th className="text-left p-3 font-semibold text-sm">Referred By</th>
                    <th className="text-left p-3 font-semibold text-sm">Urgency</th>
                    <th className="text-left p-3 font-semibold text-sm">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        {record.recorded_time
                          ? new Date(record.recorded_time).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "Date not recorded"}
                      </td>
                      <td className="p-3 text-sm font-medium">{record.physician_department}</td>
                      <td className="p-3 text-sm">{record.receiving_physician || "-"}</td>
                      <td className="p-3 text-sm">{record.clinical_indication}</td>
                      <td className="p-3 text-sm">{record.referred_by || "Unknown"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.urgency === "urgent"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {record.urgency === "urgent" ? "Urgent" : "Routine"}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{record.comment || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Form Dialog */}
      <Dialog open={showReferralForm} onOpenChange={setShowReferralForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Referral</DialogTitle>
            <DialogDescription>
              Refer patient to another physician or department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Physician/Department *</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="Enter department or physician name"
                value={referralForm.department}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    department: e.target.value,
                  })
                }
                aria-label="Department"
                title="Enter the receiving department or physician"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Receiving Physician</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="Enter receiving physician name (optional)"
                value={referralForm.receivingPhysician}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    receivingPhysician: e.target.value,
                  })
                }
                aria-label="Receiving physician"
                title="Enter the receiving physician name (optional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Clinical Indication *
              </label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Reason for referral and relevant clinical information"
                value={referralForm.clinicalIndication}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    clinicalIndication: e.target.value,
                  })
                }
                aria-label="Clinical indication"
                title="Enter the reason for referral and relevant clinical information"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Urgency *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="routine"
                    checked={referralForm.urgency === "routine"}
                    onChange={(e) =>
                      setReferralForm({
                        ...referralForm,
                        urgency: e.target.value,
                      })
                    }
                    className="w-4 h-4"
                    aria-label="Routine urgency"
                    title="Select routine urgency"
                  />
                  <span>Routine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="urgent"
                    checked={referralForm.urgency === "urgent"}
                    onChange={(e) =>
                      setReferralForm({
                        ...referralForm,
                        urgency: e.target.value,
                      })
                    }
                    className="w-4 h-4"
                    aria-label="Urgent referral"
                    title="Select urgent referral"
                  />
                  <span className="text-red-600 font-medium">Urgent</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Additional notes or instructions"
                value={referralForm.comment}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    comment: e.target.value,
                  })
                }
                aria-label="Additional comments"
                title="Enter any additional notes or instructions"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReferralForm(false);
                  setReferralForm({
                    department: "",
                    receivingPhysician: "",
                    clinicalIndication: "",
                    urgency: "routine",
                    comment: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  try {
                    if (!referralForm.department || !referralForm.clinicalIndication) {
                      alert(
                        "Please fill in required fields: Physician/Department and Clinical Indication"
                      );
                      return;
                    }

                    const response = await fetch(
                      `/api/d/${workspaceid}/patients/${patientid}/referrals`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          referral: {
                            physicianDepartment: referralForm.department,
                            receivingPhysician: referralForm.receivingPhysician,
                            clinicalIndication: referralForm.clinicalIndication,
                            urgency: referralForm.urgency,
                            comment: referralForm.comment,
                          },
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.error || "Failed to create referral"
                      );
                    }

                    setShowReferralForm(false);
                    setReferralForm({
                      department: "",
                      receivingPhysician: "",
                      clinicalIndication: "",
                      urgency: "routine",
                      comment: "",
                    });
                    loadReferrals();
                  } catch (error) {
                    console.error("Error creating referral:", error);
                    alert(
                      error instanceof Error
                        ? error.message
                        : "Failed to create referral"
                    );
                  }
                }}
              >
                Create Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

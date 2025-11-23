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

// Referrals interfaces (openEHR compliant)
export interface ReferralRecord {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  clinical_indication: string;
  urgency: string;
  comment?: string;
  referred_by: string;
  status: string;
}

interface ReferralsTabProps {
  workspaceid: string;
  patientid: string;
  fullName: string;
}

export function ReferralsTab({ workspaceid, patientid, fullName }: ReferralsTabProps) {
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [referralRecords, setReferralRecords] = useState<ReferralRecord[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralForm, setReferralForm] = useState({
    physicianDepartment: "",
    clinicalIndication: "",
    urgency: "no",
    comment: "",
  });

  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/referrals`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setReferralRecords(data.referrals || []);
      }
    } catch (e) {
      console.error("Failed to load referrals:", e);
    } finally {
      setLoadingReferrals(false);
    }
  }, [workspaceid, patientid]);

  // Load referrals when component mounts
  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

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
            <div>
              <CardTitle className="text-2xl">Referrals</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage patient referrals to specialists
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowReferralForm(true)}
              className="bg-black hover:bg-black/80 text-white"
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
          ) : referralRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🏥</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Referrals</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a referral to another physician or department
              </p>
              <Button
                onClick={() => setShowReferralForm(true)}
                variant="outline"
              >
                Create First Referral
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {referralRecords.map((record, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-teal-50/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                        <div className="font-semibold text-lg">
                          Referral to{" "}
                          {record.physician_department || "Specialist"}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {record.recorded_time
                          ? new Date(record.recorded_time).toLocaleString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Date not recorded"}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.urgency === "yes"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {record.urgency === "yes" ? "⚠️ Urgent" : "✓ Routine"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-teal-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-teal-500">🏥</span>
                        <div className="text-xs text-muted-foreground font-medium">
                          Physician/Department
                        </div>
                      </div>
                      <div className="text-base font-bold text-teal-600">
                        {record.physician_department}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-500">📋</span>
                        <div className="text-xs text-muted-foreground font-medium">
                          Clinical Indication
                        </div>
                      </div>
                      <div className="text-base font-bold text-blue-600">
                        {record.clinical_indication}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500">👨‍⚕️</span>
                        <div className="text-xs text-muted-foreground font-medium">
                          Referred By
                        </div>
                      </div>
                      <div className="text-base font-bold text-gray-600">
                        {record.referred_by || "Unknown"}
                      </div>
                    </div>
                  </div>

                  {record.comment && (
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground font-medium mb-1">
                        Additional Comments
                      </div>
                      <div className="text-gray-700 bg-white p-3 rounded-lg border">
                        {record.comment}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
              <label className="text-sm font-medium">
                Physician / Department *
              </label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="e.g., Cardiology, Dr. Smith"
                value={referralForm.physicianDepartment}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    physicianDepartment: e.target.value,
                  })
                }
                aria-label="Physician or department"
                title="Enter the physician or department name"
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
                    value="no"
                    checked={referralForm.urgency === "no"}
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
                    value="yes"
                    checked={referralForm.urgency === "yes"}
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
                    physicianDepartment: "",
                    clinicalIndication: "",
                    urgency: "no",
                    comment: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-black hover:bg-black/80 text-white"
                onClick={async () => {
                  try {
                    if (
                      !referralForm.physicianDepartment ||
                      !referralForm.clinicalIndication
                    ) {
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
                        body: JSON.stringify({ referral: referralForm }),
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
                      physicianDepartment: "",
                      clinicalIndication: "",
                      urgency: "no",
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

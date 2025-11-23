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

// Medical History interfaces (openEHR compliant)
export interface MedicalHistoryRecord {
  composition_uid: string;
  recorded_time: string;
  symptom_sign_name: string;
  body_site?: string;
  description?: string;
  occurrence?: string;
  date_time?: string;
  vaccine?: string;
  comment?: string;
  recorded_by: string;
  status: string;
  category: string;
}

interface HistoryTabProps {
  workspaceid: string;
  patientid: string;
  fullName: string;
}

export function HistoryTab({ workspaceid, patientid, fullName }: HistoryTabProps) {
  const [showMedicalHistoryForm, setShowMedicalHistoryForm] = useState(false);
  const [medicalHistoryRecords, setMedicalHistoryRecords] = useState<
    MedicalHistoryRecord[]
  >([]);
  const [loadingMedicalHistory, setLoadingMedicalHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const loadMedicalHistory = useCallback(async () => {
    try {
      setLoadingMedicalHistory(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/medical-history`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setMedicalHistoryRecords(data.medicalHistory || []);
      }
    } catch (e) {
      console.error("Failed to load medical history:", e);
    } finally {
      setLoadingMedicalHistory(false);
    }
  }, [workspaceid, patientid]);

  // Load medical history when component mounts
  useEffect(() => {
    loadMedicalHistory();
  }, [loadMedicalHistory]);

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
            <CardTitle>Medical History</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm"
                aria-label="Filter by medical history category"
                title="Filter medical history records by category"
              >
                <option value="all">All Categories</option>
                <option value="medical_condition">
                  Medical Conditions
                </option>
                <option value="surgical_history">Surgical History</option>
                <option value="allergy">Allergies</option>
                <option value="family_history">Family History</option>
                <option value="immunization">Immunizations</option>
                <option value="social_history">Social History</option>
              </select>
              <Button
                size="sm"
                onClick={() => setShowMedicalHistoryForm(true)}
              >
                + Add Record
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMedicalHistory ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading medical history...
            </div>
          ) : medicalHistoryRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No medical history records found. Click &quot;+ Add
              Record&quot; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {medicalHistoryRecords
                .filter(
                  (record) =>
                    selectedCategory === "all" ||
                    record.category === selectedCategory
                )
                .map((record) => (
                  <div
                    key={record.composition_uid}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">
                            {record.symptom_sign_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.status === "active"
                                ? "bg-green-100 text-green-800"
                                : record.status === "resolved"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {record.status.charAt(0).toUpperCase() +
                              record.status.slice(1)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {record.category
                              .replace("_", " ")
                              .split(" ")
                              .map(
                                (w) =>
                                  w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(" ")}
                          </span>
                        </div>
                        {record.body_site && (
                          <p className="text-sm text-muted-foreground mb-1">
                            <span className="font-medium">Body Site:</span>{" "}
                            {record.body_site}
                          </p>
                        )}
                        {record.date_time && (
                          <p className="text-sm text-muted-foreground mb-1">
                            <span className="font-medium">Date:</span>{" "}
                            {new Date(
                              record.date_time
                            ).toLocaleDateString()}
                            {record.occurrence && (
                              <span className="ml-2">
                                ({record.occurrence.replace("_", " ")})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {record.description && (
                      <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                        <p className="font-medium text-blue-900 text-xs mb-1">
                          Description
                        </p>
                        <p>{record.description}</p>
                      </div>
                    )}

                    {record.vaccine && (
                      <div className="mb-2 p-2 bg-green-50 rounded text-sm">
                        <p className="font-medium text-green-900 text-xs mb-1">
                          Vaccine
                        </p>
                        <p>{record.vaccine}</p>
                      </div>
                    )}

                    {record.comment && (
                      <div className="mb-2 p-2 bg-amber-50 rounded text-sm">
                        <p className="font-medium text-amber-900 text-xs mb-1">
                          Comment
                        </p>
                        <p>{record.comment}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>Recorded by: {record.recorded_by}</span>
                      <span>
                        {new Date(
                          record.recorded_time
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              {medicalHistoryRecords.filter(
                (record) =>
                  selectedCategory === "all" ||
                  record.category === selectedCategory
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No records found for this category.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical History Form Dialog */}
      <Dialog
        open={showMedicalHistoryForm}
        onOpenChange={setShowMedicalHistoryForm}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Medical History Record</DialogTitle>
            <DialogDescription>
              Add a new medical history record for {fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Category */}
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                id="category"
                defaultValue="medical_condition"
                aria-label="Medical history category"
                title="Select the category for this medical history record"
              >
                <option value="medical_condition">Medical Condition</option>
                <option value="surgical_history">Surgical History</option>
                <option value="allergy">Allergy</option>
                <option value="family_history">Family History</option>
                <option value="immunization">Immunization</option>
                <option value="social_history">Social History</option>
              </select>
            </div>

            {/* Symptom/Sign Name */}
            <div>
              <label className="text-sm font-medium">
                Symptom/Sign Name *
              </label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Type 2 Diabetes Mellitus, Appendectomy"
                id="symptomSignName"
              />
            </div>

            {/* Body Site */}
            <div>
              <label className="text-sm font-medium">Body Site</label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Pancreas, Appendix, Chest"
                id="bodySite"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Detailed description..."
                id="description"
              />
            </div>

            {/* Occurrence & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Occurrence</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="occurrence"
                  defaultValue="first_occurrence"
                  aria-label="Occurrence type"
                  title="Select when this condition occurred"
                >
                  <option value="first_occurrence">First Occurrence</option>
                  <option value="recurrence">Recurrence</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="status"
                  defaultValue="active"
                  aria-label="Status"
                  title="Select the current status of this condition"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Date/Time */}
            <div>
              <label className="text-sm font-medium">
                Date/Time of Onset
              </label>
              <input
                type="date"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                id="dateTime"
                aria-label="Date and time of onset"
                title="Select the date when this condition first appeared"
                placeholder="YYYY-MM-DD"
              />
            </div>

            {/* Vaccine (for immunizations) */}
            <div>
              <label className="text-sm font-medium">
                Vaccine (if applicable)
              </label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Influenza vaccine (Fluzone Quadrivalent)"
                id="vaccine"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional comments..."
                id="comment"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowMedicalHistoryForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const symptomSignName = (
                    document.getElementById(
                      "symptomSignName"
                    ) as HTMLInputElement
                  )?.value;
                  const category = (
                    document.getElementById("category") as HTMLSelectElement
                  )?.value;

                  if (!symptomSignName) {
                    alert("Please fill in the symptom/sign name");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patientid}/medical-history`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          medicalHistory: {
                            symptomSignName,
                            bodySite: (
                              document.getElementById(
                                "bodySite"
                              ) as HTMLInputElement
                            )?.value,
                            description: (
                              document.getElementById(
                                "description"
                              ) as HTMLTextAreaElement
                            )?.value,
                            occurrence: (
                              document.getElementById(
                                "occurrence"
                              ) as HTMLSelectElement
                            )?.value,
                            dateTime: (
                              document.getElementById(
                                "dateTime"
                              ) as HTMLInputElement
                            )?.value
                              ? new Date(
                                  (
                                    document.getElementById(
                                      "dateTime"
                                    ) as HTMLInputElement
                                  ).value
                                ).toISOString()
                              : undefined,
                            vaccine: (
                              document.getElementById(
                                "vaccine"
                              ) as HTMLInputElement
                            )?.value,
                            comment: (
                              document.getElementById(
                                "comment"
                              ) as HTMLTextAreaElement
                            )?.value,
                            status: (
                              document.getElementById(
                                "status"
                              ) as HTMLSelectElement
                            )?.value,
                            category,
                          },
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadMedicalHistory();
                      setShowMedicalHistoryForm(false);
                      // Clear form
                      (
                        document.getElementById(
                          "symptomSignName"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "bodySite"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "description"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "dateTime"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "vaccine"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "comment"
                        ) as HTMLTextAreaElement
                      ).value = "";
                    } else {
                      const error = await res.json();
                      alert(
                        `Failed to create medical history record: ${error.error}`
                      );
                    }
                  } catch (error) {
                    console.error("Error creating medical history:", error);
                    alert("Failed to create medical history record");
                  }
                }}
              >
                Add Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

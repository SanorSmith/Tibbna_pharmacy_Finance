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

// Vaccinations interfaces (openEHR compliant)
export interface VaccinationRecord {
  composition_uid: string;
  recorded_time: string;
  vaccine_name: string;
  targeted_disease: string;
  description?: string;
  total_administrations?: number;
  last_vaccine_date?: string;
  next_vaccine_due?: string;
  additional_details?: string;
  comment?: string;
}

interface VaccinationsTabProps {
  workspaceid: string;
  patientid: string;
}

export function VaccinationsTab({ workspaceid, patientid }: VaccinationsTabProps) {
  const [showVaccinationForm, setShowVaccinationForm] = useState(false);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [loadingVaccinations, setLoadingVaccinations] = useState(false);
  const [vaccinationForm, setVaccinationForm] = useState({
    vaccineName: "",
    targetedDisease: "",
    description: "",
    totalAdministrations: "",
    lastVaccineDate: "",
    nextVaccineDue: "",
    additionalDetails: "",
    comment: "",
  });

  const loadVaccinations = useCallback(async () => {
    try {
      setLoadingVaccinations(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/vaccinations`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setVaccinationRecords(data.vaccinations || []);
      }
    } catch (error) {
      console.error("Error loading vaccinations:", error);
    } finally {
      setLoadingVaccinations(false);
    }
  }, [workspaceid, patientid]);

  // Load vaccinations when component mounts
  useEffect(() => {
    loadVaccinations();
  }, [loadVaccinations]);

  return (
    <>
      <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Vaccination Records
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track immunization history
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowVaccinationForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <span className="mr-1">+</span> Record Vaccination
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVaccinations ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading vaccinations...
                </p>
              </div>
            </div>
          ) : vaccinationRecords.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">
                No Vaccination Records
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking patient immunizations
              </p>
              <Button
                onClick={() => setShowVaccinationForm(true)}
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Record First Vaccination
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {vaccinationRecords.map((record, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-indigo-50/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        <div className="font-semibold text-lg">
                          {record.vaccine_name || "Vaccination Record"}
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
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      ✓ Recorded
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {record.targeted_disease && (
                      <div className="bg-white rounded-lg p-3 border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-500">🦠</span>
                          <div className="text-xs text-muted-foreground font-medium">
                            Targeted Disease
                          </div>
                        </div>
                        <div className="text-base font-bold text-purple-600">
                          {record.targeted_disease}
                        </div>
                      </div>
                    )}
                    {record.total_administrations && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-500">💊</span>
                          <div className="text-xs text-muted-foreground font-medium">
                            Total Doses
                          </div>
                        </div>
                        <div className="text-base font-bold text-blue-600">
                          {record.total_administrations}
                        </div>
                      </div>
                    )}
                    {record.last_vaccine_date && (
                      <div className="bg-white rounded-lg p-3 border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-500">📅</span>
                          <div className="text-xs text-muted-foreground font-medium">
                            Last Vaccine
                          </div>
                        </div>
                        <div className="text-base font-bold text-green-600">
                          {new Date(
                            record.last_vaccine_date
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    )}
                    {record.next_vaccine_due && (
                      <div className="bg-white rounded-lg p-3 border border-orange-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-500">⏰</span>
                          <div className="text-xs text-muted-foreground font-medium">
                            Next Due
                          </div>
                        </div>
                        <div className="text-base font-bold text-orange-600">
                          {new Date(
                            record.next_vaccine_due
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {(record.description ||
                    record.additional_details ||
                    record.comment) && (
                    <div className="space-y-2 text-sm">
                      {record.description && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            Description
                          </div>
                          <div className="text-gray-700">
                            {record.description}
                          </div>
                        </div>
                      )}
                      {record.additional_details && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            Additional Details
                          </div>
                          <div className="text-gray-700">
                            {record.additional_details}
                          </div>
                        </div>
                      )}
                      {record.comment && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            Comment
                          </div>
                          <div className="text-gray-700">
                            {record.comment}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vaccination Form Dialog */}
      <Dialog
        open={showVaccinationForm}
        onOpenChange={setShowVaccinationForm}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Vaccination</DialogTitle>
            <DialogDescription>
              Vaccination summary following openEHR standards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Vaccine Name *
                </label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., COVID-19 mRNA Vaccine"
                  value={vaccinationForm.vaccineName}
                  onChange={(e) =>
                    setVaccinationForm({
                      ...vaccinationForm,
                      vaccineName: e.target.value,
                    })
                  }
                  aria-label="Vaccine name"
                  title="Enter the vaccine name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Targeted Disease/Agent *
                </label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., COVID-19"
                  value={vaccinationForm.targetedDisease}
                  onChange={(e) =>
                    setVaccinationForm({
                      ...vaccinationForm,
                      targetedDisease: e.target.value,
                    })
                  }
                  aria-label="Targeted disease or agent"
                  title="Enter the targeted disease or agent"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief description of the vaccine"
                value={vaccinationForm.description}
                onChange={(e) =>
                  setVaccinationForm({
                    ...vaccinationForm,
                    description: e.target.value,
                  })
                }
                aria-label="Vaccine description"
                title="Enter a brief description of the vaccine"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Total Administrations
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="e.g., 2"
                  value={vaccinationForm.totalAdministrations}
                  onChange={(e) =>
                    setVaccinationForm({
                      ...vaccinationForm,
                      totalAdministrations: e.target.value,
                    })
                  }
                  aria-label="Total administrations"
                  title="Enter the total number of administrations"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Date of Last Vaccine
                </label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={vaccinationForm.lastVaccineDate}
                  onChange={(e) =>
                    setVaccinationForm({
                      ...vaccinationForm,
                      lastVaccineDate: e.target.value,
                    })
                  }
                  aria-label="Date of last vaccine"
                  title="Select the date of the last vaccine administration"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Next Vaccine Due
                </label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={vaccinationForm.nextVaccineDue}
                  onChange={(e) =>
                    setVaccinationForm({
                      ...vaccinationForm,
                      nextVaccineDue: e.target.value,
                    })
                  }
                  aria-label="Next vaccine due date"
                  title="Select the next vaccine due date"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Additional Details
              </label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Any additional relevant information"
                value={vaccinationForm.additionalDetails}
                onChange={(e) =>
                  setVaccinationForm({
                    ...vaccinationForm,
                    additionalDetails: e.target.value,
                  })
                }
                aria-label="Additional details"
                title="Enter any additional relevant information"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Clinical notes or observations"
                value={vaccinationForm.comment}
                onChange={(e) =>
                  setVaccinationForm({
                    ...vaccinationForm,
                    comment: e.target.value,
                  })
                }
                aria-label="Clinical notes or observations"
                title="Enter clinical notes or observations"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVaccinationForm(false);
                  setVaccinationForm({
                    vaccineName: "",
                    targetedDisease: "",
                    description: "",
                    totalAdministrations: "",
                    lastVaccineDate: "",
                    nextVaccineDue: "",
                    additionalDetails: "",
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
                    if (
                      !vaccinationForm.vaccineName ||
                      !vaccinationForm.targetedDisease
                    ) {
                      alert(
                        "Please fill in required fields: Vaccine Name and Targeted Disease"
                      );
                      return;
                    }

                    const response = await fetch(
                      `/api/d/${workspaceid}/patients/${patientid}/vaccinations`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          vaccination: vaccinationForm,
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.error || "Failed to save vaccination"
                      );
                    }

                    setShowVaccinationForm(false);
                    setVaccinationForm({
                      vaccineName: "",
                      targetedDisease: "",
                      description: "",
                      totalAdministrations: "",
                      lastVaccineDate: "",
                      nextVaccineDue: "",
                      additionalDetails: "",
                      comment: "",
                    });
                    loadVaccinations();
                  } catch (error) {
                    console.error("Error saving vaccination:", error);
                    alert(
                      error instanceof Error
                        ? error.message
                        : "Failed to save vaccination"
                    );
                  }
                }}
              >
                Save Vaccination
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

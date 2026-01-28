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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [selectedVaccination, setSelectedVaccination] = useState<VaccinationRecord | null>(null);
  const [showVaccinationDetails, setShowVaccinationDetails] = useState(false);
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

  // Use React Query for caching
  const { data: vaccinations = [], isLoading: loadingVaccinations, refetch: loadVaccinations } = useQuery({
    queryKey: ["vaccinations", workspaceid, patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/vaccinations`);
      if (!res.ok) {
        throw new Error("Failed to load vaccinations");
      }
      const data = await res.json();
      return (data.vaccinations || []) as VaccinationRecord[];
    },
  });

  return (
    <>
      <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Vaccination Records
              </CardTitle>
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
          ) : vaccinations.length === 0 ? (
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaccine Name</TableHead>
                    <TableHead>Targeted Disease</TableHead>
                    <TableHead>Last Administered</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Total Doses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccinations.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {record.vaccine_name || "Vaccination Record"}
                      </TableCell>
                      <TableCell>{record.targeted_disease || "-"}</TableCell>
                      <TableCell>
                        {record.last_vaccine_date
                          ? new Date(record.last_vaccine_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.next_vaccine_due ? (
                          <span className="text-orange-600 font-medium">
                            {new Date(record.next_vaccine_due).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{record.total_administrations || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVaccination(record);
                            setShowVaccinationDetails(true);
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

      {/* Vaccination Form Dialog */}
      <Dialog
        open={showVaccinationForm}
        onOpenChange={setShowVaccinationForm}
      >
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
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

      {/* Vaccination Details Dialog */}
      <Dialog
        open={showVaccinationDetails}
        onOpenChange={setShowVaccinationDetails}
      >
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vaccination Details</DialogTitle>
            <DialogDescription>
              Complete vaccination information and history
            </DialogDescription>
          </DialogHeader>
          {selectedVaccination && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Vaccine Name
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedVaccination.vaccine_name || "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Targeted Disease
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedVaccination.targeted_disease || "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Doses
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedVaccination.total_administrations || "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Last Administered
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedVaccination.last_vaccine_date
                      ? new Date(selectedVaccination.last_vaccine_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Next Due Date
                  </label>
                  <div className="mt-1 text-md font-medium text-orange-600">
                    {selectedVaccination.next_vaccine_due
                      ? new Date(selectedVaccination.next_vaccine_due).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "Not specified"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Recorded On
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedVaccination.recorded_time
                      ? new Date(selectedVaccination.recorded_time).toLocaleString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Not specified"}
                  </div>
                </div>
              </div>

              {(selectedVaccination.description ||
                selectedVaccination.additional_details ||
                selectedVaccination.comment) && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-lg">Additional Information</h4>
                  
                  {selectedVaccination.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Description
                      </label>
                      <div className="mt-1 text-gray-700">
                        {selectedVaccination.description}
                      </div>
                    </div>
                  )}
                  
                  {selectedVaccination.additional_details && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Additional Details
                      </label>
                      <div className="mt-1 text-gray-700">
                        {selectedVaccination.additional_details}
                      </div>
                    </div>
                  )}
                  
                  {selectedVaccination.comment && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Comments
                      </label>
                      <div className="mt-1 text-gray-700">
                        {selectedVaccination.comment}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowVaccinationDetails(false)}
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

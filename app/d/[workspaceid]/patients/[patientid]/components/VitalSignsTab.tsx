"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History, Thermometer, Heart, Activity, Wind, Droplets, Clock } from "lucide-react";

interface VitalSignsRecord {
  composition_uid: string;
  recorded_time: string;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
}

interface VitalSignsForm {
  temperature?: string;
  systolic?: string;
  diastolic?: string;
  heartRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
}

interface VitalSignsTabProps {
  vitalSignsRecords: VitalSignsRecord[];
  loadingVitalSigns: boolean;
  loadingMoreVitals: boolean;
  showVitalSignsForm: boolean;
  setShowVitalSignsForm: (show: boolean) => void;
  loadVitalSigns: (reset?: boolean) => void;
  vitalsHasMore: boolean;
  vitalSignsForm: VitalSignsForm;
  setVitalSignsForm: (form: VitalSignsForm) => void;
  workspaceid: string;
  patient: {
    patientid: string;
  };
}

export function VitalSignsTab({
  vitalSignsRecords,
  loadingVitalSigns,
  loadingMoreVitals,
  showVitalSignsForm,
  setShowVitalSignsForm,
  loadVitalSigns,
  vitalsHasMore,
  vitalSignsForm,
  setVitalSignsForm,
  workspaceid,
  patient,
}: VitalSignsTabProps) {
  return (
    <div className="space-y-4">
      <Card className="">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Left Side: Title */}
            <div>
              <CardTitle className="text-2xl">
                Vital Signs Monitor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track essential health metrics
              </p>
            </div>

            {/* Right Side: Buttons */}
            <div className="flex items-center gap-3">
              {/* Record New */}
              <Button
                size="sm"
                onClick={() => setShowVitalSignsForm(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Record New
              </Button>

              {/* History Button (orange) */}
              {vitalsHasMore && (
                <Button
                  onClick={() => loadVitalSigns(false)}
                  disabled={loadingMoreVitals}
                  variant="outline"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-2"
                >
                  {loadingMoreVitals ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4" />
                      History
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVitalSigns ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading vital signs...
                </p>
              </div>
            </div>
          ) : vitalSignsRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Vital Signs Recorded
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start monitoring patient health by recording their first
                vital signs
              </p>
              <Button
                onClick={() => setShowVitalSignsForm(true)}
                variant="outline"
              >
                Record First Measurement
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {vitalSignsRecords.map((record, index) => (
                <div
                  key={index}
                  className="vital-box border rounded-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <p> Recorded on </p>
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
                  </div>

                  <div className="space-y-3 text-base">
                    {record.temperature && (
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-3">
                          <Thermometer className="w-5 h-5" />
                          <span className="text-muted-foreground">
                            Temperature
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          {record.temperature}°C
                        </span>
                      </div>
                    )}

                    {(record.systolic || record.diastolic) && (
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5" />
                          <span className="text-muted-foreground">
                            Blood Pressure
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          {record.systolic}/{record.diastolic} mmHg
                        </span>
                      </div>
                    )}

                    {record.heart_rate && (
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5" />
                          <span className="text-muted-foreground">
                            Heart Rate
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          {record.heart_rate} bpm
                        </span>
                      </div>
                    )}

                    {record.respiratory_rate && (
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-3">
                          <Wind className="w-5 h-5" />
                          <span className="text-muted-foreground">
                            Respiratory
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          {record.respiratory_rate} /min
                        </span>
                      </div>
                    )}

                    {record.spo2 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Droplets className="w-5 h-5" />
                          <span className="text-muted-foreground">
                            SpO2
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          {record.spo2}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vital Signs Form Dialog */}
      <Dialog
        open={showVitalSignsForm}
        onOpenChange={setShowVitalSignsForm}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>
              Essential vital signs following openEHR standards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Simplified Essential Vital Signs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="36.5"
                  value={vitalSignsForm.temperature}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      temperature: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="72"
                  value={vitalSignsForm.heartRate}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      heartRate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="120"
                  value={vitalSignsForm.systolic}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      systolic: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="80"
                  value={vitalSignsForm.diastolic}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      diastolic: e.target.value,
                    })
                  }
                />
              </div>
              {/* Note: Respiratory Rate and SpO2 are not supported in template_clinical_encounter_v1 */}
              {/* Uncomment these if you update your OpenEHR template to include them */}

              <div>
                <label className="text-sm font-medium">
                  Respiratory Rate (/min)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="16"
                  value={vitalSignsForm.respiratoryRate}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      respiratoryRate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">SpO2 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="98"
                  value={vitalSignsForm.spO2}
                  onChange={(e) =>
                    setVitalSignsForm({
                      ...vitalSignsForm,
                      spO2: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVitalSignsForm(false);
                  setVitalSignsForm({
                    temperature: "",
                    systolic: "",
                    diastolic: "",
                    heartRate: "",
                    respiratoryRate: "",
                    spO2: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    // Send data in the format the API expects (direct fields, not wrapped)
                    const vitalSignsData = {
                      temperature: vitalSignsForm.temperature || undefined,
                      systolic: vitalSignsForm.systolic || undefined,
                      diastolic: vitalSignsForm.diastolic || undefined,
                      heartRate: vitalSignsForm.heartRate || undefined,
                      respiratoryRate:
                        vitalSignsForm.respiratoryRate || undefined,
                      spO2: vitalSignsForm.spO2 || undefined,
                    };

                    const response = await fetch(
                      `/api/d/${workspaceid}/patients/${patient.patientid}/vital-signs`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(vitalSignsData),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.error || "Failed to save vital signs"
                      );
                    }

                    // Close form and reset
                    setShowVitalSignsForm(false);
                    setVitalSignsForm({
                      temperature: "",
                      systolic: "",
                      diastolic: "",
                      heartRate: "",
                      respiratoryRate: "",
                      spO2: "",
                    });
                    // Reload vital signs from EHRbase (reset to show only latest)
                    loadVitalSigns(true);
                  } catch (error) {
                    console.error("Error saving vital signs:", error);
                    alert(
                      error instanceof Error
                        ? error.message
                        : "Failed to save vital signs"
                    );
                  }
                }}
              >
                Save Vital Signs
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
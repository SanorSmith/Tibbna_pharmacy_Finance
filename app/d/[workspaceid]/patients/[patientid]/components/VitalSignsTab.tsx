"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface VitalSignsTabProps {
  vitalSignsRecords: VitalSignsRecord[];
  loadingVitalSigns: boolean;
  loadingMoreVitals: boolean;
  showVitalSignsForm: boolean;
  setShowVitalSignsForm: (show: boolean) => void;
  loadVitalSigns: (reset?: boolean) => void;
  vitalsHasMore: boolean;
  vitalSignsForm: {
    temperature: string;
    systolic: string;
    diastolic: string;
    heartRate: string;
    respiratoryRate: string;
    spO2: string;
  };
  setVitalSignsForm: (form: any) => void;
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Left Side: Title */}
            <div>
              <CardTitle className="text-2xl">
                Vital Signs Monitor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time patient vital signs tracking and monitoring
              </p>
            </div>

            {/* Right Side: Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowVitalSignsForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
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
            <div className="text-center py-8 text-muted-foreground">Loading vital signs...</div>
          ) : vitalSignsRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No vital signs have been recorded yet</div>
              <Button size="sm" onClick={() => setShowVitalSignsForm(true)}>
                Add First Vital Signs
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {vitalSignsRecords.map((vital) => (
                <div
                  key={vital.composition_uid}
                  className="vital-box p-4 rounded-lg"
                >
                  <div className="font-semibold text-lg mb-2">
                    Vital Signs
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                        {new Date(vital.recorded_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {vital.temperature && (
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        <div>
                          <div className="opacity-75">Temperature</div>
                          <div className="font-semibold">{vital.temperature}°F</div>
                        </div>
                      </div>
                    )}
                    {vital.heart_rate && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        <div>
                          <div className="opacity-75">Heart Rate</div>
                          <div className="font-semibold">{vital.heart_rate} bpm</div>
                        </div>
                      </div>
                    )}
                    {vital.systolic && vital.diastolic && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <div>
                          <div className="opacity-75">Blood Pressure</div>
                          <div className="font-semibold">{vital.systolic}/{vital.diastolic} mmHg</div>
                        </div>
                      </div>
                    )}
                    {vital.spo2 && (
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        <div>
                          <div className="opacity-75">SpO2</div>
                          <div className="font-semibold">{vital.spo2}%</div>
                        </div>
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
      {showVitalSignsForm && (
        <Dialog open={showVitalSignsForm} onOpenChange={setShowVitalSignsForm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Vital Signs</DialogTitle>
              <DialogDescription>
                Enter the patient's current vital signs measurements.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData(e.currentTarget);
                  const vitalData = {
                    temperature: formData.get("temperature")
                      ? parseFloat(formData.get("temperature") as string)
                      : undefined,
                    systolic: formData.get("systolic")
                      ? parseInt(formData.get("systolic") as string)
                      : undefined,
                    diastolic: formData.get("diastolic")
                      ? parseInt(formData.get("diastolic") as string)
                      : undefined,
                    heart_rate: formData.get("heart_rate")
                      ? parseInt(formData.get("heart_rate") as string)
                      : undefined,
                    respiratory_rate: formData.get("respiratory_rate")
                      ? parseInt(formData.get("respiratory_rate") as string)
                      : undefined,
                    spo2: formData.get("spo2")
                      ? parseInt(formData.get("spo2") as string)
                      : undefined,
                  };

                  const response = await fetch(
                    `/api/d/${workspaceid}/patients/${patient.patientid}/vital-signs`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(vitalData),
                    }
                  );

                  if (response.ok) {
                    setShowVitalSignsForm(false);
                    loadVitalSigns(true);
                    setVitalSignsForm({
                      temperature: "",
                      systolic: "",
                      diastolic: "",
                      heartRate: "",
                      respiratoryRate: "",
                      spO2: "",
                    });
                  } else {
                    console.error("Failed to save vital signs");
                  }
                } catch (error) {
                  console.error("Error saving vital signs:", error);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="temperature" className="text-sm font-medium">
                    Temperature (°F)
                  </label>
                  <Input
                    id="temperature"
                    name="temperature"
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={vitalSignsForm.temperature}
                    onChange={(e) =>
                      setVitalSignsForm({
                        ...vitalSignsForm,
                        temperature: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="heart_rate" className="text-sm font-medium">
                    Heart Rate (bpm)
                  </label>
                  <Input
                    id="heart_rate"
                    name="heart_rate"
                    type="number"
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
                <div className="space-y-2">
                  <label htmlFor="systolic" className="text-sm font-medium">
                    Systolic (mmHg)
                  </label>
                  <Input
                    id="systolic"
                    name="systolic"
                    type="number"
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
                <div className="space-y-2">
                  <label htmlFor="diastolic" className="text-sm font-medium">
                    Diastolic (mmHg)
                  </label>
                  <Input
                    id="diastolic"
                    name="diastolic"
                    type="number"
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
                <div className="space-y-2">
                  <label htmlFor="respiratory_rate" className="text-sm font-medium">
                    Respiratory Rate
                  </label>
                  <Input
                    id="respiratory_rate"
                    name="respiratory_rate"
                    type="number"
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
                <div className="space-y-2">
                  <label htmlFor="spo2" className="text-sm font-medium">
                    SpO2 (%)
                  </label>
                  <Input
                    id="spo2"
                    name="spo2"
                    type="number"
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
              <DialogFooter>
                <Button type="submit">Save Vital Signs</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

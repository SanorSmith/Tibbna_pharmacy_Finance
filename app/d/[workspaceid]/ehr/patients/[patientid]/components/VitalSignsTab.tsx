"use client";

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
  Plus,
  History,
  Clock,
  Thermometer,
  Heart,
  Activity,
  Wind,
  Droplets,
} from "lucide-react";

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

export interface VitalSignsForm {
  temperature: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  respiratoryRate: string;
  spO2: string;
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
    <div className="space-y-2">
      {/* Card Header */}
      <Card className="">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Vital Signs Monitor</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowVitalSignsForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Record
              </Button>
              {vitalsHasMore && (
                <Button
                  size="sm"
                  onClick={() => loadVitalSigns(false)}
                  disabled={loadingMoreVitals}
                  variant="outline"
                  className="bg-orange-500 hover:bg-orange-600 hover:text-white text-white border-none flex items-center gap-1 text-xs"
                >
                  {loadingMoreVitals ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <History className="w-3 h-3" />
                  )}
                  {loadingMoreVitals ? "Loading..." : "History"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Card Content */}
        <CardContent className="grid grid-cols-2 gap-2 py-1 ml-24">
          {loadingVitalSigns ? (
            <div className="flex justify-center py-6 text-sm text-muted-foreground col-span-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
              Loading vital signs...
            </div>
          ) : vitalSignsRecords.length === 0 ? (
            <div className="text-center py-6  text-xs col-span-4">
              <p>No Vital Signs Recorded</p>
              <Button
                onClick={() => setShowVitalSignsForm(true)}
                variant="outline"
                size="sm"
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Record First
              </Button>
            </div>
          ) : (
            vitalSignsRecords.map((record, index) => (
              <div
                key={index}
                className="border rounded-lg p-2 transition-shadow text-xs"
              >
                {/* Time */}
                <div className="flex items-center gap-1 text-card-text mb-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {record.recorded_time
                      ? new Date(record.recorded_time).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Date not recorded"}
                  </span>
                </div>

                {/* Vital Signs Grid */}
                <div className="grid grid-cols-2 gap-2 text-center text-sm text-card-text">
                  {record.temperature && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-5 h-5" />
                      <div>
                        <div className="text-muted-foreground font-semibold text-sm text-card-text">
                          Temperature
                        </div>
                        <div className="font-semibold">
                          {record.temperature}°C
                        </div>
                      </div>
                    </div>
                  )}
                  {(record.systolic || record.diastolic) && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      <div>
                        <div className="text-muted-foreground font-semibold text-sm text-card-text">
                          Blood Pressure
                        </div>
                        <div className="font-semibold">
                          {record.systolic}/{record.diastolic} mmHg
                        </div>
                      </div>
                    </div>
                  )}
                  {record.heart_rate && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      <div>
                        <div className="text-muted-foreground font-semibold text-sm text-card-text">
                          Heart Rate
                        </div>
                        <div className="font-semibold">
                          {record.heart_rate} bpm
                        </div>
                      </div>
                    </div>
                  )}
                  {record.respiratory_rate && (
                    <div className="flex items-center gap-2">
                      <Wind className="w-5 h-5" />
                      <div>
                        <div className="text-muted-foreground font-semibold text-sm text-card-text">
                          Respiratory
                        </div>
                        <div className="font-semibold">
                          {record.respiratory_rate}/min
                        </div>
                      </div>
                    </div>
                  )}
                  {record.spo2 && (
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5" />
                      <div>
                        <div className="text-muted-foreground font-semibold text-sm text-card-text">SpO2</div>
                        <div className="font-semibold">{record.spo2}%</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Compact Form Dialog */}
      <Dialog open={showVitalSignsForm} onOpenChange={setShowVitalSignsForm}>
        <DialogContent className="max-w-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Vital Signs</DialogTitle>
            <DialogDescription className="text-xs">
              Essential vital signs
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <label className="font-medium flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
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
              <label className="font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
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
              <label className="font-medium flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
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
              <label className="font-medium flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
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
            <div>
              <label className="font-medium flex items-center gap-1">
                <Wind className="w-3 h-3" />
                Respiratory Rate (/min)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
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
              <label className="font-medium flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                SpO2 (%)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="98"
                value={vitalSignsForm.spO2}
                onChange={(e) =>
                  setVitalSignsForm({ ...vitalSignsForm, spO2: e.target.value })
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
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
              className="bg-blue-200/90 hover:bg-blue-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
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

                  setShowVitalSignsForm(false);
                  setVitalSignsForm({
                    temperature: "",
                    systolic: "",
                    diastolic: "",
                    heartRate: "",
                    respiratoryRate: "",
                    spO2: "",
                  });
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
               className="bg-blue-600/90 hover:bg-blue-800"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

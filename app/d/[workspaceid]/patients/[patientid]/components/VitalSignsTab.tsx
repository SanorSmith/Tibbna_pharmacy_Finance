"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
}

export function VitalSignsTab({
  vitalSignsRecords,
  loadingVitalSigns,
  loadingMoreVitals,
  showVitalSignsForm,
  setShowVitalSignsForm,
  loadVitalSigns,
  vitalsHasMore,
}: VitalSignsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vital Signs</CardTitle>
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
                <Card key={vital.composition_uid} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Vital Signs</h3>
                        <p className="text-sm text-muted-foreground">
                          Recorded: {new Date(vital.recorded_time).toLocaleDateString()} at{" "}
                          {new Date(vital.recorded_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(vital.recorded_time).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {vital.temperature && (
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <Thermometer className="h-6 w-6 mx-auto mb-1 text-red-600" />
                          <div className="text-xs text-muted-foreground">Temperature</div>
                          <div className="font-semibold text-red-700">{vital.temperature}°F</div>
                        </div>
                      )}
                      
                      {vital.heart_rate && (
                        <div className="text-center p-3 bg-pink-50 rounded-lg border border-pink-200">
                          <Heart className="h-6 w-6 mx-auto mb-1 text-pink-600" />
                          <div className="text-xs text-muted-foreground">Heart Rate</div>
                          <div className="font-semibold text-pink-700">{vital.heart_rate} bpm</div>
                        </div>
                      )}
                      
                      {vital.systolic && vital.diastolic && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Activity className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                          <div className="text-xs text-muted-foreground">Blood Pressure</div>
                          <div className="font-semibold text-blue-700">{vital.systolic}/{vital.diastolic}</div>
                        </div>
                      )}
                      
                      {vital.respiratory_rate && (
                        <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                          <Wind className="h-6 w-6 mx-auto mb-1 text-cyan-600" />
                          <div className="text-xs text-muted-foreground">Respiratory Rate</div>
                          <div className="font-semibold text-cyan-700">{vital.respiratory_rate}</div>
                        </div>
                      )}
                      
                      {vital.spo2 && (
                        <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <Droplets className="h-6 w-6 mx-auto mb-1 text-indigo-600" />
                          <div className="text-xs text-muted-foreground">SpO2</div>
                          <div className="font-semibold text-indigo-700">{vital.spo2}%</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

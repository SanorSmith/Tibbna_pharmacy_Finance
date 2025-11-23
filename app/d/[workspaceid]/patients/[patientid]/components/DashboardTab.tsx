"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Thermometer, Heart, Activity, Wind, Droplets, Clock } from "lucide-react";

interface Appointment {
  appointmentid: string;
  starttime: string;
  endtime: string;
  location?: string;
  status: string;
  reason?: string;
}

interface DiagnosisRecord {
  composition_uid: string;
  recorded_time: string;
  problem_diagnosis: string;
  clinical_status: string;
  clinical_description?: string;
  body_site?: string;
  date_of_onset?: string;
}

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

interface VaccinationRecord {
  vaccinationid: string;
  vaccine_name: string;
  administration_date: string;
  next_due?: string;
  status: string;
}

interface ReferralRecord {
  referralid: string;
  referral_date: string;
  referred_to: string;
  reason: string;
  status: string;
}

interface DashboardTabProps {
  appointments: Appointment[];
  diagnoses: DiagnosisRecord[];
  vitalSignsRecords: VitalSignsRecord[];
  loading: boolean;
  loadingDiagnoses: boolean;
  loadingVitalSigns: boolean;
}

export function DashboardTab({
  appointments,
  diagnoses,
  vitalSignsRecords,
  loading,
  loadingDiagnoses,
  loadingVitalSigns,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Left Column */}
      <div className="space-y-6">
          {/* Appointments Section */}
          <div>
            <h2 className="text-xl font-semibold mb-3">
              Upcoming Appointments
            </h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading appointments...
              </p>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming appointments.
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.appointmentid}
                    className="text-white p-4 rounded-lg bg-blue-500"
                  >
                    <div className="font-semibold text-lg mb-1">
                      {new Date(apt.starttime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-sm opacity-90">
                      {new Date(apt.starttime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {apt.location && (
                      <div className="text-sm mt-2 opacity-90">
                        {apt.location}
                      </div>
                    )}
                    <div className="text-xs mt-2 opacity-75 capitalize">
                      {apt.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Diagnosis Section */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Latest Diagnosis</h2>
            {loadingDiagnoses ? (
              <p className="text-sm text-muted-foreground">
                Loading diagnoses...
              </p>
            ) : diagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No diagnoses recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {diagnoses.slice(0, 1).map((diagnosis, idx) => (
                  <div
                    key={diagnosis.composition_uid}
                    className="text-white p-4 rounded-lg bg-blue-500"
                  >
                    <div className="font-semibold text-lg mb-2">
                      {diagnosis.problem_diagnosis}
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full capitalize">
                          {diagnosis.clinical_status}
                        </span>
                      </div>
                      <div className="text-xs opacity-75">
                        {new Date(diagnosis.recorded_time).toLocaleDateString()}
                      </div>
                    </div>
                    {diagnosis.clinical_description && (
                      <div className="text-sm opacity-90 mb-2">
                        {diagnosis.clinical_description}
                      </div>
                    )}
                    {diagnosis.body_site && (
                      <div className="text-xs opacity-75">
                        <strong>Site:</strong> {diagnosis.body_site}
                      </div>
                    )}
                    {diagnosis.date_of_onset && (
                      <div className="text-xs opacity-75 mt-1">
                        <strong>Onset:</strong> {new Date(diagnosis.date_of_onset).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

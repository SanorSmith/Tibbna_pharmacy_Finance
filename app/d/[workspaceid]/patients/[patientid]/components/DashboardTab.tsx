"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, MapPin, User, FileText, Activity, Heart, Syringe, FileImage, Pill, Stethoscope } from "lucide-react";

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
  patient: {
    patientid: string;
    firstname: string;
    lastname: string;
    dateofbirth?: string;
    phone?: string;
    email?: string;
    address?: string;
    nationalid?: string;
  };
  workspaceid: string;
  appointments: Appointment[];
  diagnoses: DiagnosisRecord[];
  vitalSignsRecords: VitalSignsRecord[];
  vaccinationRecords: VaccinationRecord[];
  referrals: ReferralRecord[];
  loading: boolean;
  loadingDiagnoses: boolean;
  loadingVitalSigns: boolean;
  loadingVaccinations: boolean;
  loadingReferrals: boolean;
  showVitalSignsForm: boolean;
  setShowVitalSignsForm: (show: boolean) => void;
  showDiagnosisForm: boolean;
  setShowDiagnosisForm: (show: boolean) => void;
  loadDiagnoses: (reset?: boolean) => void;
  loadVitalSigns: (reset?: boolean) => void;
  diagnosesHasMore: boolean;
  loadingMoreDiagnoses: boolean;
  vitalsHasMore: boolean;
  loadingMoreVitals: boolean;
}

export function DashboardTab({
  patient,
  workspaceid,
  appointments,
  diagnoses,
  vitalSignsRecords,
  vaccinationRecords,
  referrals,
  loading,
  loadingDiagnoses,
  loadingVitalSigns,
  loadingVaccinations,
  loadingReferrals,
  showVitalSignsForm,
  setShowVitalSignsForm,
  showDiagnosisForm,
  setShowDiagnosisForm,
  loadDiagnoses,
  loadVitalSigns,
  diagnosesHasMore,
  loadingMoreDiagnoses,
  vitalsHasMore,
  loadingMoreVitals,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Latest Diagnosis</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnosisForm(true)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Diagnosis
              </Button>
            </div>
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

          {/* Vital Signs Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Latest Vital Signs</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVitalSignsForm(true)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Record New
              </Button>
            </div>
            {loadingVitalSigns ? (
              <p className="text-sm text-muted-foreground">
                Loading vital signs...
              </p>
            ) : vitalSignsRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No vital signs recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {vitalSignsRecords.slice(0, 1).map((vital) => (
                  <div
                    key={vital.composition_uid}
                    className="text-white p-4 rounded-lg bg-green-500"
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
                        <div>
                          <div className="opacity-75">Temperature</div>
                          <div className="font-semibold">{vital.temperature}°F</div>
                        </div>
                      )}
                      {vital.heart_rate && (
                        <div>
                          <div className="opacity-75">Heart Rate</div>
                          <div className="font-semibold">{vital.heart_rate} bpm</div>
                        </div>
                      )}
                      {vital.systolic && vital.diastolic && (
                        <div>
                          <div className="opacity-75">Blood Pressure</div>
                          <div className="font-semibold">{vital.systolic}/{vital.diastolic} mmHg</div>
                        </div>
                      )}
                      {vital.spo2 && (
                        <div>
                          <div className="opacity-75">SpO2</div>
                          <div className="font-semibold">{vital.spo2}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Patient Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">
                  {patient.firstname} {patient.lastname}
                </div>
                {patient.dateofbirth && (
                  <div className="text-sm text-muted-foreground">
                    DOB: {new Date(patient.dateofbirth).toLocaleDateString()}
                  </div>
                )}
              </div>
              {patient.phone && (
                <div className="text-sm">
                  <strong>Phone:</strong> {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="text-sm">
                  <strong>Email:</strong> {patient.email}
                </div>
              )}
              {patient.address && (
                <div className="text-sm">
                  <strong>Address:</strong> {patient.address}
                </div>
              )}
              {patient.nationalid && (
                <div className="text-sm">
                  <strong>National ID:</strong> {patient.nationalid}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Vaccinations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Recent Vaccinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVaccinations ? (
                <p className="text-sm text-muted-foreground">
                  Loading vaccinations...
                </p>
              ) : vaccinationRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vaccination records.
                </p>
              ) : (
                <div className="space-y-3">
                  {vaccinationRecords.slice(0, 3).map((vaccination) => (
                    <div key={vaccination.vaccinationid} className="border-l-4 border-blue-500 pl-3">
                      <div className="font-medium">{vaccination.vaccine_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(vaccination.administration_date).toLocaleDateString()}
                      </div>
                      {vaccination.next_due && (
                        <div className="text-xs text-muted-foreground">
                          Next due: {new Date(vaccination.next_due).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Referrals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingReferrals ? (
                <p className="text-sm text-muted-foreground">
                  Loading referrals...
                </p>
              ) : referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No referral records.
                </p>
              ) : (
                <div className="space-y-3">
                  {referrals.slice(0, 3).map((referral) => (
                    <div key={referral.referralid} className="border-l-4 border-orange-500 pl-3">
                      <div className="font-medium">{referral.referred_to}</div>
                      <div className="text-sm text-muted-foreground">{referral.reason}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(referral.referral_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Heart,
  TestTube,
  FileText,
  Image as ImageIcon,
  Activity,
  Thermometer,
  Droplet,
  Gauge,
} from "lucide-react";
import { DiagnosisRecord } from "./DiagnosticsTab";

export type { DiagnosisRecord };

export interface Appointment {
  appointmentid: string;
  starttime: string;
  endtime: string;
  location?: string | null;
  status: string;
  reason?: string;
}

export interface LabRecord {
  labid: string;
  test_name: string;
  test_date: string;
  result?: string;
  resultItems?: Array<{text: string, isAbnormal: boolean}>;
  status: string;
  normal_range?: string;
  isOrder?: boolean;
}

export interface ImagingRecord {
  imagingid: string;
  study_type: string;
  study_date: string;
  result?: string;
  status: string;
  radiologist?: string;
  findings?: string;
}

export interface CarePlanRecord {
  planid: string;
  plan_name: string;
  created_date: string;
  description?: string;
  status: string;
}

export interface MedicationRecord {
  medicationid: string;
  medication_name: string;
  dosage: string;
  frequency?: string;
  start_date: string;
  end_date?: string;
  status: string;
  prescribed_by?: string;
}

export interface VaccinationRecord {
  vaccinationid: string;
  vaccine_name: string;
  administration_date: string;
  status: string;
}

export interface ReferralRecord {
  referralid: string;
  referral_date: string;
  referred_to: string;
  reason: string;
  status: string;
}

export interface VitalSignsRecord {
  composition_uid: string;
  recorded_time: string;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
}

interface DashboardTabProps {
  workspaceid: string;
  patientid: string;
  appointments: Appointment[];
  vitalSigns: VitalSignsRecord[];
  diagnoses: DiagnosisRecord[];
  labs: LabRecord[];
  imaging: ImagingRecord[];
  carePlans: CarePlanRecord[];
  loadingVitalSigns: boolean;
  loadingDiagnoses: boolean;
  loadingImaging: boolean;
  loadingCarePlans: boolean;
  loadingLabs: boolean;
}

export function DashboardTab({
  appointments = [],
  diagnoses = [],
  labs = [],
  imaging = [],
  carePlans = [],
  vitalSigns = [],
  loadingVitalSigns = false,
  loadingDiagnoses = false,
  loadingImaging = false,
  loadingCarePlans = false,
  loadingLabs = false,
}: DashboardTabProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <div className="grid gap-2 md:grid-cols-3">
           {/* Vitals Card */}
          <Card className="col-span-1 bg-card-bg hover:bg-card-hover text-card-text rounded-lg relative h-full">
            {/* Date on top-right */}
            {vitalSigns.length > 0 && (
              <span className="absolute top-2 right-3 text-[9px] opacity-80">
                {new Date(
                  vitalSigns[0].recorded_time
                ).toLocaleDateString()}
              </span>
            )}

            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Vitals
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingVitalSigns ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : vitalSigns.length === 0 ? (
                <div className="text-center py-1">
                  <Heart className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No vitals</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* Blood Pressure */}
                  {vitalSigns[0].systolic &&
                    vitalSigns[0].diastolic && (
                      <div className="flex items-start gap-1.5">
                        <Gauge className="h-3 w-3 opacity-90" />
                        <div>
                          <p className="text-sm opacity-90">Blood Pressure</p>
                          <p className="font-semibold text-sm">
                            {vitalSigns[0].systolic}/{vitalSigns[0].diastolic}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Heart Rate */}
                  {vitalSigns[0].heart_rate && (
                    <div className="flex items-start gap-1.5">
                      <Activity className="h-3 w-3 mt-[2px] opacity-90" />
                      <div>
                        <p className="text-sm opacity-90">Heart Rate</p>
                        <p className="font-semibold text-sm mt-0.5">
                          {vitalSigns[0].heart_rate}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Temperature */}
                  {vitalSigns[0].temperature && (
                    <div className="flex items-start gap-1.5">
                      <Thermometer className="h-3 w-3 mt-[2px] opacity-90" />
                      <div>
                        <p className="text-sm opacity-90">Temperature</p>
                        <p className="font-semibold text-sm mt-0.5">
                          {vitalSigns[0].temperature}°C
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SpO2 */}
                  {vitalSigns[0].spo2 && (
                    <div className="flex items-start gap-1.5">
                      <Droplet className="h-3 w-3 mt-[2px] opacity-90" />
                      <div>
                        <p className="text-sm opacity-90">SpO2</p>
                        <p className="font-semibold text-sm mt-0.5">
                          {vitalSigns[0].spo2}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
           {/* Diagnosis Card */}
          <Card className="col-span-1 bg-card-bg hover:bg-card-hover text-card-text rounded-lg h-full">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Diagnosis
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingDiagnoses ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : diagnoses.length === 0 ? (
                <div className="text-center py-1.5">
                  <FileText className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No diagnoses</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {diagnoses.slice(0, 1).map((diagnosis) => (
                    <div key={diagnosis.composition_uid} className="py-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {diagnosis.problem_diagnosis}
                          </div>
                          <div className="text-xs opacity-90">
                            {new Date(
                              diagnosis.recorded_time
                            ).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          className={(() => {
                            const base = "px-1.5 py-0.5 rounded text-xs ml-2 shrink-0 capitalize font-medium";
                            switch (diagnosis.clinical_status?.toLowerCase()) {
                              case "active":
                                return `${base} bg-green-400 text-green-900`;
                              case "inactive":
                                return `${base} bg-gray-300 text-gray-800`;
                              case "resolved":
                                return `${base} bg-blue-400 text-blue-900`;
                              case "recurrence":
                                return `${base} bg-orange-400 text-orange-900`;
                              case "relapse":
                                return `${base} bg-red-400 text-red-900`;
                              case "remission":
                                return `${base} bg-emerald-400 text-emerald-900`;
                              default:
                                return `${base} bg-slate-300 text-slate-900`;
                            }
                          })()}
                        >
                          {diagnosis.clinical_status}
                        </div>
                      </div>
                      {diagnosis.clinical_description && (
                        <div className="text-xs opacity-90 mt-1 line-clamp-2">
                          {diagnosis.clinical_description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Appointments Card */}
          <Card className="bg-card-bg hover:bg-card-hover text-card-text rounded-lg  h-full">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Appointments
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingVitalSigns ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-1.5">
                  <Calendar className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No appointments</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {appointments.slice(0, 1).map((apt) => (
                    <div key={apt.appointmentid} className="py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {new Date(apt.starttime).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                          <div className="text-xs opacity-90">
                            {new Date(apt.starttime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                        </div>
                        <div
                          className={`px-1.5 py-0.5 rounded text-xs ml-2 shrink-0 ${
                            apt.status === "confirmed"
                              ? "bg-green-400 text-green-900"
                              : apt.status === "scheduled"
                              ? "bg-green-300 text-green-900"
                              : apt.status === "pending"
                              ? "bg-yellow-400 text-yellow-900"
                              : "bg-gray-400 text-gray-900"
                          }`}
                        >
                          {apt.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Labs Card */}
          <Card className="col-span-1 bg-card-bg hover:bg-card-hover text-card-text rounded-lg  h-full">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <TestTube className="h-3.5 w-3.5" />
                  Lab Results
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingLabs ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : labs.length === 0 ? (
                <div className="text-center py-1.5">
                  <TestTube className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No lab results</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {labs.slice(0, 2).map((lab: LabRecord) => {
                    return (
                      <div key={lab.labid} className="py-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-1">
                              {lab.test_name}
                              {lab.isOrder && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                                  Order
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-90">
                              {new Date(lab.test_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`px-1.5 py-0.5 rounded text-xs ml-2 shrink-0 ${
                            lab.isOrder 
                              ? 'bg-orange-200 text-orange-900' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {lab.status}
                          </div>
                        </div>
                        {lab.resultItems && lab.resultItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lab.resultItems.map((item, idx) => (
                              <span
                                key={idx}
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  lab.isOrder 
                                    ? 'bg-orange-50 text-orange-700'
                                    : item.isAbnormal 
                                      ? 'bg-red-100 text-red-900' 
                                      : 'bg-gray-50 text-gray-700'
                                }`}
                              >
                                {item.text}
                              </span>
                            ))}
                          </div>
                        ) : lab.result && (
                          <div className={`text-xs mt-1 ${
                            lab.isOrder ? 'text-orange-700' : 'opacity-90'
                          }`}>
                            {lab.result}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

         

          {/* Imaging Card */}
          <Card className="col-span-1 bg-card-bg hover:bg-card-hover text-card-text rounded-lg  h-full">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Imaging
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingImaging ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : imaging.length === 0 ? (
                <div className="text-center py-1.5">
                  <ImageIcon className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No imaging</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {imaging.slice(0, 1).map((img) => (
                    <div key={img.imagingid} className="py-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {img.study_type}
                          </div>
                          <div className="text-xs opacity-90">
                            {new Date(img.study_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          className={`px-1.5 py-0.5 rounded text-xs ml-2 shrink-0 ${
                            img.status === "completed"
                              ? "bg-green-400 text-green-900"
                              : img.status === "scheduled"
                              ? "bg-blue-400 text-blue-900"
                              : "bg-yellow-400 text-yellow-900"
                          }`}
                        >
                          {img.status}
                        </div>
                      </div>
                      {img.findings && (
                        <div className="text-sm opacity-90 mt-1 line-clamp-2">
                          {img.findings}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Care Plan Card */}
          <Card className="col-span-1 bg-card-bg hover:bg-card-hover text-card-text rounded-lg  h-full">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Care Plan
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-1.5 px-3">
              {loadingCarePlans ? (
                <div className="text-center py-1.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs opacity-90">Loading...</p>
                </div>
              ) : carePlans.length === 0 ? (
                <div className="text-center py-1.5">
                  <Heart className="h-5 w-5 opacity-70 mx-auto mb-1" />
                  <p className="text-sm opacity-90">No care plans</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {carePlans.slice(0, 1).map((plan) => (
                    <div key={plan.planid} className="py-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {plan.plan_name}
                          </div>
                          <div className="text-xs opacity-90">
                            {new Date(plan.created_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          className={`px-1.5 py-0.5 rounded text-xs ml-2 shrink-0 ${
                            plan.status === "active"
                              ? "bg-green-400 text-green-900"
                              : plan.status === "draft"
                              ? "bg-gray-400 text-gray-900"
                              : "bg-blue-400 text-blue-900"
                          }`}
                        >
                          {plan.status}
                        </div>
                      </div>
                      {plan.description && (
                        <div className="text-sm opacity-90 mt-1 line-clamp-2">
                          {plan.description}
                        </div>
                      )}
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

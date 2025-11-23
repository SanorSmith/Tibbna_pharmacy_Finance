"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  TestTube, 
  FileText, 
  Image as ImageIcon, 
  Heart,
  MapPin,
  Pill
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
  status: string;
  normal_range?: string;
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
  appointments: Appointment[];
  diagnoses: DiagnosisRecord[];
  labs: LabRecord[];
  imaging: ImagingRecord[];
  carePlans: CarePlanRecord[];
  medications: MedicationRecord[];
  vitalSignsRecords: VitalSignsRecord[];
  vaccinations: VaccinationRecord[];
  referrals: ReferralRecord[];
  loading: boolean;
  loadingDiagnoses: boolean;
  loadingLabs: boolean;
  loadingImaging: boolean;
  loadingCarePlans: boolean;
  loadingMedications: boolean;
  loadingVitalSigns: boolean;
  loadingVaccinations: boolean;
  loadingReferrals: boolean;
}

export function DashboardTab({
  appointments = [],
  diagnoses = [],
  labs = [],
  imaging = [],
  carePlans = [],
  medications = [],
  loading = false,
  loadingDiagnoses = false,
  loadingLabs = false,
  loadingImaging = false,
  loadingCarePlans = false,
  loadingMedications = false,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Appointments Card */}
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointments
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No appointments scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 1).map((apt) => (
                  <div key={apt.appointmentid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {new Date(apt.starttime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs opacity-90">
                          {new Date(apt.starttime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {apt.location && (
                          <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {apt.location}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        apt.status === 'confirmed' ? 'bg-green-400 text-green-900' :
                        apt.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                        'bg-gray-400 text-gray-900'
                      }`}>
                        {apt.status}
                      </div>
                    </div>
                    {apt.reason && (
                      <div className="text-xs opacity-90 mt-2">
                        {apt.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labs Card */}
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Lab Results
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingLabs ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-4">
                <TestTube className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No lab results</p>
              </div>
            ) : (
              <div className="space-y-3">
                {labs.slice(0, 1).map((lab) => (
                  <div key={lab.labid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{lab.test_name}</div>
                        <div className="text-xs opacity-90">
                          {new Date(lab.test_date).toLocaleDateString()}
                        </div>
                        {lab.normal_range && (
                          <div className="text-xs opacity-90">
                            Range: {lab.normal_range}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        lab.status === 'completed' ? 'bg-green-400 text-green-900' :
                        lab.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                        'bg-red-400 text-red-900'
                      }`}>
                        {lab.status}
                      </div>
                    </div>
                    {lab.result && (
                      <div className="text-xs font-medium mt-2">
                        Result: {lab.result}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis Card */}
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Diagnosis
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingDiagnoses ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : diagnoses.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No diagnoses recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {diagnoses.slice(0, 1).map((diagnosis) => (
                  <div key={diagnosis.composition_uid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{diagnosis.problem_diagnosis}</div>
                        <div className="text-xs opacity-90">
                          {new Date(diagnosis.recorded_time).toLocaleDateString()}
                        </div>
                        {diagnosis.body_site && (
                          <div className="text-xs opacity-90">
                            Site: {diagnosis.body_site}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        diagnosis.clinical_status === 'active' ? 'bg-red-400 text-red-900' :
                        diagnosis.clinical_status === 'resolved' ? 'bg-green-400 text-green-900' :
                        'bg-gray-400 text-gray-900'
                      }`}>
                        {diagnosis.clinical_status}
                      </div>
                    </div>
                    {diagnosis.clinical_description && (
                      <div className="text-xs opacity-90 mt-2 line-clamp-2">
                        {diagnosis.clinical_description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imaging Card */}
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Imaging
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingImaging ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : imaging.length === 0 ? (
              <div className="text-center py-4">
                <ImageIcon className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No imaging studies</p>
              </div>
            ) : (
              <div className="space-y-3">
                {imaging.slice(0, 1).map((img) => (
                  <div key={img.imagingid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{img.study_type}</div>
                        <div className="text-xs opacity-90">
                          {new Date(img.study_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        img.status === 'completed' ? 'bg-green-400 text-green-900' :
                        img.status === 'scheduled' ? 'bg-blue-400 text-blue-900' :
                        'bg-yellow-400 text-yellow-900'
                      }`}>
                        {img.status}
                      </div>
                    </div>
                    {img.findings && (
                      <div className="text-xs opacity-90 mt-2 line-clamp-2">
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
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Care Plan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingCarePlans ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : carePlans.length === 0 ? (
              <div className="text-center py-4">
                <Heart className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No care plans created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {carePlans.slice(0, 1).map((plan) => (
                  <div key={plan.planid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{plan.plan_name}</div>
                        <div className="text-xs opacity-90">
                          Created: {new Date(plan.created_date).toLocaleDateString()}
                        </div>
                        {plan.description && (
                          <div className="text-xs opacity-90 mt-2 line-clamp-2">
                            {plan.description}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        plan.status === 'active' ? 'bg-green-400 text-green-900' :
                        plan.status === 'draft' ? 'bg-gray-400 text-gray-900' :
                        'bg-blue-400 text-blue-900'
                      }`}>
                        {plan.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medications Card */}
        <Card className="col-span-1 bg-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medications
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingMedications ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm opacity-90">Loading...</p>
              </div>
            ) : medications.length === 0 ? (
              <div className="text-center py-4">
                <Pill className="h-8 w-8 opacity-70 mx-auto mb-2" />
                <p className="text-sm opacity-90">No medications prescribed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.slice(0, 1).map((med) => (
                  <div key={med.medicationid} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{med.medication_name}</div>
                        <div className="text-xs opacity-90">
                          {med.dosage} • {med.frequency}
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          Started: {new Date(med.start_date).toLocaleDateString()}
                        </div>
                        {med.end_date && (
                          <div className="text-xs opacity-90">
                            Ends: {new Date(med.end_date).toLocaleDateString()}
                          </div>
                        )}
                        {med.prescribed_by && (
                          <div className="text-xs opacity-90">
                            By: {med.prescribed_by}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        med.status === 'active' ? 'bg-green-400 text-green-900' :
                        med.status === 'completed' ? 'bg-gray-400 text-gray-900' :
                        med.status === 'paused' ? 'bg-yellow-400 text-yellow-900' :
                        'bg-red-400 text-red-900'
                      }`}>
                        {med.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

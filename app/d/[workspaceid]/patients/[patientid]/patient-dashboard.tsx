/**
 * Client Component: PatientDashboard
 * - Comprehensive patient information dashboard
 * - Shows contact info, medical history, lab results, prescriptions, appointments
 * - Based on patient page use case diagram
 */
"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePatientData } from "./hooks/usePatientData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VitalSignsTab } from "./components/VitalSignsTab";
import { DiagnosticsTab } from "./components/DiagnosticsTab";
import EnhancedOrdersTab from "./components/EnhancedOrdersTab";
import { LabsTab } from "./components/LabsTab";
import { MedsTab} from "./components/MedsTab";
import { CarePlansTab } from "./components/CarePlansTab";
import { ReferralsTab } from "./components/ReferralsTab";
import { VaccinationsTab } from "./components/VaccinationsTab";
import { NotesTab } from "./components/NotesTab";
import * as DashboardTypes from "./components/DashboardTab";
import AppointmentsTab from "./components/AppointmentsTab";
import ImagingTab from "./components/ImagingTab";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  dateofbirth?: string | null;
  gender?: string | null;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencycontact?: string | null;
  bloodgroup?: string | null;
  height?: number | null;
  weight?: number | null;
};

/* type Appointment = {
  appointmentid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: string | null;
}; */

export default function PatientDashboard({
  workspaceid,
  patient,
}: {
  workspaceid: string;
  patient: Patient;
}) {
  const queryClient = useQueryClient();

  // Use centralized data fetching hook - prefetches all tab data in parallel
  const {
    appointments,
    loadingAppointments: loading,
    vitalSigns: vitalSignsRecords,
    vitalsHasMore,
    loadingVitalSigns,
    diagnoses,
    diagnosesHasMore,
    loadingDiagnoses,
    imagingRequests,
    imagingResults,
    loadingImaging,
    carePlans: carePlansData,
    loadingCarePlans,
    prescriptions,
    loadingPrescriptions,
    labResults,
    loadingLabResults,
    labOrders,
    loadingLabOrders,
  } = usePatientData({ workspaceid, patientid: patient.patientid });

  // Transform care plans to dashboard format
  const carePlans = carePlansData.map((cp: Record<string, unknown>) => ({
    planid: cp.composition_uid,
    plan_name: cp.care_plan_name || cp.problem_diagnosis || cp.goal_name || "Care Plan",
    created_date: cp.recorded_time,
    description: cp.goal_description || cp.clinical_description,
    status: (typeof cp.status === 'string' ? cp.status.toLowerCase() : cp.status) || "active",
  }));

  // Helper function to check if a value is abnormal based on reference range
  const isAbnormal = (value: any, referenceRange: string | undefined): boolean => {
    if (!referenceRange || value === undefined || value === null) return false;
    
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return false;
    
    const range = referenceRange;
    
    if (range.includes('-')) {
      const rangePart = range.split('-')[1].trim();
      const maxStr = rangePart.split(' ')[0];
      const minStr = range.split('-')[0].trim();
      
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      
      if (!isNaN(min) && !isNaN(max)) {
        return numValue < min || numValue > max;
      }
    }
    
    return false;
  };

  // Transform lab results to dashboard format (LabRecord)
  const transformedLabResults = labResults.map((result: any) => {
    // Build individual test result items with their abnormal status
    let resultItems: Array<{text: string, isAbnormal: boolean}> = [];
    
    // If there are test_results (analytes), create individual items
    if (result.test_results && result.test_results.length > 0) {
      resultItems = result.test_results
        .slice(0, 3) // Show first 3 analytes
        .map((analyte: any) => {
          const value = analyte.result_value !== undefined && analyte.result_value !== null 
            ? analyte.result_value 
            : "N/A";
          const unit = analyte.result_unit || "";
          
          return {
            text: `${analyte.analyte_name}: ${value}${unit ? ' ' + unit : ''}`,
            isAbnormal: isAbnormal(analyte.result_value, analyte.reference_range)
          };
        });
      
      if (result.test_results.length > 3) {
        resultItems.push({ text: "...", isAbnormal: false });
      }
    } else if (result.conclusion || result.result) {
      resultItems = [{ text: result.conclusion || result.result, isAbnormal: false }];
    }
    
    return {
      labid: result.composition_uid || result.labid,
      test_name: result.test_name || "Lab Test",
      test_date: result.report_date || result.recorded_time || result.test_date,
      resultItems: resultItems, // Array of individual results with their abnormal status
      status: result.overall_test_status || result.status || "completed",
      normal_range: result.test_results?.[0]?.reference_range,
      isOrder: false, // Mark as lab result
    };
  });

  // Transform lab orders to dashboard format (LabRecord)
  const transformedLabOrders = labOrders.map((order: any) => ({
    labid: order.composition_uid,
    test_name: order.service_name || "Lab Test",
    test_date: order.requested_date || order.recorded_time,
    resultItems: [{ text: order.clinical_indication || "Lab test ordered", isAbnormal: false }],
    status: order.request_status || "REQUESTED",
    normal_range: "",
    isOrder: true, // Mark as lab order
  }));

  // Combine lab results and orders, sorted by date (newest first)
  const allLabItems = [...transformedLabResults, ...transformedLabOrders]
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());

  // const [loadingMoreDiagnoses, setLoadingMoreDiagnoses] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DashboardTypes.DiagnosisRecord | null>(null);
  const [showDiagnosisDetails, setShowDiagnosisDetails] = useState(false);

  // Vital Signs state management
 /*  interface VitalSignsRecord {
    composition_uid: string;
    recorded_time: string;
    temperature?: number;
    systolic?: number;
    diastolic?: number;
    heart_rate?: number;
    respiratory_rate?: number;
    spo2?: number;
  } */

  const [showVitalSignsForm, setShowVitalSignsForm] = useState(false);
  // const [loadingMoreVitals, setLoadingMoreVitals] = useState(false);
  const [vitalSignsForm, setVitalSignsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    spO2: "",
  });

  // Imaging state management (openEHR compliant)
 /*  interface ImagingRequest {
    composition_uid: string;
    recorded_time: string;
    request_name: string;
    description?: string;
    clinical_indication?: string;
    urgency: string;
    supporting_doc_image?: string;
    patient_requirement?: string;
    comment?: string;
    target_body_site?: string;
    structured_target_body_site?: string;
    contrast_use?: string;
    requested_by: string;
    request_status: string;
  }
 */
 /*  interface ImagingResult {
    composition_uid: string;
    recorded_time: string;
    request_uid?: string;
    examination_name: string;
    body_structure?: string;
    body_site?: string;
    structured_body_site?: string;
    imaging_findings?: string;
    additional_details?: string;
    impression?: string;
    comment?: string;
    performed_by?: string;
    reported_by?: string;
    report_date: string;
    result_status: string;
  }
 */
  const [showImagingRequestForm, setShowImagingRequestForm] = useState(false);

  // Track which tabs have been loaded for conditional rendering
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(["dashboard"])
  );

  // Handle tab changes - just track which tabs have been visited
  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  const fullName = `${patient.firstname} ${
    patient.middlename ? patient.middlename + " " : ""
  }${patient.lastname}`;

  // Calculate age from date of birth
  const age = patient.dateofbirth
    ? Math.floor(
        (new Date().getTime() - new Date(patient.dateofbirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  // Placeholder functions for pagination (will be enhanced later if needed)
  const loadVitalSigns = async () => {
    // Data is already loaded via usePatientData hook
    console.log("Vital signs already loaded from cache");
  };

  const loadDiagnoses = async () => {
    // Data is already loaded via usePatientData hook
    console.log("Diagnoses already loaded from cache");
  };

  const loadImaging = async () => {
    // Data is already loaded via usePatientData hook
    console.log("Imaging already loaded from cache");
  };

  return (
    <div className="space-y-2 pt-0">
      {/* Header row: Home icon + compact patient info */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/d/${workspaceid}/doctor`}>
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to Doctor Dashboard"
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="flex-1 flex items-center ml-4 text-sm">
          <div className="flex gap-8">
            {/* Left column: Patient name */}
            <div className="flex flex-col justify-center">
              {patient.nationalid || patient.phone || patient.email ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-semibold leading-tight truncate cursor-pointer">
                      {fullName}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {patient.nationalid && (
                        <div>
                          <span className="font-medium">National ID:</span>{" "}
                          {patient.nationalid}
                        </div>
                      )}
                      {patient.phone && (
                        <div>
                          <span className="font-medium">Phone:</span>
                          <a
                            href={`tel:${patient.phone}`}
                            className="hover:underline ml-1"
                          >
                            {patient.phone}
                          </a>
                        </div>
                      )}
                      {patient.email && (
                        <div>
                          <span className="font-medium">Email:</span>
                          <a
                            href={`mailto:${patient.email}`}
                            className="hover:underline ml-1"
                          >
                            {patient.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="font-semibold leading-tight truncate">
                  {fullName}
                </div>
              )}
            </div>

            {/* Right column: Demographics */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Age:{" "}
                <span className="font-medium text-foreground">
                  {age !== null ? `${age} years` : "N/A"}
                </span>
              </span>
              <span>
                Gender:{" "}
                <span className="font-medium text-foreground capitalize">
                  {patient.gender || "N/A"}
                </span>
              </span>
              <span>
                Blood Group:{" "}
                <span className="font-medium text-foreground">
                  {patient.bloodgroup || "N/A"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for different sections - Organized by Clinical Workflow */}
      <div>
        <Tabs
          defaultValue="dashboard"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="flex w-full overflow-x-auto space-x-1">
            <TabsTrigger
              value="dashboard"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Dashboard
            </TabsTrigger>

            <TabsTrigger
              value="vitalsigns"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Vitals
            </TabsTrigger>

            <TabsTrigger
              value="diagnostics"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Diagnoses
            </TabsTrigger>

            <TabsTrigger
              value="testorders"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Orders
            </TabsTrigger>

            <TabsTrigger
              value="lab"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Results
            </TabsTrigger>

            <TabsTrigger
              value="prescriptions"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Meds
            </TabsTrigger>

            <TabsTrigger
              value="careplans"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Care Plans
            </TabsTrigger>

            <TabsTrigger
              value="referrals"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Referrals
            </TabsTrigger>

            <TabsTrigger
              value="vaccinations"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Vaccines
            </TabsTrigger>

            <TabsTrigger
              value="notes"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Notes
            </TabsTrigger>

            <TabsTrigger
              value="appointments"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Appointments
            </TabsTrigger>

            <TabsTrigger
              value="imaging"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
            >
              Imaging
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <DashboardTypes.DashboardTab
              workspaceid={workspaceid}
              patientid={patient.patientid}
              appointments={appointments}
              vitalSigns={vitalSignsRecords}
              diagnoses={diagnoses}
              labs={allLabItems}
              imaging={[] as DashboardTypes.ImagingRecord[]} // Empty array for imaging
              carePlans={carePlans} // Now showing actual care plans from openEHR
              loadingVitalSigns={loadingVitalSigns}
              loadingDiagnoses={loadingDiagnoses}
              loadingLabs={loadingLabResults || loadingLabOrders}
              loadingImaging={loadingImaging}
              loadingCarePlans={loadingCarePlans} // Now tracking care plans loading state
            />
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <AppointmentsTab
              appointments={appointments}
              loading={loading}
              workspaceid={workspaceid}
              patientid={patient.patientid}
              onAppointmentAdded={() => console.log("Appointment added")}
            />
          </TabsContent>

          {/* Vital Signs Tab - openEHR Compliant */}
          <TabsContent value="vitalsigns" className="space-y-4">
            <VitalSignsTab
              vitalSignsRecords={vitalSignsRecords}
              loadingVitalSigns={loadingVitalSigns}
              loadingMoreVitals={false}
              showVitalSignsForm={showVitalSignsForm}
              setShowVitalSignsForm={setShowVitalSignsForm}
              loadVitalSigns={loadVitalSigns}
              vitalsHasMore={vitalsHasMore}
              vitalSignsForm={vitalSignsForm}
              setVitalSignsForm={setVitalSignsForm}
              workspaceid={workspaceid}
              patient={patient}
            />
          </TabsContent>

          {/* Vaccinations Tab - Now using VaccinationsTab component */}
          <TabsContent value="vaccinations" className="space-y-4">
            {loadedTabs.has("vaccinations") && (
              <VaccinationsTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
              />
            )}
          </TabsContent>

          {/* Referrals Tab - Now using ReferralsTab component */}
          <TabsContent value="referrals" className="space-y-4">
            {loadedTabs.has("referrals") && (
              <ReferralsTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
              />
            )}
          </TabsContent>

          {/* Diagnostics Tab - Based on openEHR Problem/Diagnosis */}
          <TabsContent value="diagnostics" className="space-y-4">
            <DiagnosticsTab
              diagnoses={diagnoses}
              loadingDiagnoses={loadingDiagnoses}
              loadingMoreDiagnoses={false}
              loadDiagnoses={loadDiagnoses}
              diagnosesHasMore={diagnosesHasMore}
              selectedDiagnosis={selectedDiagnosis}
              setSelectedDiagnosis={setSelectedDiagnosis}
              showDiagnosisDetails={showDiagnosisDetails}
              setShowDiagnosisDetails={setShowDiagnosisDetails}
              workspaceid={workspaceid}
              patientid={patient.patientid}
              patient={patient}
            />
          </TabsContent>

          {/* Lab Results Tab - Now using LabsTab component */}
          <TabsContent value="lab" className="space-y-4">
            {loadedTabs.has("lab") && (
              <LabsTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
              />
            )}
          </TabsContent>

          {/* Prescriptions Tab - Now using MedsTab component */}
          <TabsContent value="prescriptions" className="space-y-4">
            {loadedTabs.has("prescriptions") && (
              <MedsTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
                prescriptions={prescriptions}
                loadingPrescriptions={loadingPrescriptions}
                loadPrescriptions={() => queryClient.invalidateQueries({ queryKey: ["prescriptions", workspaceid, patient.patientid] })}
              />
            )}
          </TabsContent>

          {/* Vitals Card Tab - Moved from top to card */}
          <TabsContent value="vitalscard" className="space-y-4">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Latest Vital Signs</h3>
              {vitalSignsRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vital signs recorded yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {vitalSignsRecords[0].systolic &&
                    vitalSignsRecords[0].diastolic && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">
                          Blood Pressure
                        </div>
                        <div className="text-xl font-semibold text-gray-900">
                          {vitalSignsRecords[0].systolic}/
                          {vitalSignsRecords[0].diastolic}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          mmHg
                        </div>
                      </div>
                    )}
                  {vitalSignsRecords[0].heart_rate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        Heart Rate
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        {vitalSignsRecords[0].heart_rate}
                      </div>
                      <div className="text-xs text-muted-foreground">bpm</div>
                    </div>
                  )}
                  {vitalSignsRecords[0].temperature && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        Temperature
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        {vitalSignsRecords[0].temperature}
                      </div>
                      <div className="text-xs text-muted-foreground">°C</div>
                    </div>
                  )}
                  {vitalSignsRecords[0].spo2 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        SpO2
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        {vitalSignsRecords[0].spo2}
                      </div>
                      <div className="text-xs text-muted-foreground">%</div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6">
                <VitalSignsTab
                  vitalSignsRecords={vitalSignsRecords}
                  loadingVitalSigns={loadingVitalSigns}
                  loadingMoreVitals={false}
                  showVitalSignsForm={showVitalSignsForm}
                  setShowVitalSignsForm={setShowVitalSignsForm}
                  loadVitalSigns={loadVitalSigns}
                  vitalsHasMore={vitalsHasMore}
                  vitalSignsForm={vitalSignsForm}
                  setVitalSignsForm={setVitalSignsForm}
                  workspaceid={workspaceid}
                  patient={patient}
                />
              </div>
            </div>
          </TabsContent>

          {/* Test Orders Tab - Enhanced with packages and lab selection */}
          <TabsContent value="testorders" className="space-y-4">
            {loadedTabs.has("testorders") && (
              <EnhancedOrdersTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
                patientName={[patient.firstname, patient.middlename, patient.lastname].filter(Boolean).join(' ')}
                patientDob={patient.dateofbirth || undefined}
                patientGender={patient.gender || undefined}
                patientPhone={patient.phone || undefined}
                patientNationalId={patient.nationalid || undefined}
                patientAddress={patient.address || undefined}
              />
            )}
          </TabsContent>

          {/* Imaging Tab - openEHR Compliant */}
          <TabsContent value="imaging" className="space-y-4">
            <ImagingTab
              imagingRequests={imagingRequests}
              imagingResults={imagingResults}
              loadingImaging={loadingImaging}
              showImagingRequestForm={showImagingRequestForm}
              setShowImagingRequestForm={setShowImagingRequestForm}
              loadImaging={loadImaging}
              workspaceid={workspaceid}
              patient={patient}
              fullName={fullName}
            />
          </TabsContent>

          {/* Care Plans Tab - Now using CarePlansTab component */}
          <TabsContent value="careplans" className="space-y-4">
            {loadedTabs.has("careplans") && (
              <CarePlansTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
              />
            )}
          </TabsContent>

          {/* Notes Tab - Now using NotesTab component */}
          <TabsContent value="notes" className="space-y-4">
            {loadedTabs.has("notes") && (
              <NotesTab
                workspaceid={workspaceid}
                patientid={patient.patientid}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

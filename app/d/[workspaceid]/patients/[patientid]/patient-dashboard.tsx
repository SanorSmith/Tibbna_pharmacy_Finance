/**
 * Client Component: PatientDashboard
 * - Comprehensive patient information dashboard
 * - Shows contact info, medical history, lab results, prescriptions, appointments
 * - Based on patient page use case diagram
 */
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VitalSignsTab } from "./components/VitalSignsTab";
import { DiagnosticsTab } from "./components/DiagnosticsTab";
import EnhancedOrdersTab from "./components/EnhancedOrdersTab";
import { LabsTab } from "./components/LabsTab";
import { MedsTab, type PrescriptionRecord } from "./components/MedsTab";
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

type Appointment = {
  appointmentid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: string | null;
};

export default function PatientDashboard({
  workspaceid,
  patient,
}: {
  workspaceid: string;
  patient: Patient;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnoses, setDiagnoses] = useState<DashboardTypes.DiagnosisRecord[]>([]);
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(false);
  const diagnosesOffsetRef = useRef(0);
  const hasLoadedDiagnoses = useRef(false); // Track if data has been loaded
  const [diagnosesHasMore, setDiagnosesHasMore] = useState(false);
  
  // Use sessionStorage to persist cache across component remounts
  const DIAGNOSES_CACHE_KEY = `diagnoses_${patient.patientid}`;
  
  useEffect(() => {
    // Check if diagnoses are already cached in sessionStorage
    const cachedData = sessionStorage.getItem(DIAGNOSES_CACHE_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.diagnoses && parsed.diagnoses.length > 0) {
          setDiagnoses(parsed.diagnoses);
          diagnosesOffsetRef.current = parsed.diagnoses.length;
          setDiagnosesHasMore(parsed.hasMore || false);
          hasLoadedDiagnoses.current = true;
        }
      } catch (error) {
        console.error("Failed to parse cached diagnoses:", error);
      }
    }
  }, [patient.patientid, DIAGNOSES_CACHE_KEY]);
  const [loadingMoreDiagnoses, setLoadingMoreDiagnoses] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DashboardTypes.DiagnosisRecord | null>(null);
  const [showDiagnosisDetails, setShowDiagnosisDetails] = useState(false);

  // Vital Signs state management
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

  const [showVitalSignsForm, setShowVitalSignsForm] = useState(false);
  const [vitalSignsRecords, setVitalSignsRecords] = useState<
    VitalSignsRecord[]
  >([]);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const vitalsOffsetRef = useRef(0);
  const [vitalsHasMore, setVitalsHasMore] = useState(false);
  const [loadingMoreVitals, setLoadingMoreVitals] = useState(false);
  const [vitalSignsForm, setVitalSignsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    spO2: "",
  });






  // Imaging state management (openEHR compliant)
  interface ImagingRequest {
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

  interface ImagingResult {
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

  const [showImagingRequestForm, setShowImagingRequestForm] = useState(false);
  const [imagingRequests, setImagingRequests] = useState<ImagingRequest[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [loadingImaging, setLoadingImaging] = useState(false);

  // Prescriptions state (openEHR medication orders)
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Track which tabs have been loaded to avoid redundant API calls
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["dashboard"]));

  // Load prescriptions from OpenEHR-backed API
  const loadPrescriptions = useCallback(async (reset?: boolean) => {
    try {
      // If we already have data and not explicitly resetting, avoid refetching
      if (!reset && prescriptions.length > 0) {
        return;
      }

      setLoadingPrescriptions(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/prescriptions`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data.prescriptions || []);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      setPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [workspaceid, patient.patientid, prescriptions.length]);

  // Handle tab changes and lazy load data
  const handleTabChange = (tabValue: string) => {
    
    if (loadedTabs.has(tabValue)) {
      return; // Already loaded
    }

    setLoadedTabs(prev => new Set(prev).add(tabValue));

    // Load data based on tab
    switch (tabValue) {
      case "notes":
        // Notes are now handled by NotesTab component
        break;
      case "vitalsigns":
        // Already loaded on mount
        break;
      case "appointments":
        // Already loaded on mount
        break;
      case "diagnostics":
        if (!hasLoadedDiagnoses.current) {
          loadDiagnoses();
        }
        break;
      case "lab":
        // Lab results are now handled by LabsTab component
        break;
      case "imaging":
        loadImaging();
        break;
      case "testorders":
        // Test orders are now handled by OrdersTab component
        break;
      case "prescriptions":
        // Load prescriptions when prescriptions tab is first opened
        if (prescriptions.length === 0) {
          loadPrescriptions(true);
        }
        break;
      case "careplans":
        // Care plans are now handled by CarePlansTab component
        break;
      case "vaccinations":
        // Vaccinations are now handled by VaccinationsTab component
        break;
      case "referrals":
        // Referrals are now handled by ReferralsTab component
        break;
    }
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

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/appointments`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error("Failed to load appointments:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadVitalSigns = useCallback(
    async (reset = true) => {
      try {
       if (reset) {
          setLoadingVitalSigns(true);
          vitalsOffsetRef.current = 0;
        } else {
          setLoadingMoreVitals(true);
        }

        const currentOffset = vitalsOffsetRef.current;
        const limit = reset ? 1 : 3; // Load 1 initially, then 3 more on history click

        const res = await fetch(
          `/api/d/${workspaceid}/patients/${patient.patientid}/vital-signs?limit=${limit}&offset=${currentOffset}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json();
          if (reset) {
            setVitalSignsRecords(data.vitalSigns || []);
            vitalsOffsetRef.current = data.vitalSigns?.length || 0;
          } else {
            setVitalSignsRecords((prev) => [
              ...prev,
              ...(data.vitalSigns || []),
            ]);
            vitalsOffsetRef.current += data.vitalSigns?.length || 0;
          }
          setVitalsHasMore(data.hasMore || false);
        } else {
          console.error('Failed to load vital signs, status:', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
        }
      } catch (e) {
        console.error("Failed to load vital signs:", e);
      } finally {
        if (reset) {
          setLoadingVitalSigns(false);
        } else {
          setLoadingMoreVitals(false);
        }
      }
    },
    [workspaceid, patient.patientid]
  );


  const loadDiagnoses = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setLoadingDiagnoses(true);
          diagnosesOffsetRef.current = 0;
          hasLoadedDiagnoses.current = false; // Reset cache on explicit reload
          sessionStorage.removeItem(DIAGNOSES_CACHE_KEY); // Clear cached data
        } else {
          setLoadingMoreDiagnoses(true);
        }

        const currentOffset = diagnosesOffsetRef.current;
        const limit = reset ? 2 : 3; // Load 2 initially, then 3 more on history click

        const res = await fetch(
          `/api/d/${workspaceid}/patients/${patient.patientid}/diagnoses?limit=${limit}&offset=${currentOffset}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json();
         if (reset) {
            setDiagnoses(data.diagnoses || []);
            diagnosesOffsetRef.current = data.diagnoses?.length || 0;
            hasLoadedDiagnoses.current = true; // Mark as loaded
            
            // Cache the data in sessionStorage
            sessionStorage.setItem(DIAGNOSES_CACHE_KEY, JSON.stringify({
              diagnoses: data.diagnoses || [],
              hasMore: data.hasMore || false
            }));
          } else {
            setDiagnoses((prev) => [
              ...prev,
              ...(data.diagnoses || []),
            ]);
            diagnosesOffsetRef.current += data.diagnoses?.length || 0;
          }
          setDiagnosesHasMore(data.hasMore || false);
        } else {
          console.error('Failed to load diagnoses, status:', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
        }
      } catch (e) {
        console.error("Failed to load diagnoses:", e);
      } finally {
        if (reset) {
          setLoadingDiagnoses(false);
        } else {
          setLoadingMoreDiagnoses(false);
        }
      }
    },
    [workspaceid, patient.patientid, DIAGNOSES_CACHE_KEY]
  );





  const loadImaging = useCallback(async () => {
    try {
      setLoadingImaging(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/imaging`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setImagingRequests(data.requests || []);
        setImagingResults(data.results || []);
      }
    } catch (e) {
      console.error("Failed to load imaging data:", e);
    } finally {
      setLoadingImaging(false);
    }
  }, [workspaceid, patient.patientid]);




  // Load essential data on mount for dashboard view only
  useEffect(() => {
    // Only load data needed for the default "dashboard" tab
    loadAppointments();
    loadVitalSigns();
    loadImaging();
    loadDiagnoses();
  }, [
    loadAppointments,
    loadVitalSigns,
    loadImaging,
    loadDiagnoses,
  ]);

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
              {(patient.nationalid || patient.phone || patient.email) ? (
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
                          <span className="font-medium">National ID:</span> {patient.nationalid}
                        </div>
                      )}
                      {patient.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> 
                          <a href={`tel:${patient.phone}`} className="hover:underline ml-1">{patient.phone}</a>
                        </div>
                      )}
                      {patient.email && (
                        <div>
                          <span className="font-medium">Email:</span> 
                          <a href={`mailto:${patient.email}`} className="hover:underline ml-1">{patient.email}</a>
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
                Age: <span className="font-medium text-foreground">{age !== null ? `${age} years` : "N/A"}</span>
              </span>
              <span>
                Gender: <span className="font-medium text-foreground capitalize">{patient.gender || "N/A"}</span>
              </span>
              <span>
                Blood Group: <span className="font-medium text-foreground">{patient.bloodgroup || "N/A"}</span>
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
    className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
  >
    Dashboard
  </TabsTrigger>

  <TabsTrigger
    value="vitalsigns"
    className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
  >
    Vitals
  </TabsTrigger>

  <TabsTrigger
    value="diagnostics"
   className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Diagnoses
  </TabsTrigger>


  <TabsTrigger
    value="testorders"
   className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
  >
    Orders
  </TabsTrigger>

  <TabsTrigger
    value="lab"
   className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
Results
  </TabsTrigger>

  <TabsTrigger
    value="prescriptions"
   className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Meds
  </TabsTrigger>

  <TabsTrigger
    value="careplans"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Care Plans
  </TabsTrigger>

  <TabsTrigger
    value="referrals"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Referrals
  </TabsTrigger>

  <TabsTrigger
    value="vaccinations"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Vaccines
  </TabsTrigger>

  <TabsTrigger
    value="notes"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Notes
  </TabsTrigger>

  <TabsTrigger
    value="appointments"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
   >
    Appointments
  </TabsTrigger>

  <TabsTrigger
    value="imaging"
 className="rounded-md data-[state=active]:bg-card-hover data-[state=active]:text-card-text bg-card-bg text-card-smtext border-[0.5px] border-gray-400 font-bold"
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
            labs={[] as DashboardTypes.LabRecord[]} // Empty array for labs
            imaging={[] as DashboardTypes.ImagingRecord[]} // Empty array for imaging  
            carePlans={[] as DashboardTypes.CarePlanRecord[]} // Empty array for care plans
            loadingVitalSigns={loadingVitalSigns}
            loadingDiagnoses={loadingDiagnoses}
            loadingLabs={false} // No loading state for lab results
            loadingImaging={loadingImaging}
            loadingCarePlans={false} // No loading state for care plans
          />
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <AppointmentsTab
            appointments={appointments}
            loading={loading}
            workspaceid={workspaceid}
            patientid={patient.patientid}
            onAppointmentAdded={loadAppointments}
          />
        </TabsContent>

        {/* Vital Signs Tab - openEHR Compliant */}
        <TabsContent value="vitalsigns" className="space-y-4">
          <VitalSignsTab
            vitalSignsRecords={vitalSignsRecords}
            loadingVitalSigns={loadingVitalSigns}
            loadingMoreVitals={loadingMoreVitals}
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
            loadingMoreDiagnoses={loadingMoreDiagnoses}
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
              loadPrescriptions={() => loadPrescriptions(true)}
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
                      <div className="text-xs text-muted-foreground">mmHg</div>
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
                    <div className="text-xs text-muted-foreground mb-1">SpO2</div>
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
                loadingMoreVitals={loadingMoreVitals}
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

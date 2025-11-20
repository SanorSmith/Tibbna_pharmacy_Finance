/**
 * Client Component: PatientDashboard
 * - Comprehensive patient information dashboard
 * - Shows contact info, medical history, lab results, prescriptions, appointments
 * - Based on patient page use case diagram
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  bloodtype?: string | null;
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
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTest] = useState<any>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState({
    problemDiagnosis: "",
    clinicalStatus: "active",
    severity: "moderate",
    dateOfOnset: "",
    dateOfResolution: "",
    clinicalDescription: "",
    bodySite: "",
    comment: "",
  });
  
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
  const [vitalSignsRecords, setVitalSignsRecords] = useState<VitalSignsRecord[]>([]);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const [vitalSignsForm, setVitalSignsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    spO2: "",
  });

  // Vaccination state management
  interface VaccinationRecord {
    composition_uid: string;
    recorded_time: string;
    vaccine_name: string;
    targeted_disease: string;
    description?: string;
    total_administrations?: number;
    last_vaccine_date?: string;
    next_vaccine_due?: string;
    additional_details?: string;
    comment?: string;
  }
  
  const [showVaccinationForm, setShowVaccinationForm] = useState(false);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [loadingVaccinations, setLoadingVaccinations] = useState(false);
  const [vaccinationForm, setVaccinationForm] = useState({
    vaccineName: "",
    targetedDisease: "",
    description: "",
    totalAdministrations: "",
    lastVaccineDate: "",
    nextVaccineDue: "",
    additionalDetails: "",
    comment: "",
  });

  // Referral state management
  interface ReferralRecord {
    composition_uid: string;
    recorded_time: string;
    physician_department: string;
    clinical_indication: string;
    urgency: string;
    comment?: string;
    referred_by: string;
    status: string;
  }
  
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [referralRecords, setReferralRecords] = useState<ReferralRecord[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralForm, setReferralForm] = useState({
    physicianDepartment: "",
    clinicalIndication: "",
    urgency: "no",
    comment: "",
  });

  // Prescription state management (openEHR compliant)
  interface PrescriptionRecord {
    composition_uid: string;
    recorded_time: string;
    medication_item: string;
    medication_item_code?: string;
    medication_item_terminology?: string;
    order_type?: string;
    dose_amount?: string;
    dose_unit?: string;
    dose_formula?: string;
    route: string;
    route_code?: string;
    body_site?: string;
    body_site_code?: string;
    administration_method?: string;
    administration_method_code?: string;
    timing_directions: string;
    frequency?: string;
    interval?: string;
    as_required?: boolean;
    as_required_criterion?: string;
    direction_duration?: string;
    medication_safety?: string;
    maximum_dose_amount?: string;
    maximum_dose_unit?: string;
    maximum_dose_period?: string;
    additional_instruction?: string;
    patient_instruction?: string;
    clinical_indication?: string;
    clinical_indication_code?: string;
    clinical_indication_terminology?: string;
    comment?: string;
    prescribed_by: string;
    status: string;
  }
  
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionRecords, setPrescriptionRecords] = useState<PrescriptionRecord[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    // Medication Item (with terminology support)
    medicationItem: "",
    medicationItemCode: "",
    medicationItemTerminology: "SNOMED-CT", // SNOMED-CT, RxNorm, dm+d, etc.
    
    // Dose Direction
    doseAmount: "",
    doseUnit: "",
    doseFormula: "",
    
    // Route and Site
    route: "",
    routeCode: "",
    bodySite: "",
    bodySiteCode: "",
    
    // Administration
    administrationMethod: "",
    administrationMethodCode: "",
    
    // Timing
    timingDirections: "",
    frequency: "",
    interval: "",
    asRequired: false,
    asRequiredCriterion: "",
    
    // Duration
    directionDuration: "",
    
    // Clinical Indication (with ICD-10/SNOMED support)
    clinicalIndication: "",
    clinicalIndicationCode: "",
    clinicalIndicationTerminology: "ICD-10", // ICD-10 or SNOMED-CT
    
    // Medication Safety
    medicationSafety: "",
    maximumDoseAmount: "",
    maximumDoseUnit: "",
    maximumDosePeriod: "",
    
    // Additional Instructions
    additionalInstruction: "",
    patientInstruction: "",
    
    // Order Details
    orderType: "dose-based", // dose-based or product-based
    comment: "",
  });

  // Test Orders state management
  interface TestOrderRecord {
    composition_uid: string;
    recorded_time: string;
    lab_type: string;
    test_select: string;
    test_name?: string;
    test_package?: string;
    fasting_status: string;
    order_type: string;
    specimen_request?: string;
    clinical_indication?: string;
    billing_guidance?: string;
    comment?: string;
    ordered_by: string;
    status: string;
  }

  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>([]);
  const [loadingTestOrders, setLoadingTestOrders] = useState(false);
  const [testOrderForm, setTestOrderForm] = useState({
    labType: "",
    testSelect: "test_name", // test_name or test_package
    testName: "",
    testPackage: "",
    fastingStatus: "Routine",
    orderType: "Routine",
    specimenRequest: "",
    clinicalIndication: "",
    billingGuidance: "",
    comment: "",
  });

  // Lab Results state management (openEHR compliant)
  interface LabTestAnalyte {
    analyte_name: string;
    analyte_code?: string;
    result_value: string | number;
    result_unit?: string;
    reference_range?: string;
    result_status: string;
    result_flag?: string;
  }

  interface LabTestResult {
    composition_uid: string;
    recorded_time: string;
    test_name: string;
    test_name_code?: string;
    protocol: string;
    specimen_type?: string;
    specimen_collection_time?: string;
    specimen_received_time?: string;
    specimen_id?: string;
    overall_test_status: string;
    clinical_information_provided?: string;
    test_results: LabTestAnalyte[];
    conclusion?: string;
    test_diagnosis?: string;
    laboratory_name: string;
    reported_by?: string;
    verified_by?: string;
    report_date: string;
  }

  const [labResultRecords, setLabResultRecords] = useState<LabTestResult[]>([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);

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

  // Medical History state management (openEHR compliant)
  interface MedicalHistoryRecord {
    composition_uid: string;
    recorded_time: string;
    symptom_sign_name: string;
    body_site?: string;
    description?: string;
    occurrence?: string;
    date_time?: string;
    vaccine?: string;
    comment?: string;
    recorded_by: string;
    status: string;
    category: string;
  }

  const [showMedicalHistoryForm, setShowMedicalHistoryForm] = useState(false);
  const [medicalHistoryRecords, setMedicalHistoryRecords] = useState<MedicalHistoryRecord[]>([]);
  const [loadingMedicalHistory, setLoadingMedicalHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Care Plans state management (openEHR compliant)
  interface CarePlan {
    composition_uid: string;
    recorded_time: string;
    care_plan_name: string;
    description?: string;
    reason?: string;
    care_plan_schedule?: string;
    care_plan_expire?: string;
    care_plan_completed?: string;
    comment?: string;
    created_by: string;
    status: string;
  }

  const [showCarePlanForm, setShowCarePlanForm] = useState(false);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loadingCarePlans, setLoadingCarePlans] = useState(false);

  // Clinical Notes state
  interface ClinicalNote {
    composition_uid: string;
    recorded_time: string;
    note_type: string;
    note_title?: string;
    synopsis: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    clinical_context?: string;
    comment?: string;
    author: string;
    author_role: string;
    status: string;
  }

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fullName = `${patient.firstname} ${patient.middlename ? patient.middlename + " " : ""}${patient.lastname}`;
  
  // Calculate age from date of birth
  const age = patient.dateofbirth
    ? Math.floor((new Date().getTime() - new Date(patient.dateofbirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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

  const loadVitalSigns = useCallback(async () => {
    try {
      setLoadingVitalSigns(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/vital-signs`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setVitalSignsRecords(data.vitalSigns || []);
      }
    } catch (e) {
      console.error("Failed to load vital signs:", e);
    } finally {
      setLoadingVitalSigns(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadVaccinations = useCallback(async () => {
    try {
      setLoadingVaccinations(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/vaccinations`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setVaccinationRecords(data.vaccinations || []);
      }
    } catch (e) {
      console.error("Failed to load vaccinations:", e);
    } finally {
      setLoadingVaccinations(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadReferrals = useCallback(async () => {
    try {
      setLoadingReferrals(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/referrals`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setReferralRecords(data.referrals || []);
      }
    } catch (e) {
      console.error("Failed to load referrals:", e);
    } finally {
      setLoadingReferrals(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoadingPrescriptions(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/prescriptions`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setPrescriptionRecords(data.prescriptions || []);
      }
    } catch (e) {
      console.error("Failed to load prescriptions:", e);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadTestOrders = useCallback(async () => {
    try {
      setLoadingTestOrders(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/test-orders`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setTestOrderRecords(data.testOrders || []);
      }
    } catch (e) {
      console.error("Failed to load test orders:", e);
    } finally {
      setLoadingTestOrders(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadLabResults = useCallback(async () => {
    try {
      setLoadingLabResults(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/lab-results`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setLabResultRecords(data.labResults || []);
      }
    } catch (e) {
      console.error("Failed to load lab results:", e);
    } finally {
      setLoadingLabResults(false);
    }
  }, [workspaceid, patient.patientid]);

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

  const loadMedicalHistory = useCallback(async () => {
    try {
      setLoadingMedicalHistory(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/medical-history`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setMedicalHistoryRecords(data.medicalHistory || []);
      }
    } catch (e) {
      console.error("Failed to load medical history:", e);
    } finally {
      setLoadingMedicalHistory(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadCarePlans = useCallback(async () => {
    try {
      setLoadingCarePlans(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/care-plans`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setCarePlans(data.carePlans || []);
      }
    } catch (e) {
      console.error("Failed to load care plans:", e);
    } finally {
      setLoadingCarePlans(false);
    }
  }, [workspaceid, patient.patientid]);

  const loadClinicalNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patient.patientid}/notes`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setClinicalNotes(data.notes || []);
      }
    } catch (e) {
      console.error("Failed to load clinical notes:", e);
    } finally {
      setLoadingNotes(false);
    }
  }, [workspaceid, patient.patientid]);

  useEffect(() => {
    loadAppointments();
    loadVitalSigns();
    loadVaccinations();
    loadReferrals();
    loadPrescriptions();
    loadTestOrders();
    loadLabResults();
    loadImaging();
    loadMedicalHistory();
    loadCarePlans();
    loadClinicalNotes();
  }, [loadAppointments, loadVitalSigns, loadVaccinations, loadReferrals, loadPrescriptions, loadTestOrders, loadLabResults, loadImaging, loadMedicalHistory, loadCarePlans, loadClinicalNotes]);


  function formatDateTime(date: string) {
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {age !== null ? `${age} years` : "Age N/A"}
            {" || "}
            {patient.gender || "Gender N/A"}
            {" || "}
            {patient.bloodtype ? `Blood ${patient.bloodtype}` : "Blood group N/A"}
          </p>
          {patient.nationalid && (
            <p className="text-xs text-muted-foreground">National ID: {patient.nationalid}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/d/${workspaceid}/patients/${patient.patientid}/overview`}>
            <Button variant="default">
              Patient Overview
            </Button>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
        </div>
      </div>

      {/* Tabs for different sections - Organized by Clinical Workflow */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex w-full overflow-x-auto space-x-1">
          {/* Clinical Documentation & Encounters */}
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="vitalsigns">Vitals</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          
          {/* Problems & History */}
          <TabsTrigger value="medical">History</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnoses</TabsTrigger>
          
          {/* Diagnostics */}
          <TabsTrigger value="lab">Labs</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="testorders">Orders</TabsTrigger>
          
          {/* Treatment & Care Plans */}
          <TabsTrigger value="prescriptions">Meds</TabsTrigger>
          <TabsTrigger value="careplans">Care Plans</TabsTrigger>
          
          {/* Prevention & Coordination */}
          <TabsTrigger value="vaccinations">Vaccines</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - compact 3-column summary */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Compact Patient Contact Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {patient.phone && (
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <a href={`tel:${patient.phone}`} className="hover:underline">
                        📞 {patient.phone}
                      </a>
                    </div>
                  )}
                  {patient.email && (
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <a href={`mailto:${patient.email}`} className="hover:underline">
                        ✉️ {patient.email}
                      </a>
                    </div>
                  )}
                  {patient.address && (
                    <div>
                      <div className="text-xs text-muted-foreground">Address</div>
                      <div className="font-medium">{patient.address}</div>
                    </div>
                  )}
                  {!patient.phone && !patient.email && !patient.address && (
                    <p className="text-sm text-muted-foreground">No contact details recorded.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Compact Vital Signs Summary */}
            <Card className="vital-box">
              <CardHeader>
                <CardTitle>Key Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                {vitalSignsRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No vital signs recorded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Blood Pressure</div>
                      <div className="font-medium">
                        {vitalSignsRecords[0].systolic}/{vitalSignsRecords[0].diastolic} mmHg
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Heart Rate</div>
                      <div className="font-medium">
                        {vitalSignsRecords[0].heart_rate ?? "--"} bpm
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Temperature</div>
                      <div className="font-medium">
                        {vitalSignsRecords[0].temperature ?? "--"}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">SpO2</div>
                      <div className="font-medium">
                        {vitalSignsRecords[0].spo2 ?? "--"}%
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compact Vaccination Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Vaccination Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {vaccinationRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vaccination records yet.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {vaccinationRecords[0].vaccine_name || "Latest vaccination"}
                    </div>
                    {vaccinationRecords[0].targeted_disease && (
                      <div className="text-muted-foreground">
                        Target: {vaccinationRecords[0].targeted_disease}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Last: {vaccinationRecords[0].last_vaccine_date
                        ? new Date(vaccinationRecords[0].last_vaccine_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Next due: {vaccinationRecords[0].next_vaccine_due
                        ? new Date(vaccinationRecords[0].next_vaccine_due).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Clinical Summary - Alerts & Key Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📋</span> Clinical Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Active Diagnoses */}
                <div className="border rounded-lg p-3 bg-red-50">
                  <div className="text-xs font-semibold text-red-900 mb-2">ACTIVE DIAGNOSES</div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">• Hyperlipidemia</div>
                    <div className="text-sm font-medium">• Prediabetes</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    See Diagnoses tab for details
                  </div>
                </div>

                {/* Current Medications */}
                <div className="border rounded-lg p-3 bg-blue-50">
                  <div className="text-xs font-semibold text-blue-900 mb-2">CURRENT MEDICATIONS</div>
                  <div className="space-y-1">
                    {prescriptionRecords.length > 0 ? (
                      prescriptionRecords.slice(0, 2).map((rx, idx) => (
                        <div key={idx} className="text-sm font-medium">
                          • {rx.medication_item}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No active medications</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    See Meds tab for full list
                  </div>
                </div>

                {/* Allergies & Alerts */}
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <div className="text-xs font-semibold text-yellow-900 mb-2">⚠️ ALLERGIES & ALERTS</div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-yellow-900">• No known drug allergies</div>
                    <div className="text-sm text-muted-foreground">• Family Hx: CAD</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    See History tab for details
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-semibold text-gray-700 mb-2">RECENT ACTIVITY</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {clinicalNotes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <div>
                        <span className="font-medium">Last Visit:</span>{" "}
                        {new Date(clinicalNotes[0].recorded_time).toLocaleDateString()}
                        {clinicalNotes[0].note_title && ` - ${clinicalNotes[0].note_title}`}
                      </div>
                    </div>
                  )}
                  {vitalSignsRecords.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600">📊</span>
                      <div>
                        <span className="font-medium">Last Vitals:</span>{" "}
                        BP {vitalSignsRecords[0].systolic}/{vitalSignsRecords[0].diastolic} • 
                        {" "}
                        HR {vitalSignsRecords[0].heart_rate} bpm
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading appointments...</p>
              ) : appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments found</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div key={appt.appointmentid} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">
                            {formatDateTime(appt.starttime)} - {formatDateTime(appt.endtime)}
                          </div>
                          {appt.unit && (
                            <div className="text-sm text-muted-foreground">Unit: {appt.unit}</div>
                          )}
                          {appt.location && (
                            <div className="text-sm text-muted-foreground">Location: {appt.location}</div>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            appt.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : appt.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vital Signs Tab - openEHR Compliant */}
        <TabsContent value="vitalsigns" className="space-y-4">
          <Card className="vital-box">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Vital Signs Monitor</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Track essential health metrics</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowVitalSignsForm(true)}
                  className="bg-black hover:bg-black/80 text-white"
                >
                  <span className="mr-1">+</span> Record New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVitalSigns ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading vital signs...</p>
                  </div>
                </div>
              ) : vitalSignsRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Vital Signs Recorded</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start monitoring patient health by recording their first vital signs</p>
                  <Button onClick={() => setShowVitalSignsForm(true)} variant="outline">
                    Record First Measurement
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {vitalSignsRecords.map((record, index) => (
                    <div key={index} className="vital-box border rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <div className="font-semibold text-lg">Vital Signs Record</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {record.recorded_time ? new Date(record.recorded_time).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Date not recorded'}
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          ✓ Recorded
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {record.temperature && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">🌡️</span>
                              <div className="text-xs text-muted-foreground font-medium">Temperature</div>
                            </div>
                            <div className="text-xl font-bold text-blue-700">{record.temperature}°C</div>
                          </div>
                        )}
                        {(record.systolic || record.diastolic) && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">💉</span>
                              <div className="text-xs text-muted-foreground font-medium">Blood Pressure</div>
                            </div>
                            <div className="text-xl font-bold text-blue-700">{record.systolic}/{record.diastolic}</div>
                            <div className="text-xs text-muted-foreground">mmHg</div>
                          </div>
                        )}
                        {record.heart_rate && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">❤️</span>
                              <div className="text-xs text-muted-foreground font-medium">Heart Rate</div>
                            </div>
                            <div className="text-xl font-bold text-blue-700">{record.heart_rate}</div>
                            <div className="text-xs text-muted-foreground">bpm</div>
                          </div>
                        )}
                        {record.respiratory_rate && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">🫁</span>
                              <div className="text-xs text-muted-foreground font-medium">Respiratory</div>
                            </div>
                            <div className="text-xl font-bold text-blue-700">{record.respiratory_rate}</div>
                            <div className="text-xs text-muted-foreground">/min</div>
                          </div>
                        )}
                        {record.spo2 && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">💨</span>
                              <div className="text-xs text-muted-foreground font-medium">SpO2</div>
                            </div>
                            <div className="text-xl font-bold text-blue-700">{record.spo2}%</div>
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
          <Dialog open={showVitalSignsForm} onOpenChange={setShowVitalSignsForm}>
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
                    <label className="text-sm font-medium">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="36.5"
                      value={vitalSignsForm.temperature}
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, temperature: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="72"
                      value={vitalSignsForm.heartRate}
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, heartRate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="120"
                      value={vitalSignsForm.systolic}
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, systolic: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="80"
                      value={vitalSignsForm.diastolic}
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, diastolic: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Respiratory Rate (/min)</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="16"
                      value={vitalSignsForm.respiratoryRate}
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, respiratoryRate: e.target.value})}
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
                      onChange={(e) => setVitalSignsForm({...vitalSignsForm, spO2: e.target.value})}
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
                  <Button onClick={async () => {
                    try {
                      const vitalSigns = {
                        temperature: vitalSignsForm.temperature ? parseFloat(vitalSignsForm.temperature) : undefined,
                        systolic: vitalSignsForm.systolic ? parseInt(vitalSignsForm.systolic) : undefined,
                        diastolic: vitalSignsForm.diastolic ? parseInt(vitalSignsForm.diastolic) : undefined,
                        heartRate: vitalSignsForm.heartRate ? parseInt(vitalSignsForm.heartRate) : undefined,
                        respiratoryRate: vitalSignsForm.respiratoryRate ? parseInt(vitalSignsForm.respiratoryRate) : undefined,
                        spO2: vitalSignsForm.spO2 ? parseFloat(vitalSignsForm.spO2) : undefined,
                      };

                      const response = await fetch(
                        `/api/d/${workspaceid}/patients/${patient.patientid}/vital-signs`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ vitalSigns }),
                        }
                      );

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Failed to save vital signs");
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
                      // Reload vital signs from EHRbase
                      loadVitalSigns();
                    } catch (error) {
                      console.error("Error saving vital signs:", error);
                      alert(error instanceof Error ? error.message : "Failed to save vital signs");
                    }
                  }}>
                    Save Vital Signs
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Vaccinations Tab - openEHR Vaccination Summary */}
        <TabsContent value="vaccinations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Vaccination Records</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Track immunization history</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowVaccinationForm(true)}
                  className="bg-black hover:bg-black/80 text-white"
                >
                  <span className="mr-1">+</span> Record Vaccination
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVaccinations ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading vaccinations...</p>
                  </div>
                </div>
              ) : vaccinationRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">💉</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Vaccination Records</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start tracking patient immunizations</p>
                  <Button onClick={() => setShowVaccinationForm(true)} variant="outline">
                    Record First Vaccination
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {vaccinationRecords.map((record, index) => (
                    <div key={index} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-indigo-50/30">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <div className="font-semibold text-lg">{record.vaccine_name || "Vaccination Record"}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {record.recorded_time ? new Date(record.recorded_time).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Date not recorded'}
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          ✓ Recorded
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {record.targeted_disease && (
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-purple-500">🦠</span>
                              <div className="text-xs text-muted-foreground font-medium">Targeted Disease</div>
                            </div>
                            <div className="text-base font-bold text-purple-600">{record.targeted_disease}</div>
                          </div>
                        )}
                        {record.total_administrations && (
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-500">💊</span>
                              <div className="text-xs text-muted-foreground font-medium">Total Doses</div>
                            </div>
                            <div className="text-base font-bold text-blue-600">{record.total_administrations}</div>
                          </div>
                        )}
                        {record.last_vaccine_date && (
                          <div className="bg-white rounded-lg p-3 border border-green-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-green-500">📅</span>
                              <div className="text-xs text-muted-foreground font-medium">Last Vaccine</div>
                            </div>
                            <div className="text-base font-bold text-green-600">
                              {new Date(record.last_vaccine_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                        {record.next_vaccine_due && (
                          <div className="bg-white rounded-lg p-3 border border-orange-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-orange-500">⏰</span>
                              <div className="text-xs text-muted-foreground font-medium">Next Due</div>
                            </div>
                            <div className="text-base font-bold text-orange-600">
                              {new Date(record.next_vaccine_due).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {(record.description || record.additional_details || record.comment) && (
                        <div className="space-y-2 text-sm">
                          {record.description && (
                            <div>
                              <div className="text-xs text-muted-foreground font-medium mb-1">Description</div>
                              <div className="text-gray-700">{record.description}</div>
                            </div>
                          )}
                          {record.additional_details && (
                            <div>
                              <div className="text-xs text-muted-foreground font-medium mb-1">Additional Details</div>
                              <div className="text-gray-700">{record.additional_details}</div>
                            </div>
                          )}
                          {record.comment && (
                            <div>
                              <div className="text-xs text-muted-foreground font-medium mb-1">Comment</div>
                              <div className="text-gray-700">{record.comment}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vaccination Form Dialog */}
          <Dialog open={showVaccinationForm} onOpenChange={setShowVaccinationForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Vaccination</DialogTitle>
                <DialogDescription>
                  Vaccination summary following openEHR standards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Vaccine Name *</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="e.g., COVID-19 mRNA Vaccine"
                      value={vaccinationForm.vaccineName}
                      onChange={(e) => setVaccinationForm({...vaccinationForm, vaccineName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Targeted Disease/Agent *</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="e.g., COVID-19"
                      value={vaccinationForm.targetedDisease}
                      onChange={(e) => setVaccinationForm({...vaccinationForm, targetedDisease: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Brief description of the vaccine"
                    value={vaccinationForm.description}
                    onChange={(e) => setVaccinationForm({...vaccinationForm, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Administrations</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="e.g., 2"
                      value={vaccinationForm.totalAdministrations}
                      onChange={(e) => setVaccinationForm({...vaccinationForm, totalAdministrations: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Last Vaccine</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={vaccinationForm.lastVaccineDate}
                      onChange={(e) => setVaccinationForm({...vaccinationForm, lastVaccineDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Next Vaccine Due</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={vaccinationForm.nextVaccineDue}
                      onChange={(e) => setVaccinationForm({...vaccinationForm, nextVaccineDue: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Additional Details</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Any additional relevant information"
                    value={vaccinationForm.additionalDetails}
                    onChange={(e) => setVaccinationForm({...vaccinationForm, additionalDetails: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Clinical notes or observations"
                    value={vaccinationForm.comment}
                    onChange={(e) => setVaccinationForm({...vaccinationForm, comment: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowVaccinationForm(false);
                      setVaccinationForm({
                        vaccineName: "",
                        targetedDisease: "",
                        description: "",
                        totalAdministrations: "",
                        lastVaccineDate: "",
                        nextVaccineDue: "",
                        additionalDetails: "",
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-black hover:bg-black/80 text-white"
                    onClick={async () => {
                      try {
                        if (!vaccinationForm.vaccineName || !vaccinationForm.targetedDisease) {
                          alert("Please fill in required fields: Vaccine Name and Targeted Disease");
                          return;
                        }

                        const response = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/vaccinations`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ vaccination: vaccinationForm }),
                          }
                        );

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || "Failed to save vaccination");
                        }

                        setShowVaccinationForm(false);
                        setVaccinationForm({
                          vaccineName: "",
                          targetedDisease: "",
                          description: "",
                          totalAdministrations: "",
                          lastVaccineDate: "",
                          nextVaccineDue: "",
                          additionalDetails: "",
                          comment: "",
                        });
                        loadVaccinations();
                      } catch (error) {
                        console.error("Error saving vaccination:", error);
                        alert(error instanceof Error ? error.message : "Failed to save vaccination");
                      }
                    }}
                  >
                    Save Vaccination
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Referrals Tab - openEHR Referral */}
        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Referrals</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage patient referrals to specialists</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowReferralForm(true)}
                  className="bg-black hover:bg-black/80 text-white"
                >
                  <span className="mr-1">+</span> New Referral
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReferrals ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading referrals...</p>
                  </div>
                </div>
              ) : referralRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Referrals</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create a referral to another physician or department</p>
                  <Button onClick={() => setShowReferralForm(true)} variant="outline">
                    Create First Referral
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {referralRecords.map((record, index) => (
                    <div key={index} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-teal-50/30">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                            <div className="font-semibold text-lg">Referral to {record.physician_department || "Specialist"}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {record.recorded_time ? new Date(record.recorded_time).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Date not recorded'}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.urgency === "yes" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {record.urgency === "yes" ? "⚠️ Urgent" : "✓ Routine"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-teal-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-teal-500">🏥</span>
                            <div className="text-xs text-muted-foreground font-medium">Physician/Department</div>
                          </div>
                          <div className="text-base font-bold text-teal-600">{record.physician_department}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-500">📋</span>
                            <div className="text-xs text-muted-foreground font-medium">Clinical Indication</div>
                          </div>
                          <div className="text-base font-bold text-blue-600">{record.clinical_indication}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-500">👨‍⚕️</span>
                            <div className="text-xs text-muted-foreground font-medium">Referred By</div>
                          </div>
                          <div className="text-base font-bold text-gray-600">{record.referred_by || "Unknown"}</div>
                        </div>
                      </div>

                      {record.comment && (
                        <div className="text-sm">
                          <div className="text-xs text-muted-foreground font-medium mb-1">Additional Comments</div>
                          <div className="text-gray-700 bg-white p-3 rounded-lg border">{record.comment}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Form Dialog */}
          <Dialog open={showReferralForm} onOpenChange={setShowReferralForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Referral</DialogTitle>
                <DialogDescription>
                  Refer patient to another physician or department
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Physician / Department *</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., Cardiology, Dr. Smith"
                    value={referralForm.physicianDepartment}
                    onChange={(e) => setReferralForm({...referralForm, physicianDepartment: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Clinical Indication *</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Reason for referral and relevant clinical information"
                    value={referralForm.clinicalIndication}
                    onChange={(e) => setReferralForm({...referralForm, clinicalIndication: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Urgency *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="urgency"
                        value="no"
                        checked={referralForm.urgency === "no"}
                        onChange={(e) => setReferralForm({...referralForm, urgency: e.target.value})}
                        className="w-4 h-4"
                      />
                      <span>Routine</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="urgency"
                        value="yes"
                        checked={referralForm.urgency === "yes"}
                        onChange={(e) => setReferralForm({...referralForm, urgency: e.target.value})}
                        className="w-4 h-4"
                      />
                      <span className="text-red-600 font-medium">Urgent</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Additional notes or instructions"
                    value={referralForm.comment}
                    onChange={(e) => setReferralForm({...referralForm, comment: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowReferralForm(false);
                      setReferralForm({
                        physicianDepartment: "",
                        clinicalIndication: "",
                        urgency: "no",
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-black hover:bg-black/80 text-white"
                    onClick={async () => {
                      try {
                        if (!referralForm.physicianDepartment || !referralForm.clinicalIndication) {
                          alert("Please fill in required fields: Physician/Department and Clinical Indication");
                          return;
                        }

                        const response = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/referrals`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ referral: referralForm }),
                          }
                        );

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || "Failed to create referral");
                        }

                        setShowReferralForm(false);
                        setReferralForm({
                          physicianDepartment: "",
                          clinicalIndication: "",
                          urgency: "no",
                          comment: "",
                        });
                        loadReferrals();
                      } catch (error) {
                        console.error("Error creating referral:", error);
                        alert(error instanceof Error ? error.message : "Failed to create referral");
                      }
                    }}
                  >
                    Create Referral
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Diagnostics Tab - Based on openEHR Problem/Diagnosis */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Diagnostics</CardTitle>
                <Button size="sm" onClick={() => setShowDiagnosisForm(true)}>
                  + Add Diagnosis
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample diagnoses */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg">Hyperlipidemia</div>
                      <div className="text-sm text-muted-foreground">ICD-10: E78.5</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Severity</div>
                      <div className="font-medium">Moderate</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date of Onset</div>
                      <div>Nov 8, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Body Site</div>
                      <div>Systemic</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Diagnosed By</div>
                      <div>Dr. Smith</div>
                    </div>
                  </div>
                  <div className="text-sm mb-3">
                    <div className="text-muted-foreground text-xs mb-1">Clinical Description</div>
                    <div>Elevated LDL cholesterol (140 mg/dL) and total cholesterol (220 mg/dL). Patient presents with family history of cardiovascular disease.</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Comment</div>
                    <div>Started on statin therapy. Lifestyle modifications recommended. Follow-up lipid panel in 3 months.</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg">Prediabetes</div>
                      <div className="text-sm text-muted-foreground">ICD-10: R73.03</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Severity</div>
                      <div className="font-medium">Mild</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date of Onset</div>
                      <div>Nov 9, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Body Site</div>
                      <div>Systemic</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Diagnosed By</div>
                      <div>Dr. Williams</div>
                    </div>
                  </div>
                  <div className="text-sm mb-3">
                    <div className="text-muted-foreground text-xs mb-1">Clinical Description</div>
                    <div>Fasting blood glucose 105 mg/dL. Patient at risk for developing Type 2 Diabetes Mellitus.</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Comment</div>
                    <div>Referred to endocrinology. Dietary counseling provided. HbA1c monitoring every 3 months.</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg">Acute Upper Respiratory Infection</div>
                      <div className="text-sm text-muted-foreground">ICD-10: J06.9</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                      Resolved
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Severity</div>
                      <div className="font-medium">Mild</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date of Onset</div>
                      <div>Oct 15, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date of Resolution</div>
                      <div>Oct 22, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Diagnosed By</div>
                      <div>Dr. Smith</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Clinical Description</div>
                    <div>Patient presented with sore throat, nasal congestion, and mild fever. Symptoms resolved with symptomatic treatment.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis Form Dialog */}
          <Dialog open={showDiagnosisForm} onOpenChange={setShowDiagnosisForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Diagnosis</DialogTitle>
                <DialogDescription>
                  Based on openEHR Problem/Diagnosis archetype
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Problem/Diagnosis Name */}
                <div>
                  <label className="text-sm font-medium">Problem/Diagnosis Name *</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., Type 2 Diabetes Mellitus"
                    value={diagnosisForm.problemDiagnosis}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, problemDiagnosis: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The name of the problem or diagnosis (preferably coded with ICD-10 or SNOMED CT)
                  </p>
                </div>

                {/* Clinical Status */}
                <div>
                  <label className="text-sm font-medium">Clinical Status *</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={diagnosisForm.clinicalStatus}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, clinicalStatus: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resolved">Resolved</option>
                    <option value="remission">Remission</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The clinical status of the problem or diagnosis
                  </p>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={diagnosisForm.severity}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, severity: e.target.value})}
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The assessed severity of the problem or diagnosis
                  </p>
                </div>

                {/* Date of Onset */}
                <div>
                  <label className="text-sm font-medium">Date of Onset</label>
                  <input
                    type="date"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={diagnosisForm.dateOfOnset}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, dateOfOnset: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The date/time when the problem or diagnosis was first identified
                  </p>
                </div>

                {/* Date of Resolution */}
                <div>
                  <label className="text-sm font-medium">Date of Resolution</label>
                  <input
                    type="date"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={diagnosisForm.dateOfResolution}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, dateOfResolution: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The date/time when the problem or diagnosis resolved (if applicable)
                  </p>
                </div>

                {/* Body Site */}
                <div>
                  <label className="text-sm font-medium">Body Site</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., Left knee, Systemic, Respiratory system"
                    value={diagnosisForm.bodySite}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, bodySite: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The body site affected by the problem or diagnosis
                  </p>
                </div>

                {/* Clinical Description */}
                <div>
                  <label className="text-sm font-medium">Clinical Description</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Narrative description of the problem or diagnosis..."
                    value={diagnosisForm.clinicalDescription}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, clinicalDescription: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Narrative description of the clinical aspects of the problem or diagnosis
                  </p>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Additional comments about the diagnosis..."
                    value={diagnosisForm.comment}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, comment: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional narrative about the problem or diagnosis not captured in other fields
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowDiagnosisForm(false);
                      setDiagnosisForm({
                        problemDiagnosis: "",
                        clinicalStatus: "active",
                        severity: "moderate",
                        dateOfOnset: "",
                        dateOfResolution: "",
                        clinicalDescription: "",
                        bodySite: "",
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    // TODO: Save diagnosis to database
                    console.log("Saving diagnosis:", diagnosisForm);
                    setShowDiagnosisForm(false);
                  }}>
                    Save Diagnosis
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Medical History Tab - openEHR Compliant */}
        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medical History</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="medical_condition">Medical Conditions</option>
                    <option value="surgical_history">Surgical History</option>
                    <option value="allergy">Allergies</option>
                    <option value="family_history">Family History</option>
                    <option value="immunization">Immunizations</option>
                    <option value="social_history">Social History</option>
                  </select>
                  <Button 
                    size="sm" 
                    onClick={() => setShowMedicalHistoryForm(true)}
                  >
                    + Add Record
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMedicalHistory ? (
                <div className="text-center py-8 text-muted-foreground">Loading medical history...</div>
              ) : medicalHistoryRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No medical history records found. Click &quot;+ Add Record&quot; to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {medicalHistoryRecords
                    .filter(record => selectedCategory === "all" || record.category === selectedCategory)
                    .map((record) => (
                    <div key={record.composition_uid} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{record.symptom_sign_name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'active' ? 'bg-green-100 text-green-800' :
                              record.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {record.category.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </div>
                          {record.body_site && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <span className="font-medium">Body Site:</span> {record.body_site}
                            </p>
                          )}
                          {record.date_time && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <span className="font-medium">Date:</span> {new Date(record.date_time).toLocaleDateString()}
                              {record.occurrence && <span className="ml-2">({record.occurrence.replace('_', ' ')})</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {record.description && (
                        <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                          <p className="font-medium text-blue-900 text-xs mb-1">Description</p>
                          <p>{record.description}</p>
                        </div>
                      )}
                      
                      {record.vaccine && (
                        <div className="mb-2 p-2 bg-green-50 rounded text-sm">
                          <p className="font-medium text-green-900 text-xs mb-1">Vaccine</p>
                          <p>{record.vaccine}</p>
                        </div>
                      )}
                      
                      {record.comment && (
                        <div className="mb-2 p-2 bg-amber-50 rounded text-sm">
                          <p className="font-medium text-amber-900 text-xs mb-1">Comment</p>
                          <p>{record.comment}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Recorded by: {record.recorded_by}</span>
                        <span>{new Date(record.recorded_time).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {medicalHistoryRecords.filter(record => selectedCategory === "all" || record.category === selectedCategory).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No records found for this category.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical History Form Dialog */}
          <Dialog open={showMedicalHistoryForm} onOpenChange={setShowMedicalHistoryForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medical History Record</DialogTitle>
                <DialogDescription>
                  Add a new medical history record for {fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Category */}
                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <select
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    id="category"
                    defaultValue="medical_condition"
                  >
                    <option value="medical_condition">Medical Condition</option>
                    <option value="surgical_history">Surgical History</option>
                    <option value="allergy">Allergy</option>
                    <option value="family_history">Family History</option>
                    <option value="immunization">Immunization</option>
                    <option value="social_history">Social History</option>
                  </select>
                </div>

                {/* Symptom/Sign Name */}
                <div>
                  <label className="text-sm font-medium">Symptom/Sign Name *</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Type 2 Diabetes Mellitus, Appendectomy"
                    id="symptomSignName"
                  />
                </div>

                {/* Body Site */}
                <div>
                  <label className="text-sm font-medium">Body Site</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Pancreas, Appendix, Chest"
                    id="bodySite"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Detailed description..."
                    id="description"
                  />
                </div>

                {/* Occurrence & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Occurrence</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      id="occurrence"
                      defaultValue="first_occurrence"
                    >
                      <option value="first_occurrence">First Occurrence</option>
                      <option value="recurrence">Recurrence</option>
                      <option value="ongoing">Ongoing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      id="status"
                      defaultValue="active"
                    >
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Date/Time */}
                <div>
                  <label className="text-sm font-medium">Date/Time of Onset</label>
                  <input
                    type="date"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    id="dateTime"
                  />
                </div>

                {/* Vaccine (for immunizations) */}
                <div>
                  <label className="text-sm font-medium">Vaccine (if applicable)</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Influenza vaccine (Fluzone Quadrivalent)"
                    id="vaccine"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Additional comments..."
                    id="comment"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowMedicalHistoryForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      const symptomSignName = (document.getElementById('symptomSignName') as HTMLInputElement)?.value;
                      const category = (document.getElementById('category') as HTMLSelectElement)?.value;
                      
                      if (!symptomSignName) {
                        alert("Please fill in the symptom/sign name");
                        return;
                      }

                      try {
                        const res = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/medical-history`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              medicalHistory: {
                                symptomSignName,
                                bodySite: (document.getElementById('bodySite') as HTMLInputElement)?.value,
                                description: (document.getElementById('description') as HTMLTextAreaElement)?.value,
                                occurrence: (document.getElementById('occurrence') as HTMLSelectElement)?.value,
                                dateTime: (document.getElementById('dateTime') as HTMLInputElement)?.value ? 
                                  new Date((document.getElementById('dateTime') as HTMLInputElement).value).toISOString() : undefined,
                                vaccine: (document.getElementById('vaccine') as HTMLInputElement)?.value,
                                comment: (document.getElementById('comment') as HTMLTextAreaElement)?.value,
                                status: (document.getElementById('status') as HTMLSelectElement)?.value,
                                category,
                              }
                            }),
                          }
                        );

                        if (res.ok) {
                          await loadMedicalHistory();
                          setShowMedicalHistoryForm(false);
                          // Clear form
                          (document.getElementById('symptomSignName') as HTMLInputElement).value = '';
                          (document.getElementById('bodySite') as HTMLInputElement).value = '';
                          (document.getElementById('description') as HTMLTextAreaElement).value = '';
                          (document.getElementById('dateTime') as HTMLInputElement).value = '';
                          (document.getElementById('vaccine') as HTMLInputElement).value = '';
                          (document.getElementById('comment') as HTMLTextAreaElement).value = '';
                        } else {
                          const error = await res.json();
                          alert(`Failed to create medical history record: ${error.error}`);
                        }
                      } catch (error) {
                        console.error("Error creating medical history:", error);
                        alert("Failed to create medical history record");
                      }
                    }}
                  >
                    Add Record
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Lab Results Tab - openEHR Compliant */}
        <TabsContent value="lab" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Laboratory Test Results</CardTitle>
                <p className="text-sm text-muted-foreground">openEHR: Laboratory test result</p>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLabResults ? (
                <div className="text-center py-8 text-muted-foreground">Loading lab results...</div>
              ) : labResultRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lab results found.
                </div>
              ) : (
                <div className="space-y-4">
                  {labResultRecords.map((result) => (
                    <div key={result.composition_uid} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{result.test_name}</h3>
                          <p className="text-sm text-muted-foreground">Protocol: {result.protocol}</p>
                          <p className="text-sm text-muted-foreground">{result.laboratory_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            result.overall_test_status === 'final' ? 'bg-green-100 text-green-800' :
                            result.overall_test_status === 'preliminary' ? 'bg-yellow-100 text-yellow-800' :
                            result.overall_test_status === 'amended' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.overall_test_status.charAt(0).toUpperCase() + result.overall_test_status.slice(1)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(result.report_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Specimen Details */}
                      {result.specimen_type && (
                        <div className="mb-3 p-2 bg-muted/30 rounded">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Specimen Details</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type:</span> {result.specimen_type}
                            </div>
                            {result.specimen_collection_time && (
                              <div>
                                <span className="text-muted-foreground">Collected:</span> {new Date(result.specimen_collection_time).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Test Results with Traffic Light Colors */}
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-2">Test Results</p>
                        <div className="rounded-md border overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-2 text-left text-xs font-medium">Analyte</th>
                                <th className="p-2 text-left text-xs font-medium">Result</th>
                                <th className="p-2 text-left text-xs font-medium">Range</th>
                                <th className="p-2 text-left text-xs font-medium">Unit</th>
                                <th className="p-2 text-left text-xs font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.test_results.map((analyte, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-2 text-sm font-medium">{analyte.analyte_name}</td>
                                  <td className="p-2 text-sm font-semibold">{analyte.result_value}</td>
                                  <td className="p-2 text-sm text-muted-foreground">{analyte.reference_range || 'N/A'}</td>
                                  <td className="p-2 text-sm">{analyte.result_unit || '-'}</td>
                                  <td className="p-2 text-sm">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      analyte.result_status === 'normal' ? 'bg-green-100 text-green-800' :
                                      analyte.result_status === 'high' || analyte.result_status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                                      analyte.result_status === 'critical' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {analyte.result_flag || analyte.result_status.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Clinical Information */}
                      {result.clinical_information_provided && (
                        <div className="mb-3 p-2 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-900 mb-1">Clinical Information Provided</p>
                          <p className="text-sm">{result.clinical_information_provided}</p>
                        </div>
                      )}

                      {/* Conclusion */}
                      {result.conclusion && (
                        <div className="mb-3 p-2 bg-purple-50 rounded">
                          <p className="text-xs font-medium text-purple-900 mb-1">Conclusion</p>
                          <p className="text-sm">{result.conclusion}</p>
                        </div>
                      )}

                      {/* Test Diagnosis */}
                      {result.test_diagnosis && (
                        <div className="mb-3 p-2 bg-orange-50 rounded">
                          <p className="text-xs font-medium text-orange-900 mb-1">Test Diagnosis</p>
                          <p className="text-sm">{result.test_diagnosis}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div>
                          {result.reported_by && <span>Reported by: {result.reported_by}</span>}
                          {result.verified_by && <span className="ml-3">Verified by: {result.verified_by}</span>}
                        </div>
                        <button
                          onClick={() => {
                            // TODO: Implement lab result details view
                            console.log('View lab result:', result);
                          }}
                          className="text-primary hover:underline"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Orders Tab */}
        <TabsContent value="testorders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Laboratory Test Orders</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowTestOrderForm(true)}
                >
                  + New Test Order
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTestOrders ? (
                <div className="text-center py-8 text-muted-foreground">Loading test orders...</div>
              ) : testOrderRecords.length === 0 ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium">CBC, ESR</div>
                        <div className="text-sm text-muted-foreground">Haematology</div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Pending</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Ordered By</div>
                        <div>Dr. Example</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Order Date</div>
                        <div>{new Date().toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Priority</div>
                        <div>Fasting</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Order Type</div>
                        <div>Outpatient</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="text-muted-foreground text-xs mb-1">Clinical Indication</div>
                      <div>Baseline workup for dyslipidaemia / prediabetes.</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium">Fasting Lipid Profile</div>
                        <div className="text-sm text-muted-foreground">Clinical chemistry</div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">In-progress</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Ordered By</div>
                        <div>Dr. Example</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Order Date</div>
                        <div>{new Date().toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Priority</div>
                        <div>Routine</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Order Type</div>
                        <div>Outpatient</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="text-muted-foreground text-xs mb-1">Clinical Indication</div>
                      <div>Hyperlipidaemia follow-up.</div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Example data for demonstration. Real laboratory test orders will appear here once created.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testOrderRecords.map((order) => (
                    <div key={order.composition_uid} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium">
                            {order.test_name || order.test_package || order.test_select}
                          </div>
                          <div className="text-sm text-muted-foreground">{order.lab_type}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Ordered By</div>
                          <div>{order.ordered_by}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Order Date</div>
                          <div>{new Date(order.recorded_time).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Priority</div>
                          <div>{order.fasting_status}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Order Type</div>
                          <div>{order.order_type}</div>
                        </div>
                      </div>
                      {order.clinical_indication && (
                        <div className="mt-3 text-sm">
                          <div className="text-muted-foreground text-xs mb-1">Clinical Indication</div>
                          <div>{order.clinical_indication}</div>
                        </div>
                      )}
                      {order.specimen_request && (
                        <div className="mt-2 text-sm">
                          <div className="text-muted-foreground text-xs mb-1">Specimen Request</div>
                          <div>{order.specimen_request}</div>
                        </div>
                      )}
                      {order.comment && (
                        <div className="mt-2 text-sm">
                          <div className="text-muted-foreground text-xs mb-1">Comment</div>
                          <div>{order.comment}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Order Form Dialog */}
          <Dialog open={showTestOrderForm} onOpenChange={setShowTestOrderForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Laboratory Test Order</DialogTitle>
                <DialogDescription>
                  Create a laboratory test order for {fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Lab Type */}
                <div>
                  <label className="text-sm font-medium">Lab Type *</label>
                  <select
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    value={testOrderForm.labType}
                    onChange={(e) => setTestOrderForm({...testOrderForm, labType: e.target.value})}
                  >
                    <option value="">Select lab type...</option>
                    <option value="Clinic chemistry">Clinic chemistry</option>
                    <option value="Haematology">Haematology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="X-Ray">X-Ray</option>
                  </select>
                </div>

                {/* Test Select */}
                <div>
                  <label className="text-sm font-medium">Test Select *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="testSelect"
                        value="test_name"
                        checked={testOrderForm.testSelect === "test_name"}
                        onChange={(e) => setTestOrderForm({...testOrderForm, testSelect: e.target.value})}
                      />
                      <span className="text-sm">Test Name</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="testSelect"
                        value="test_package"
                        checked={testOrderForm.testSelect === "test_package"}
                        onChange={(e) => setTestOrderForm({...testOrderForm, testSelect: e.target.value})}
                      />
                      <span className="text-sm">Test Package</span>
                    </label>
                  </div>
                </div>

                {/* Test Name or Package */}
                {testOrderForm.testSelect === "test_name" ? (
                  <div>
                    <label className="text-sm font-medium">Test Name *</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., Complete Blood Count, HbA1c"
                      value={testOrderForm.testName}
                      onChange={(e) => setTestOrderForm({...testOrderForm, testName: e.target.value})}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium">Test Package *</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., Lipid Panel, Metabolic Panel"
                      value={testOrderForm.testPackage}
                      onChange={(e) => setTestOrderForm({...testOrderForm, testPackage: e.target.value})}
                    />
                  </div>
                )}

                {/* Fasting Status & Order Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Fasting Status *</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      value={testOrderForm.fastingStatus}
                      onChange={(e) => setTestOrderForm({...testOrderForm, fastingStatus: e.target.value})}
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Order Type *</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      value={testOrderForm.orderType}
                      onChange={(e) => setTestOrderForm({...testOrderForm, orderType: e.target.value})}
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="STAT">STAT</option>
                    </select>
                  </div>
                </div>

                {/* Specimen Request */}
                <div>
                  <label className="text-sm font-medium">Specimen Request</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Blood sample, Urine sample"
                    value={testOrderForm.specimenRequest}
                    onChange={(e) => setTestOrderForm({...testOrderForm, specimenRequest: e.target.value})}
                  />
                </div>

                {/* Clinical Indication */}
                <div>
                  <label className="text-sm font-medium">Clinical Indication</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Reason for test order..."
                    value={testOrderForm.clinicalIndication}
                    onChange={(e) => setTestOrderForm({...testOrderForm, clinicalIndication: e.target.value})}
                  />
                </div>

                {/* Billing Guidance */}
                <div>
                  <label className="text-sm font-medium">Billing Guidance</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="Billing information..."
                    value={testOrderForm.billingGuidance}
                    onChange={(e) => setTestOrderForm({...testOrderForm, billingGuidance: e.target.value})}
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Additional notes..."
                    value={testOrderForm.comment}
                    onChange={(e) => setTestOrderForm({...testOrderForm, comment: e.target.value})}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowTestOrderForm(false);
                      setTestOrderForm({
                        labType: "",
                        testSelect: "test_name",
                        testName: "",
                        testPackage: "",
                        fastingStatus: "Routine",
                        orderType: "Routine",
                        specimenRequest: "",
                        clinicalIndication: "",
                        billingGuidance: "",
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!testOrderForm.labType || 
                          (testOrderForm.testSelect === "test_name" && !testOrderForm.testName) ||
                          (testOrderForm.testSelect === "test_package" && !testOrderForm.testPackage)) {
                        alert("Please fill in all required fields");
                        return;
                      }

                      try {
                        const res = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/test-orders`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ testOrder: testOrderForm }),
                          }
                        );

                        if (res.ok) {
                          await loadTestOrders();
                          setShowTestOrderForm(false);
                          setTestOrderForm({
                            labType: "",
                            testSelect: "test_name",
                            testName: "",
                            testPackage: "",
                            fastingStatus: "Routine",
                            orderType: "Routine",
                            specimenRequest: "",
                            clinicalIndication: "",
                            billingGuidance: "",
                            comment: "",
                          });
                        } else {
                          const error = await res.json();
                          alert(`Failed to create test order: ${error.error}`);
                        }
                      } catch (error) {
                        console.error("Error creating test order:", error);
                        alert("Failed to create test order");
                      }
                    }}
                  >
                    Create Test Order
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prescriptions</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowPrescriptionForm(true)}
                >
                  + New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPrescriptions ? (
                <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
              ) : prescriptionRecords.length === 0 ? (
                <div className="space-y-2">
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left text-sm font-medium">Medication</th>
                        <th className="p-3 text-left text-sm font-medium">Dosage</th>
                        <th className="p-3 text-left text-sm font-medium">Route</th>
                        <th className="p-3 text-left text-sm font-medium">Timing</th>
                        <th className="p-3 text-left text-sm font-medium">Prescribed By</th>
                        <th className="p-3 text-left text-sm font-medium">Date</th>
                        <th className="p-3 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr key="dummy-rx-1" className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">Atorvastatin 20 mg</td>
                        <td className="p-3 text-sm">20 mg</td>
                        <td className="p-3 text-sm">Oral</td>
                        <td className="p-3 text-sm">Once daily at night</td>
                        <td className="p-3 text-sm">Dr. Example</td>
                        <td className="p-3 text-sm text-muted-foreground">{new Date().toLocaleDateString()}</td>
                        <td className="p-3 text-sm">
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">active</span>
                        </td>
                      </tr>
                      <tr key="dummy-rx-2" className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">Metformin 500 mg</td>
                        <td className="p-3 text-sm">500 mg</td>
                        <td className="p-3 text-sm">Oral</td>
                        <td className="p-3 text-sm">Twice daily with food</td>
                        <td className="p-3 text-sm">Dr. Example</td>
                        <td className="p-3 text-sm text-muted-foreground">{new Date().toLocaleDateString()}</td>
                        <td className="p-3 text-sm">
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">active</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Example data for demonstration. Real prescriptions will appear here once recorded.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left text-sm font-medium">Medication</th>
                        <th className="p-3 text-left text-sm font-medium">Dosage</th>
                        <th className="p-3 text-left text-sm font-medium">Route</th>
                        <th className="p-3 text-left text-sm font-medium">Timing</th>
                        <th className="p-3 text-left text-sm font-medium">Prescribed By</th>
                        <th className="p-3 text-left text-sm font-medium">Date</th>
                        <th className="p-3 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionRecords.map((prescription) => (
                        <tr key={prescription.composition_uid} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm font-medium">{prescription.medication_item}</td>
                          <td className="p-3 text-sm">
                            {prescription.dose_amount && prescription.dose_unit 
                              ? `${prescription.dose_amount} ${prescription.dose_unit}` 
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-sm">{prescription.route}</td>
                          <td className="p-3 text-sm">{prescription.timing_directions}</td>
                          <td className="p-3 text-sm">{prescription.prescribed_by}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(prescription.recorded_time).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              prescription.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {prescription.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Form Dialog */}
          <Dialog open={showPrescriptionForm} onOpenChange={setShowPrescriptionForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Prescription (openEHR Medication Order)</DialogTitle>
                <DialogDescription>
                  Create a medication order for {fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Medication Name */}
                <div>
                  <label className="text-sm font-medium">Medication Name *</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Amoxicillin, Metformin"
                    value={prescriptionForm.medicationItem}
                    onChange={(e) => setPrescriptionForm({...prescriptionForm, medicationItem: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">openEHR: Medication item</p>
                </div>

                {/* Dose & Route */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Dose Amount *</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., 500"
                      value={prescriptionForm.doseAmount}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, doseAmount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit *</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      value={prescriptionForm.doseUnit}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, doseUnit: e.target.value})}
                    >
                      <option value="">Select...</option>
                      <option value="mg">mg</option>
                      <option value="g">g</option>
                      <option value="mcg">mcg</option>
                      <option value="ml">ml</option>
                      <option value="tablet">tablet(s)</option>
                      <option value="capsule">capsule(s)</option>
                      <option value="puff">puff(s)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Route *</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      value={prescriptionForm.route}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, route: e.target.value})}
                    >
                      <option value="">Select...</option>
                      <option value="Oral">Oral</option>
                      <option value="Intravenous">IV</option>
                      <option value="Intramuscular">IM</option>
                      <option value="Subcutaneous">SC</option>
                      <option value="Topical">Topical</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>
                  </div>
                </div>

                {/* Frequency & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Frequency *</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., Three times daily"
                      value={prescriptionForm.timingDirections}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, timingDirections: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">openEHR: Timing - daily</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., 7 days"
                      value={prescriptionForm.directionDuration}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, directionDuration: e.target.value})}
                    />
                  </div>
                </div>

                {/* PRN */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="asRequired"
                    checked={prescriptionForm.asRequired}
                    onChange={(e) => setPrescriptionForm({...prescriptionForm, asRequired: e.target.checked})}
                  />
                  <label htmlFor="asRequired" className="text-sm font-medium">As Required (PRN)</label>
                </div>
                {prescriptionForm.asRequired && (
                  <div>
                    <label className="text-sm font-medium">PRN Criterion</label>
                    <input
                      type="text"
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      placeholder="e.g., for pain"
                      value={prescriptionForm.asRequiredCriterion}
                      onChange={(e) => setPrescriptionForm({...prescriptionForm, asRequiredCriterion: e.target.value})}
                    />
                  </div>
                )}

                {/* Instructions */}
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="e.g., Take with food"
                    value={prescriptionForm.additionalInstruction}
                    onChange={(e) => setPrescriptionForm({...prescriptionForm, additionalInstruction: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">openEHR: Additional instruction</p>
                </div>

                {/* Clinical Indication */}
                <div>
                  <label className="text-sm font-medium">Clinical Indication</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Bacterial infection"
                    value={prescriptionForm.clinicalIndication}
                    onChange={(e) => setPrescriptionForm({...prescriptionForm, clinicalIndication: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">openEHR: Clinical indication</p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPrescriptionForm(false);
                      setPrescriptionForm({
                        medicationItem: "",
                        medicationItemCode: "",
                        medicationItemTerminology: "SNOMED-CT",
                        doseAmount: "",
                        doseUnit: "",
                        doseFormula: "",
                        route: "",
                        routeCode: "",
                        bodySite: "",
                        bodySiteCode: "",
                        administrationMethod: "",
                        administrationMethodCode: "",
                        timingDirections: "",
                        frequency: "",
                        interval: "",
                        asRequired: false,
                        asRequiredCriterion: "",
                        directionDuration: "",
                        clinicalIndication: "",
                        clinicalIndicationCode: "",
                        clinicalIndicationTerminology: "ICD-10",
                        medicationSafety: "",
                        maximumDoseAmount: "",
                        maximumDoseUnit: "",
                        maximumDosePeriod: "",
                        additionalInstruction: "",
                        patientInstruction: "",
                        orderType: "dose-based",
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!prescriptionForm.medicationItem || !prescriptionForm.route || 
                          !prescriptionForm.doseAmount || !prescriptionForm.doseUnit || 
                          !prescriptionForm.timingDirections) {
                        alert("Please fill in all required fields (Medication Item, Route, Dose Amount, Dose Unit, Timing Directions)");
                        return;
                      }

                      try {
                        const res = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/prescriptions`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prescription: prescriptionForm }),
                          }
                        );

                        if (res.ok) {
                          await loadPrescriptions();
                          setShowPrescriptionForm(false);
                          setPrescriptionForm({
                            medicationItem: "",
                            medicationItemCode: "",
                            medicationItemTerminology: "SNOMED-CT",
                            doseAmount: "",
                            doseUnit: "",
                            doseFormula: "",
                            route: "",
                            routeCode: "",
                            bodySite: "",
                            bodySiteCode: "",
                            administrationMethod: "",
                            administrationMethodCode: "",
                            timingDirections: "",
                            frequency: "",
                            interval: "",
                            asRequired: false,
                            asRequiredCriterion: "",
                            directionDuration: "",
                            clinicalIndication: "",
                            clinicalIndicationCode: "",
                            clinicalIndicationTerminology: "ICD-10",
                            medicationSafety: "",
                            maximumDoseAmount: "",
                            maximumDoseUnit: "",
                            maximumDosePeriod: "",
                            additionalInstruction: "",
                            patientInstruction: "",
                            orderType: "dose-based",
                            comment: "",
                          });
                        } else {
                          const error = await res.json();
                          alert(`Failed to save prescription: ${error.error}`);
                        }
                      } catch (error) {
                        console.error("Error saving prescription:", error);
                        alert("Failed to save prescription");
                      }
                    }}
                  >
                    Save Prescription
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Imaging Tab - openEHR Compliant */}
        <TabsContent value="imaging" className="space-y-4">
          {/* Imaging Requests Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Imaging Requests</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowImagingRequestForm(true)}
                >
                  + New Imaging Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingImaging ? (
                <div className="text-center py-8 text-muted-foreground">Loading imaging requests...</div>
              ) : imagingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No imaging requests found. Click &quot;+ New Imaging Request&quot; to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {imagingRequests.map((request) => (
                    <div key={request.composition_uid} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{request.request_name}</h4>
                          {request.description && (
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.request_status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.request_status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          request.request_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {request.request_status.charAt(0).toUpperCase() + request.request_status.slice(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Requested By</div>
                          <div>{request.requested_by}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Request Date</div>
                          <div>{new Date(request.recorded_time).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Urgency</div>
                          <div className="capitalize">{request.urgency}</div>
                        </div>
                        {request.target_body_site && (
                          <div>
                            <div className="text-muted-foreground text-xs">Body Site</div>
                            <div>{request.target_body_site}</div>
                          </div>
                        )}
                      </div>
                      {request.clinical_indication && (
                        <div className="mt-3 text-sm">
                          <div className="text-muted-foreground text-xs mb-1">Clinical Indication</div>
                          <div>{request.clinical_indication}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Imaging Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Imaging Results</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingImaging ? (
                <div className="text-center py-8 text-muted-foreground">Loading imaging results...</div>
              ) : imagingResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No imaging results available.
                </div>
              ) : (
                <div className="space-y-4">
                  {imagingResults.map((result) => (
                    <div key={result.composition_uid} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{result.examination_name}</h4>
                          {result.body_site && (
                            <p className="text-sm text-muted-foreground">{result.body_site}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          result.result_status === 'final' ? 'bg-green-100 text-green-800' :
                          result.result_status === 'preliminary' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {result.result_status.charAt(0).toUpperCase() + result.result_status.slice(1)}
                        </span>
                      </div>
                      
                      {result.imaging_findings && (
                        <div className="mb-3 p-3 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-900 mb-1">Imaging Findings</p>
                          <p className="text-sm">{result.imaging_findings}</p>
                        </div>
                      )}
                      
                      {result.impression && (
                        <div className="mb-3 p-3 bg-purple-50 rounded">
                          <p className="text-xs font-medium text-purple-900 mb-1">Impression</p>
                          <p className="text-sm">{result.impression}</p>
                        </div>
                      )}
                      
                      {result.additional_details && (
                        <div className="mb-3 text-sm">
                          <div className="text-muted-foreground text-xs mb-1">Additional Details</div>
                          <div>{result.additional_details}</div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div>
                          {result.reported_by && <span>Reported by: {result.reported_by}</span>}
                          <span className="ml-3">{new Date(result.report_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Imaging Request Form Dialog */}
          <Dialog open={showImagingRequestForm} onOpenChange={setShowImagingRequestForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Imaging Request</DialogTitle>
                <DialogDescription>
                  Create an imaging examination request for {fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Request Name */}
                <div>
                  <label className="text-sm font-medium">Request Name *</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Chest X-Ray, CT Scan Abdomen"
                    id="requestName"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Brief description of the imaging request..."
                    id="description"
                  />
                </div>

                {/* Clinical Indication */}
                <div>
                  <label className="text-sm font-medium">Clinical Indication</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Reason for imaging request..."
                    id="clinicalIndication"
                  />
                </div>

                {/* Urgency & Contrast Use */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Urgency *</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      id="urgency"
                      defaultValue="routine"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contrast Use</label>
                    <select
                      className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      id="contrastUse"
                      defaultValue="no"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Target Body Site */}
                <div>
                  <label className="text-sm font-medium">Target Body Site</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="e.g., Chest, Abdomen, Left knee"
                    id="targetBodySite"
                  />
                </div>

                {/* Patient Requirement */}
                <div>
                  <label className="text-sm font-medium">Patient Requirement</label>
                  <input
                    type="text"
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    placeholder="Special patient requirements..."
                    id="patientRequirement"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <textarea
                    className="w-full mt-1.5 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Additional comments..."
                    id="comment"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowImagingRequestForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      const requestName = (document.getElementById('requestName') as HTMLInputElement)?.value;
                      
                      if (!requestName) {
                        alert("Please fill in the request name");
                        return;
                      }

                      try {
                        const res = await fetch(
                          `/api/d/${workspaceid}/patients/${patient.patientid}/imaging`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              type: 'request',
                              data: {
                                requestName,
                                description: (document.getElementById('description') as HTMLTextAreaElement)?.value,
                                clinicalIndication: (document.getElementById('clinicalIndication') as HTMLTextAreaElement)?.value,
                                urgency: (document.getElementById('urgency') as HTMLSelectElement)?.value,
                                contrastUse: (document.getElementById('contrastUse') as HTMLSelectElement)?.value,
                                targetBodySite: (document.getElementById('targetBodySite') as HTMLInputElement)?.value,
                                patientRequirement: (document.getElementById('patientRequirement') as HTMLInputElement)?.value,
                                comment: (document.getElementById('comment') as HTMLTextAreaElement)?.value,
                              }
                            }),
                          }
                        );

                        if (res.ok) {
                          await loadImaging();
                          setShowImagingRequestForm(false);
                          // Clear form
                          (document.getElementById('requestName') as HTMLInputElement).value = '';
                          (document.getElementById('description') as HTMLTextAreaElement).value = '';
                          (document.getElementById('clinicalIndication') as HTMLTextAreaElement).value = '';
                          (document.getElementById('targetBodySite') as HTMLInputElement).value = '';
                          (document.getElementById('patientRequirement') as HTMLInputElement).value = '';
                          (document.getElementById('comment') as HTMLTextAreaElement).value = '';
                        } else {
                          const error = await res.json();
                          alert(`Failed to create imaging request: ${error.error}`);
                        }
                      } catch (error) {
                        console.error("Error creating imaging request:", error);
                        alert("Failed to create imaging request");
                      }
                    }}
                  >
                    Create Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Care Plans Tab - openEHR Compliant */}
        <TabsContent value="careplans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Care Plans</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowCarePlanForm(true)}
                >
                  + New Care Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCarePlans ? (
                <div className="text-center py-8 text-muted-foreground">Loading care plans...</div>
              ) : carePlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No care plans found. Click &quot;+ New Care Plan&quot; to create one.
                </div>
              ) : (
              <div className="space-y-4">
                {carePlans.map((plan) => (
                  <div key={plan.composition_uid} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">{plan.care_plan_name}</h4>
                        <p className="text-xs text-muted-foreground">Created: {new Date(plan.recorded_time).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'active' ? 'bg-green-100 text-green-800' :
                        plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        plan.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                      </span>
                    </div>

                    {plan.reason && (
                      <div className="mb-3 p-2 bg-amber-50 rounded text-sm">
                        <p className="font-medium text-amber-900 text-xs mb-1">Reason</p>
                        <p>{plan.reason}</p>
                      </div>
                    )}

                    {plan.description && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                        <p className="font-medium text-blue-900 text-xs mb-1">Description</p>
                        <p>{plan.description}</p>
                      </div>
                    )}

                    {plan.care_plan_schedule && (
                      <div className="mb-3 p-2 bg-purple-50 rounded text-sm">
                        <p className="font-medium text-purple-900 text-xs mb-1">Schedule</p>
                        <p>{plan.care_plan_schedule}</p>
                      </div>
                    )}

                    {plan.comment && (
                      <div className="mb-3 p-2 bg-green-50 rounded text-sm">
                        <p className="font-medium text-green-900 text-xs mb-1">Comment</p>
                        <p>{plan.comment}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <div>
                        <span className="font-medium">Created by:</span> {plan.created_by}
                      </div>
                      {plan.care_plan_expire && (
                        <div>
                          <span className="font-medium">Expires:</span> {new Date(plan.care_plan_expire).toLocaleDateString()}
                        </div>
                      )}
                      {plan.care_plan_completed && (
                        <div className="col-span-2">
                          <span className="font-medium">Completed:</span> {new Date(plan.care_plan_completed).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clinical Notes</CardTitle>
                <Button size="sm" onClick={() => setShowNoteForm(true)}>
                  + New Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingNotes ? (
                <div className="text-center py-8 text-muted-foreground">Loading clinical notes...</div>
              ) : clinicalNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clinical notes recorded. Click &quot;+ New Note&quot; to create one.
                </div>
              ) : (
              <div className="space-y-4">
                {clinicalNotes.map((note) => (
                  <div key={note.composition_uid} className="border rounded-lg p-4">
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{note.note_title || note.note_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Date(note.recorded_time).toLocaleString()} • {note.author} ({note.author_role})
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        note.status === 'final' ? 'bg-green-100 text-green-800' :
                        note.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {note.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Synopsis */}
                    <div className="mb-3 p-3 bg-blue-50 rounded-md">
                      <div className="text-xs font-medium text-blue-900 mb-1">SYNOPSIS</div>
                      <div className="text-sm text-blue-900">{note.synopsis}</div>
                    </div>

                    {/* SOAP Format */}
                    {(note.subjective || note.objective || note.assessment || note.plan) && (
                      <div className="space-y-3">
                        {note.subjective && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">SUBJECTIVE</div>
                            <div className="text-sm whitespace-pre-line">{note.subjective}</div>
                          </div>
                        )}
                        {note.objective && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">OBJECTIVE</div>
                            <div className="text-sm whitespace-pre-line">{note.objective}</div>
                          </div>
                        )}
                        {note.assessment && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">ASSESSMENT</div>
                            <div className="text-sm whitespace-pre-line">{note.assessment}</div>
                          </div>
                        )}
                        {note.plan && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">PLAN</div>
                            <div className="text-sm whitespace-pre-line">{note.plan}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Details */}
                    {(note.clinical_context || note.comment) && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {note.clinical_context && (
                          <div className="text-xs">
                            <span className="font-medium text-muted-foreground">Context:</span>
                            <span className="ml-2">{note.clinical_context}</span>
                          </div>
                        )}
                        {note.comment && (
                          <div className="text-xs">
                            <span className="font-medium text-muted-foreground">Comment:</span>
                            <span className="ml-2">{note.comment}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Care Plan Form Dialog */}
      <Dialog open={showCarePlanForm} onOpenChange={setShowCarePlanForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Care Plan</DialogTitle>
            <DialogDescription>
              Create a new care plan for {fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Care Plan Name */}
            <div>
              <label className="text-sm font-medium">Care Plan Name *</label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Cardiovascular Risk Management"
                id="carePlanName"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Comprehensive description of the care plan..."
                id="carePlanDescription"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium">Reason</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Reason for this care plan..."
                id="carePlanReason"
              />
            </div>

            {/* Care Plan Schedule */}
            <div>
              <label className="text-sm font-medium">Care Plan Schedule</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Schedule and frequency of interventions..."
                id="carePlanSchedule"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Expire Date</label>
                <input
                  type="date"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="carePlanExpire"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="carePlanStatus"
                  defaultValue="active"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional comments..."
                id="carePlanComment"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCarePlanForm(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  const carePlanName = (document.getElementById('carePlanName') as HTMLInputElement)?.value;
                  
                  if (!carePlanName) {
                    alert("Please fill in the care plan name");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patient.patientid}/care-plans`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          carePlan: {
                            carePlanName,
                            description: (document.getElementById('carePlanDescription') as HTMLTextAreaElement)?.value,
                            reason: (document.getElementById('carePlanReason') as HTMLTextAreaElement)?.value,
                            carePlanSchedule: (document.getElementById('carePlanSchedule') as HTMLTextAreaElement)?.value,
                            carePlanExpire: (document.getElementById('carePlanExpire') as HTMLInputElement)?.value ?
                              new Date((document.getElementById('carePlanExpire') as HTMLInputElement).value).toISOString() : undefined,
                            comment: (document.getElementById('carePlanComment') as HTMLTextAreaElement)?.value,
                            status: (document.getElementById('carePlanStatus') as HTMLSelectElement)?.value,
                          }
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadCarePlans();
                      setShowCarePlanForm(false);
                      // Clear form
                      (document.getElementById('carePlanName') as HTMLInputElement).value = '';
                      (document.getElementById('carePlanDescription') as HTMLTextAreaElement).value = '';
                      (document.getElementById('carePlanReason') as HTMLTextAreaElement).value = '';
                      (document.getElementById('carePlanSchedule') as HTMLTextAreaElement).value = '';
                      (document.getElementById('carePlanExpire') as HTMLInputElement).value = '';
                      (document.getElementById('carePlanComment') as HTMLTextAreaElement).value = '';
                    } else {
                      const error = await res.json();
                      alert(`Failed to create care plan: ${error.error}`);
                    }
                  } catch (error) {
                    console.error("Error creating care plan:", error);
                    alert("Failed to create care plan");
                  }
                }}
              >
                Create Care Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinical Note Form Dialog */}
      <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Clinical Note</DialogTitle>
            <DialogDescription>
              Create a new clinical note for {fullName} using SOAP format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Note Type and Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Note Type *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="noteType"
                  defaultValue="progress_note"
                >
                  <option value="progress_note">Progress Note</option>
                  <option value="consultation_note">Consultation Note</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="clinical_synopsis">Clinical Synopsis</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Note Title</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., Follow-up Visit - Hypertension"
                  id="noteTitle"
                />
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <label className="text-sm font-medium">Synopsis (Summary) *</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief summary of the clinical encounter..."
                id="noteSynopsis"
              />
            </div>

            {/* SOAP Format */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">SOAP Format (Optional but Recommended)</div>
              
              {/* Subjective */}
              <div className="mb-3">
                <label className="text-sm font-medium">Subjective</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Patient's symptoms, complaints, and history..."
                  id="noteSubjective"
                />
              </div>

              {/* Objective */}
              <div className="mb-3">
                <label className="text-sm font-medium">Objective</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Physical examination findings, vital signs, lab results..."
                  id="noteObjective"
                />
              </div>

              {/* Assessment */}
              <div className="mb-3">
                <label className="text-sm font-medium">Assessment</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Diagnosis, differential diagnosis, clinical impression..."
                  id="noteAssessment"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="text-sm font-medium">Plan</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Treatment plan, medications, follow-up instructions..."
                  id="notePlan"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">Additional Details</div>
              
              <div className="mb-3">
                <label className="text-sm font-medium">Clinical Context</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Context of the encounter (e.g., routine follow-up, acute visit)..."
                  id="noteContext"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Comment</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Additional comments or observations..."
                  id="noteComment"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowNoteForm(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  const synopsis = (document.getElementById('noteSynopsis') as HTMLTextAreaElement)?.value;
                  
                  if (!synopsis) {
                    alert("Please provide a synopsis");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patient.patientid}/notes`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          note: {
                            noteType: (document.getElementById('noteType') as HTMLSelectElement)?.value,
                            noteTitle: (document.getElementById('noteTitle') as HTMLInputElement)?.value,
                            synopsis,
                            subjective: (document.getElementById('noteSubjective') as HTMLTextAreaElement)?.value,
                            objective: (document.getElementById('noteObjective') as HTMLTextAreaElement)?.value,
                            assessment: (document.getElementById('noteAssessment') as HTMLTextAreaElement)?.value,
                            plan: (document.getElementById('notePlan') as HTMLTextAreaElement)?.value,
                            clinicalContext: (document.getElementById('noteContext') as HTMLTextAreaElement)?.value,
                            comment: (document.getElementById('noteComment') as HTMLTextAreaElement)?.value,
                            status: "final"
                          }
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadClinicalNotes();
                      setShowNoteForm(false);
                      // Clear form
                      (document.getElementById('noteTitle') as HTMLInputElement).value = '';
                      (document.getElementById('noteSynopsis') as HTMLTextAreaElement).value = '';
                      (document.getElementById('noteSubjective') as HTMLTextAreaElement).value = '';
                      (document.getElementById('noteObjective') as HTMLTextAreaElement).value = '';
                      (document.getElementById('noteAssessment') as HTMLTextAreaElement).value = '';
                      (document.getElementById('notePlan') as HTMLTextAreaElement).value = '';
                      (document.getElementById('noteContext') as HTMLTextAreaElement).value = '';
                      (document.getElementById('noteComment') as HTMLTextAreaElement).value = '';
                    } else {
                      const error = await res.json();
                      alert(`Failed to create note: ${error.error}`);
                    }
                  } catch (error) {
                    console.error("Error creating note:", error);
                    alert("Failed to create note");
                  }
                }}
              >
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Details Dialog */}
      <Dialog open={showTestDetails} onOpenChange={setShowTestDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lab Test Details</DialogTitle>
            <DialogDescription>
              Detailed information about the laboratory test
            </DialogDescription>
          </DialogHeader>
          {selectedTest && (
            <div className="space-y-4">
              {/* Laboratory Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Laboratory Name</div>
                  <div className="text-base font-semibold">{selectedTest.laboratory}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Test Date</div>
                  <div className="text-base">{selectedTest.date}</div>
                </div>
              </div>

              {/* Test Name */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Test Name</div>
                <div className="text-lg font-semibold">{selectedTest.testName}</div>
              </div>

              {/* Results */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-sm font-medium text-muted-foreground mb-2">Results</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Result</div>
                    <div className="text-2xl font-bold">{selectedTest.result}</div>
                    <div className="text-xs text-muted-foreground">{selectedTest.unit}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reference Range</div>
                    <div className="text-base font-medium">{selectedTest.referenceRange}</div>
                    <div className="text-xs text-muted-foreground">{selectedTest.unit}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="mt-1">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedTest.status === "Normal"
                            ? "bg-green-100 text-green-800"
                            : selectedTest.status === "High"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedTest.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lab Notes */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Lab Notes</div>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm">{selectedTest.notes}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowTestDetails(false)}>
                  Close
                </Button>
                <Button>Download Report</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

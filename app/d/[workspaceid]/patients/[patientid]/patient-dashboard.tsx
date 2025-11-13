/**
 * Client Component: PatientDashboard
 * - Comprehensive patient information dashboard
 * - Shows contact info, medical history, lab results, prescriptions, appointments
 * - Based on patient page use case diagram
 */
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
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
  dateofbirth?: Date | null;
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
  notes?: any;
};

export default function PatientDashboard({
  workspaceid,
  patient,
  userRole,
}: {
  workspaceid: string;
  patient: Patient;
  userRole?: string;
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<any>(null);
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

  const fullName = `${patient.firstname} ${patient.middlename ? patient.middlename + " " : ""}${patient.lastname}`;
  
  // Calculate age from date of birth
  const age = patient.dateofbirth
    ? Math.floor((new Date().getTime() - new Date(patient.dateofbirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
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
  }

  function formatDate(date: Date | string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

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
          <p className="text-sm text-muted-foreground">Patient ID: {patient.patientid.slice(0, 8)}...</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* Patient Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{fullName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Age</div>
              <div className="font-medium">{age !== null ? `${age} years` : "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gender</div>
              <div className="font-medium">{patient.gender || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Height</div>
              <div className="font-medium">{patient.height ? `${patient.height} cm` : "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Weight</div>
              <div className="font-medium">{patient.weight ? `${patient.weight} kg` : "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Blood Type</div>
              <div className="font-medium">{patient.bloodtype || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">National ID</div>
              <div className="font-medium">{patient.nationalid || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">
                {patient.phone ? (
                  <a href={`tel:${patient.phone}`} className="hover:underline">
                    📞 {patient.phone}
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">
                {patient.email ? (
                  <a href={`mailto:${patient.email}`} className="hover:underline">
                    ✉️ {patient.email}
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            {patient.address && (
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-medium">{patient.address}</div>
              </div>
            )}
            {patient.emergencycontact && (
              <div className="md:col-span-3">
                <div className="text-sm text-muted-foreground">Emergency Contact</div>
                <div className="font-medium">{patient.emergencycontact}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vital Signs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vital Signs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Blood Pressure</div>
              <div className="text-lg font-semibold">--/--</div>
              <div className="text-xs text-muted-foreground">mmHg</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Heart Rate</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">bpm</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Temperature</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">°C</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Oxygen Saturation</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">%</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Respiratory Rate</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">breaths/min</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Blood Glucose</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">mg/dL</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">BMI</div>
              <div className="text-lg font-semibold">
                {patient.height && patient.weight
                  ? ((patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1))
                  : "--"}
              </div>
              <div className="text-xs text-muted-foreground">kg/m²</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Pain Scale</div>
              <div className="text-lg font-semibold">--</div>
              <div className="text-xs text-muted-foreground">0-10</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Last updated: Not recorded
          </p>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-10 lg:grid-cols-10">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="medical">Medical History</TabsTrigger>
          <TabsTrigger value="lab">Lab Results</TabsTrigger>
          <TabsTrigger value="testorders">Test Orders</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="careplans">Care Plans</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

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

        {/* Medical History Tab */}
        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Chronic Conditions</h4>
                  <p className="text-sm text-muted-foreground">No chronic conditions recorded</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Allergies</h4>
                  <p className="text-sm text-muted-foreground">No allergies recorded</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Surgical History</h4>
                  <p className="text-sm text-muted-foreground">No surgical history recorded</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Family History</h4>
                  <p className="text-sm text-muted-foreground">No family history recorded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="lab" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Laboratory Name</th>
                      <th className="p-3 text-left text-sm font-medium">Test Name</th>
                      <th className="p-3 text-left text-sm font-medium">Result</th>
                      <th className="p-3 text-left text-sm font-medium">Reference Range</th>
                      <th className="p-3 text-left text-sm font-medium">Unit</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sample lab results - replace with actual data */}
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Central Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Central Lab",
                              testName: "Hemoglobin",
                              result: "14.5",
                              referenceRange: "13.0 - 17.0",
                              unit: "g/dL",
                              status: "Normal",
                              date: "2024-11-10",
                              notes: "Patient fasting. Sample collected at 8:00 AM. No hemolysis observed.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Hemoglobin
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">14.5</td>
                      <td className="p-3 text-sm text-muted-foreground">13.0 - 17.0</td>
                      <td className="p-3 text-sm">g/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 10, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Central Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Central Lab",
                              testName: "White Blood Cell Count",
                              result: "7.2",
                              referenceRange: "4.0 - 11.0",
                              unit: "×10³/μL",
                              status: "Normal",
                              date: "2024-11-10",
                              notes: "Complete blood count performed. Normal WBC distribution observed.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          White Blood Cell Count
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">7.2</td>
                      <td className="p-3 text-sm text-muted-foreground">4.0 - 11.0</td>
                      <td className="p-3 text-sm">×10³/μL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 10, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Central Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Central Lab",
                              testName: "Platelet Count",
                              result: "250",
                              referenceRange: "150 - 400",
                              unit: "×10³/μL",
                              status: "Normal",
                              date: "2024-11-10",
                              notes: "Platelet count within normal range. No clumping observed.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Platelet Count
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">250</td>
                      <td className="p-3 text-sm text-muted-foreground">150 - 400</td>
                      <td className="p-3 text-sm">×10³/μL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 10, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Biochemistry Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Biochemistry Lab",
                              testName: "Blood Glucose (Fasting)",
                              result: "105",
                              referenceRange: "70 - 100",
                              unit: "mg/dL",
                              status: "High",
                              date: "2024-11-09",
                              notes: "Slightly elevated fasting glucose. Patient confirmed 8-hour fast. Recommend lifestyle modifications and retest in 3 months.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Blood Glucose (Fasting)
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">105</td>
                      <td className="p-3 text-sm text-muted-foreground">70 - 100</td>
                      <td className="p-3 text-sm">mg/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                          High
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 9, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Biochemistry Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Biochemistry Lab",
                              testName: "Creatinine",
                              result: "1.0",
                              referenceRange: "0.7 - 1.3",
                              unit: "mg/dL",
                              status: "Normal",
                              date: "2024-11-09",
                              notes: "Kidney function normal. Creatinine clearance adequate.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Creatinine
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">1.0</td>
                      <td className="p-3 text-sm text-muted-foreground">0.7 - 1.3</td>
                      <td className="p-3 text-sm">mg/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 9, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Biochemistry Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Biochemistry Lab",
                              testName: "ALT (SGPT)",
                              result: "28",
                              referenceRange: "7 - 56",
                              unit: "U/L",
                              status: "Normal",
                              date: "2024-11-09",
                              notes: "Liver enzyme levels normal. No signs of hepatic dysfunction.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          ALT (SGPT)
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">28</td>
                      <td className="p-3 text-sm text-muted-foreground">7 - 56</td>
                      <td className="p-3 text-sm">U/L</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 9, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Lipid Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Lipid Lab",
                              testName: "Total Cholesterol",
                              result: "220",
                              referenceRange: "< 200",
                              unit: "mg/dL",
                              status: "High",
                              date: "2024-11-08",
                              notes: "Borderline high cholesterol. Recommend dietary changes and increased physical activity. Follow-up in 6 months.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Total Cholesterol
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">220</td>
                      <td className="p-3 text-sm text-muted-foreground">&lt; 200</td>
                      <td className="p-3 text-sm">mg/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                          High
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 8, 2024</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="p-3 text-sm">Lipid Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Lipid Lab",
                              testName: "HDL Cholesterol",
                              result: "55",
                              referenceRange: "> 40",
                              unit: "mg/dL",
                              status: "Normal",
                              date: "2024-11-08",
                              notes: "Good HDL cholesterol level. Protective against cardiovascular disease.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          HDL Cholesterol
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">55</td>
                      <td className="p-3 text-sm text-muted-foreground">&gt; 40</td>
                      <td className="p-3 text-sm">mg/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                          Normal
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 8, 2024</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 text-sm">Lipid Lab</td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedTest({
                              laboratory: "Lipid Lab",
                              testName: "LDL Cholesterol",
                              result: "140",
                              referenceRange: "< 100",
                              unit: "mg/dL",
                              status: "High",
                              date: "2024-11-08",
                              notes: "Elevated LDL cholesterol. High risk for cardiovascular disease. Recommend statin therapy and lifestyle modifications. Follow-up in 3 months.",
                            });
                            setShowTestDetails(true);
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          LDL Cholesterol
                        </button>
                      </td>
                      <td className="p-3 text-sm font-medium">140</td>
                      <td className="p-3 text-sm text-muted-foreground">&lt; 100</td>
                      <td className="p-3 text-sm">mg/dL</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs">
                          High
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Nov 8, 2024</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Sample data shown. Replace with actual lab results from database.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Orders Tab */}
        <TabsContent value="testorders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Test Orders</CardTitle>
                <Button size="sm">+ New Order</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample test orders */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">Complete Blood Count (CBC)</div>
                      <div className="text-sm text-muted-foreground">Order #TO-2024-001</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                      Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Ordered By</div>
                      <div>Dr. Smith</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Order Date</div>
                      <div>Nov 11, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Priority</div>
                      <div>Routine</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Laboratory</div>
                      <div>Central Lab</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Instructions</div>
                    <div>Fasting required. Patient should not eat or drink (except water) for 8-12 hours before test.</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">Lipid Panel</div>
                      <div className="text-sm text-muted-foreground">Order #TO-2024-002</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                      Completed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Ordered By</div>
                      <div>Dr. Smith</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Order Date</div>
                      <div>Nov 8, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Priority</div>
                      <div>Routine</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Laboratory</div>
                      <div>Lipid Lab</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" size="sm">View Results</Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">HbA1c Test</div>
                      <div className="text-sm text-muted-foreground">Order #TO-2024-003</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                      In Progress
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Ordered By</div>
                      <div>Dr. Smith</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Order Date</div>
                      <div>Nov 9, 2024</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Priority</div>
                      <div>Urgent</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Laboratory</div>
                      <div>Biochemistry Lab</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Instructions</div>
                    <div>No special preparation required. Sample collected on Nov 10, 2024.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No prescriptions recorded</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Imaging Tab */}
        <TabsContent value="imaging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Imaging & Radiology</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No imaging results available</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Referrals</CardTitle>
                <Button size="sm">+ New Referral</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample referrals */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">Cardiology Consultation</div>
                      <div className="text-sm text-muted-foreground">Referral #REF-2024-001</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                      Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Referred By</div>
                      <div>Dr. Smith (General Medicine)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Referred To</div>
                      <div>Dr. Johnson (Cardiology)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date</div>
                      <div>Nov 11, 2024</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Reason for Referral</div>
                    <div>Patient presenting with chest pain and elevated cholesterol. Requires cardiac evaluation and stress test.</div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Priority</div>
                    <div className="font-medium text-yellow-700">Urgent - Within 2 weeks</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">Endocrinology Consultation</div>
                      <div className="text-sm text-muted-foreground">Referral #REF-2024-002</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                      Completed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Referred By</div>
                      <div>Dr. Smith (General Medicine)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Referred To</div>
                      <div>Dr. Williams (Endocrinology)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date</div>
                      <div>Nov 5, 2024</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Reason for Referral</div>
                    <div>Elevated fasting glucose levels. Diabetes management and HbA1c monitoring required.</div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Consultation Date</div>
                    <div>Nov 9, 2024</div>
                  </div>
                  <div className="mt-2">
                    <Button variant="outline" size="sm">View Report</Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">Physical Therapy</div>
                      <div className="text-sm text-muted-foreground">Referral #REF-2024-003</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                      In Progress
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Referred By</div>
                      <div>Dr. Smith (General Medicine)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Referred To</div>
                      <div>Rehabilitation Center</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Date</div>
                      <div>Nov 8, 2024</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Reason for Referral</div>
                    <div>Lower back pain management. 12 sessions recommended for strengthening and pain relief.</div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Sessions Completed</div>
                    <div>4 of 12 sessions</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Care Plans Tab */}
        <TabsContent value="careplans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Care Plans</CardTitle>
                <Button size="sm">+ New Care Plan</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample care plans */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg">Cardiovascular Risk Management</div>
                      <div className="text-sm text-muted-foreground">Plan ID: CP-2024-001</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Created By</div>
                      <div>Dr. Smith</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Start Date</div>
                      <div>Nov 8, 2024</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="font-medium text-sm mb-2">Goals</div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Reduce LDL cholesterol to below 100 mg/dL</li>
                        <li>Maintain blood pressure below 130/80 mmHg</li>
                        <li>Achieve 30 minutes of moderate exercise 5 days per week</li>
                        <li>Reduce body weight by 5-10%</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-sm mb-2">Interventions</div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Statin therapy (Atorvastatin 20mg daily)</li>
                        <li>Low-fat, Mediterranean-style diet</li>
                        <li>Regular cardiovascular exercise program</li>
                        <li>Monthly lipid panel monitoring</li>
                        <li>Cardiology follow-up in 3 months</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-sm mb-2">Progress Notes</div>
                      <div className="text-sm text-muted-foreground">
                        Patient showing good compliance with medication. Started walking program. Next review scheduled for Dec 8, 2024.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-lg">Diabetes Management Plan</div>
                      <div className="text-sm text-muted-foreground">Plan ID: CP-2024-002</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Created By</div>
                      <div>Dr. Williams (Endocrinology)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Start Date</div>
                      <div>Nov 9, 2024</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="font-medium text-sm mb-2">Goals</div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Maintain HbA1c below 7%</li>
                        <li>Fasting blood glucose 80-130 mg/dL</li>
                        <li>Post-meal glucose below 180 mg/dL</li>
                        <li>Prevent diabetes complications</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-sm mb-2">Interventions</div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Metformin 500mg twice daily</li>
                        <li>Carbohydrate counting and meal planning</li>
                        <li>Daily blood glucose monitoring</li>
                        <li>HbA1c testing every 3 months</li>
                        <li>Annual eye and foot examinations</li>
                      </ul>
                    </div>

                    <div>
                      <div className="font-medium text-sm mb-2">Progress Notes</div>
                      <div className="text-sm text-muted-foreground">
                        Patient educated on glucose monitoring. Provided with glucometer and supplies. Dietitian consultation scheduled.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No clinical notes recorded</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

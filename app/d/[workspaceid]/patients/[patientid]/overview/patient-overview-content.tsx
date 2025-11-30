/**
 * Patient Overview Content Component
 * - Displays comprehensive patient information
 * - Shows: Patient Status, Visit History, Lab Results, Pharmacy Notes, Doctor Notes
 * - Highlights chronic diseases, acute results, long-time no visit
 * - Includes notifications for important updates
 */
"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  Activity, 
  Calendar, 
  TestTube, 
  Pill, 
  Stethoscope,
  Bell,
  Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  email?: string | null;
  phone?: string | null;
  dateofbirth?: string | null;
  gender?: string | null;
  nationalid?: string | null;
  chronicdiseases?: string[] | null;
  allergies?: string[] | null;
  bloodtype?: string | null;
};

type Visit = {
  visitid: string;
  visitdate: string;
  reason: string;
  diagnosis?: string | null;
  notes?: string | null;
};

type LabResult = {
  labresultid: string;
  testname: string;
  result: string;
  status: "pending" | "completed" | "acute";
  resultdate: string;
  notes?: string | null;
};

type PharmacyNote = {
  pharmacynoteid: string;
  medication: string;
  dosage: string;
  notes?: string | null;
  prescribeddate: string;
};

type DoctorNote = {
  doctornoteid: string;
  note: string;
  createdby: string;
  createdat: string;
};

export default function PatientOverviewContent({
  workspaceid,
  patientid,
}: {
  workspaceid: string;
  patientid: string;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [pharmacyNotes, setPharmacyNotes] = useState<PharmacyNote[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    async function fetchPatientData() {
      try {
        hasFetched.current = true;
        
        // Fetch patient basic info
        const patientRes = await fetch(`/api/d/${workspaceid}/patients/${patientid}`, {
          cache: "no-store",
        });
        
        if (!patientRes.ok) throw new Error("Failed to fetch patient data");
        
        const patientData = await patientRes.json();
        setPatient(patientData.patient);

        // TODO: Replace with real API calls for visits, lab results, pharmacy notes, doctor notes
        // For now, use realistic example data so the overview is populated.
        const today = new Date();
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        setVisits([
          {
            visitid: "demo-visit-1",
            visitdate: today.toISOString(),
            reason: "Follow-up for hyperlipidaemia and prediabetes",
            diagnosis: "Hyperlipidaemia, Prediabetes",
            notes: "Reviewed lifestyle changes, adjusted statin dose, ordered fasting lipid profile.",
          },
          {
            visitid: "demo-visit-2",
            visitdate: threeMonthsAgo.toISOString(),
            reason: "Initial assessment",
            diagnosis: "Overweight, family history of CAD",
            notes: "Baseline workup requested including CBC, ESR, lipid profile, fasting glucose.",
          },
        ]);

        setLabResults([
          {
            labresultid: "demo-lab-1",
            testname: "Fasting Lipid Profile",
            result: "LDL 160 mg/dL (High), HDL 38 mg/dL (Low)",
            status: "acute",
            resultdate: twoWeeksAgo.toISOString(),
            notes: "Consider intensifying statin therapy and reinforcing diet/exercise.",
          },
          {
            labresultid: "demo-lab-2",
            testname: "CBC, ESR",
            result: "Within normal limits",
            status: "completed",
            resultdate: threeMonthsAgo.toISOString(),
            notes: "No evidence of anaemia or inflammatory process.",
          },
        ]);

        setPharmacyNotes([
          {
            pharmacynoteid: "demo-pharm-1",
            medication: "Atorvastatin 20 mg tablet",
            dosage: "20 mg orally at night",
            notes: "Patient counselled on adherence and possible myalgia; advised to report symptoms.",
            prescribeddate: twoWeeksAgo.toISOString(),
          },
          {
            pharmacynoteid: "demo-pharm-2",
            medication: "Metformin 500 mg tablet",
            dosage: "500 mg orally twice daily with meals",
            notes: "Start low and titrate; monitor GI tolerance and fasting glucose.",
            prescribeddate: threeMonthsAgo.toISOString(),
          },
        ]);

        setDoctorNotes([
          {
            doctornoteid: "demo-note-1",
            note: "Patient appears well. Discussed cardiovascular risk factors and agreed on lifestyle goals.",
            createdby: "Example, MD",
            createdat: today.toISOString(),
          },
          {
            doctornoteid: "demo-note-2",
            note: "Family history of premature CAD noted. Baseline labs ordered and follow-up arranged.",
            createdby: "Example, MD",
            createdat: threeMonthsAgo.toISOString(),
          },
        ]);
        
      } catch (err) {
        console.error("Error fetching patient overview:", err);
        setError(err instanceof Error ? err.message : "Failed to load patient data");
        hasFetched.current = false;
      } finally {
        setLoading(false);
      }
    }

    fetchPatientData();
  }, [workspaceid, patientid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading patient overview...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">{error || "Patient not found"}</div>
      </div>
    );
  }

  // Calculate days since last visit
  const lastVisit = visits.length > 0 ? visits[0] : null;
  const daysSinceLastVisit = lastVisit 
    ? differenceInDays(new Date(), new Date(lastVisit.visitdate))
    : null;
  const longTimeNoVisit = daysSinceLastVisit !== null && daysSinceLastVisit > 180; // 6 months

  // Check for acute lab results
  const acuteResults = labResults.filter(r => r.status === "acute");
  
  // Check for chronic diseases
  const hasChronicDiseases = patient.chronicdiseases && patient.chronicdiseases.length > 0;

  // Notifications
  const notifications = [];
  if (longTimeNoVisit) {
    notifications.push({
      type: "warning",
      message: `No visit in ${daysSinceLastVisit} days`,
      icon: Clock,
    });
  }
  if (acuteResults.length > 0) {
    notifications.push({
      type: "urgent",
      message: `${acuteResults.length} acute lab result(s) require attention`,
      icon: AlertCircle,
    });
  }
  if (hasChronicDiseases) {
    notifications.push({
      type: "info",
      message: `Patient has ${patient.chronicdiseases!.length} chronic condition(s)`,
      icon: Activity,
    });
  }

  const patientName = `${patient.firstname} ${patient.middlename || ""} ${patient.lastname}`.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{patientName}</h1>
          <p className="text-sm text-muted-foreground">
            {patient.nationalid && `ID: ${patient.nationalid} • `}
            {patient.dateofbirth && `DOB: ${format(new Date(patient.dateofbirth), "MMM d, yyyy")}`}
          </p>
        </div>
        <Link href={`/d/${workspaceid}/patients/${patientid}`}>
          <Button variant="outline">View Full Profile</Button>
        </Link>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notif, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <notif.icon className={`h-5 w-5 mt-0.5 ${
                  notif.type === "urgent" ? "text-destructive" :
                  notif.type === "warning" ? "text-orange-500" :
                  "text-blue-500"
                }`} />
                <span className="text-sm">{notif.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patient Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Patient Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Blood Type</div>
              <div className="text-lg font-semibold">{patient.bloodtype || "Not specified"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Visit</div>
              <div className="text-lg font-semibold">
                {lastVisit ? format(new Date(lastVisit.visitdate), "MMM d, yyyy") : "No visits"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Chronic Diseases</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {hasChronicDiseases ? (
                  patient.chronicdiseases!.map((disease, idx) => (
                    <Badge key={idx} variant="secondary">{disease}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="visits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">
            <Calendar className="h-4 w-4 mr-2" />
            Visits
          </TabsTrigger>
          <TabsTrigger value="lab">
            <TestTube className="h-4 w-4 mr-2" />
            Lab Results
          </TabsTrigger>
          <TabsTrigger value="pharmacy">
            <Pill className="h-4 w-4 mr-2" />
            Pharmacy
          </TabsTrigger>
          <TabsTrigger value="doctor">
            <Stethoscope className="h-4 w-4 mr-2" />
            Doctor Notes
          </TabsTrigger>
        </TabsList>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visit History</CardTitle>
              <CardDescription>
                Patient&apos;s visit records and diagnoses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visits.length > 0 ? (
                <div className="space-y-4">
                  {visits.map((visit) => (
                    <div key={visit.visitid} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{visit.reason}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(visit.visitdate), "MMM d, yyyy")}
                        </div>
                      </div>
                      {visit.diagnosis && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Diagnosis: {visit.diagnosis}
                        </div>
                      )}
                      {visit.notes && (
                        <div className="text-sm mt-2">{visit.notes}</div>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Example data for demonstration. Real visit history will appear here once connected to the backend.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No visit records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="lab" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Results</CardTitle>
              <CardDescription>
                Recent lab tests and results
                {acuteResults.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {acuteResults.length} Acute
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labResults.length > 0 ? (
                <div className="space-y-4">
                  {labResults.map((result) => (
                    <div 
                      key={result.labresultid} 
                      className={`border-l-2 pl-4 py-2 ${
                        result.status === "acute" ? "border-destructive" : "border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{result.testname}</div>
                        <Badge variant={result.status === "acute" ? "destructive" : "secondary"}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-sm mt-1">Result: {result.result}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(result.resultdate), "MMM d, yyyy")}
                      </div>
                      {result.notes && (
                        <div className="text-sm mt-2 text-muted-foreground">{result.notes}</div>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Example data for demonstration. Real laboratory results will appear here once connected to the backend.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No lab results found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pharmacy Notes Tab */}
        <TabsContent value="pharmacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Notes</CardTitle>
              <CardDescription>
                Prescribed medications and pharmacy comments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pharmacyNotes.length > 0 ? (
                <div className="space-y-4">
                  {pharmacyNotes.map((note) => (
                    <div key={note.pharmacynoteid} className="border-l-2 border-primary pl-4 py-2">
                      <div className="font-medium">{note.medication}</div>
                      <div className="text-sm text-muted-foreground">Dosage: {note.dosage}</div>
                      <div className="text-sm text-muted-foreground">
                        Prescribed: {format(new Date(note.prescribeddate), "MMM d, yyyy")}
                      </div>
                      {note.notes && (
                        <div className="text-sm mt-2">{note.notes}</div>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Example data for demonstration. Real pharmacy notes will appear here once connected to the backend.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pharmacy notes found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Notes Tab */}
        <TabsContent value="doctor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Notes</CardTitle>
              <CardDescription>
                Clinical notes and observations from doctors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {doctorNotes.length > 0 ? (
                <div className="space-y-4">
                  {doctorNotes.map((note) => (
                    <div key={note.doctornoteid} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Dr. {note.createdby}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(note.createdat), "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                      <div className="text-sm mt-2">{note.note}</div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Example data for demonstration. Real doctor notes will appear here once connected to the backend.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No doctor notes found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

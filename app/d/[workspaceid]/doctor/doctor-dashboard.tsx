/**
 * Client Component: DoctorDashboard
 * - Shows doctor's appointments with patient details for selected date
 * - Displays patient list and operations
 * - Allows adding timestamped notes to appointments
 * - Notes structure: { timestamp: ISO string, text: string }
 * - Fetches from GET /api/d/[workspaceid]/appointments?doctorid=...
 * - Updates notes via PATCH /api/d/[workspaceid]/appointments/[id]
 */
"use client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Appointment = {
  appointmentid: string;
  patientid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: {
    patientname?: string;
    comments?: Array<{ timestamp: string; text: string }>;
  };
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
};

type DoctorInfo = {
  name: string;
  email: string;
  staffInfo?: {
    unit?: string | null;
    specialty?: string | null;
  };
};

type StaffMember = {
  staffid: string;
  role: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  unit?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function DoctorDashboard({
  workspaceid,
  doctorid,
  doctorInfo,
}: {
  workspaceid: string;
  doctorid: string;
  doctorInfo: DoctorInfo;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState<string | null>(null);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.patientid, p));
    return map;
  }, [patients]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, workspaceid, doctorid]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load appointments for selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [apptsRes, patientsRes, staffRes] = await Promise.all([
        fetch(
          `/api/d/${workspaceid}/appointments?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}&doctorid=${doctorid}`,
          { cache: "no-store" }
        ),
        fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" }),
        fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" }),
      ]);

      if (!apptsRes.ok || !patientsRes.ok) {
        throw new Error("Failed to load data");
      }

      const apptsData = await apptsRes.json();
      const patientsData = await patientsRes.json();
      const staffData = staffRes.ok ? await staffRes.json() : { staff: [] };

      setAppointments(apptsData.appointments || []);
      setPatients(patientsData.patients || []);
      setStaff(staffData.staff || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function addNote(appointmentid: string) {
    if (!noteText.trim()) return;

    try {
      setAddingNote(appointmentid);
      const appointment = appointments.find((a) => a.appointmentid === appointmentid);
      if (!appointment) return;

      const existingComments = appointment.notes?.comments || [];
      const newComment = {
        timestamp: new Date().toISOString(),
        text: noteText.trim(),
      };

      const res = await fetch(`/api/d/${workspaceid}/appointments/${appointmentid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: {
            ...appointment.notes,
            comments: [...existingComments, newComment],
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to add note");

      // Refresh appointments
      await loadData();
      setNoteText("");
      setAddingNote(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add note";
      setError(msg);
    } finally {
      setAddingNote(null);
    }
  }

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.status !== "cancelled");
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return todayAppointments.filter((a) => a.status === "scheduled");
  }, [todayAppointments]);

  const inProgressAppointments = useMemo(() => {
    return todayAppointments.filter((a) => a.status === "in_progress");
  }, [todayAppointments]);

  const completedAppointments = useMemo(() => {
    return todayAppointments.filter((a) => a.status === "completed");
  }, [todayAppointments]);

  // Group staff by unit/department
  const staffByUnit = useMemo(() => {
    const grouped = new Map<string, StaffMember[]>();
    staff.forEach((member) => {
      const unit = member.unit || "General";
      if (!grouped.has(unit)) {
        grouped.set(unit, []);
      }
      grouped.get(unit)!.push(member);
    });
    return grouped;
  }, [staff]);

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateTime(isoString: string) {
    return new Date(isoString).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Doctor Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <div className="font-medium">{doctorInfo.name}</div>
            </div>
            <div>
              <span className="text-muted-foreground">ID:</span>
              <div className="font-medium">{doctorid.slice(0, 8)}...</div>
            </div>
            {doctorInfo.staffInfo?.unit && (
              <div>
                <span className="text-muted-foreground">Unit:</span>
                <div className="font-medium">{doctorInfo.staffInfo.unit}</div>
              </div>
            )}
            {doctorInfo.staffInfo?.specialty && (
              <div>
                <span className="text-muted-foreground">Specialist:</span>
                <div className="font-medium">{doctorInfo.staffInfo.specialty}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Date:</label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts & Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedAppointments.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Appointments list */}
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments for this date.</p>
            ) : (
              todayAppointments.map((appt) => {
                const patient = patientsById.get(appt.patientid);
                const patientName = patient
                  ? `${patient.firstname} ${patient.middlename ? patient.middlename + " " : ""}${patient.lastname}`
                  : appt.notes?.patientname || "Unknown Patient";

                return (
                  <Card key={appt.appointmentid}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{patientName}</CardTitle>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatTime(appt.starttime)} - {formatTime(appt.endtime)}
                            {appt.unit && ` • ${appt.unit}`}
                          </div>
                          {patient && (
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              <div>
                                {patient.nationalid && `ID: ${patient.nationalid}`}
                              </div>
                              <div className="flex gap-2">
                                {patient.phone && <span>📞 {patient.phone}</span>}
                                {patient.email && <span>✉️ {patient.email}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Existing notes */}
                      {appt.notes?.comments && appt.notes.comments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Notes:</h4>
                          <div className="space-y-2">
                            {appt.notes.comments.map((comment, idx) => (
                              <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(comment.timestamp)}
                                </div>
                                <div className="text-sm mt-1">{comment.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add note */}
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add a note..."
                          value={addingNote === appt.appointmentid ? noteText : ""}
                          onChange={(e) => {
                            setNoteText(e.target.value);
                            setAddingNote(appt.appointmentid);
                          }}
                          rows={2}
                        />
                        {addingNote === appt.appointmentid && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => addNote(appt.appointmentid)}
                              disabled={!noteText.trim()}
                            >
                              Add Note
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAddingNote(null);
                                setNoteText("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients found.</p>
            ) : (
              patients.map((patient) => (
                <Card 
                  key={patient.patientid}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => window.location.href = `/d/${workspaceid}/patients/${patient.patientid}`}
                >
                  <CardHeader>
                    <CardTitle className="text-base">
                      {patient.firstname} {patient.middlename ? `${patient.middlename} ` : ""}
                      {patient.lastname}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      {patient.nationalid && (
                        <div className="text-muted-foreground">ID: {patient.nationalid}</div>
                      )}
                      {patient.phone && (
                        <div className="text-muted-foreground">Phone: {patient.phone}</div>
                      )}
                      {patient.email && (
                        <div className="text-muted-foreground">Email: {patient.email}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No operations scheduled for this date.</p>
                ) : (
                  todayAppointments.map((appt) => {
                    const patient = patientsById.get(appt.patientid);
                    const patientName = patient
                      ? `${patient.firstname} ${patient.middlename ? patient.middlename + " " : ""}${patient.lastname}`
                      : appt.notes?.patientname || "Unknown Patient";

                    return (
                      <div key={appt.appointmentid} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{patientName}</h3>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatTime(appt.starttime)} - {formatTime(appt.endtime)}
                              {appt.unit && ` • ${appt.unit}`}
                            </div>
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

                        {/* Patient Contact Info */}
                        {patient && (
                          <div className="bg-muted/50 rounded p-3 space-y-2">
                            <h4 className="text-sm font-medium">Contact Information</h4>
                            <div className="text-sm space-y-1">
                              {patient.nationalid && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">ID:</span>
                                  <span>{patient.nationalid}</span>
                                </div>
                              )}
                              {patient.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span>{patient.phone}</span>
                                </div>
                              )}
                              {patient.email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Email:</span>
                                  <span>{patient.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Operation Notes */}
                        {appt.notes?.comments && appt.notes.comments.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Operation Notes:</h4>
                            <div className="space-y-2">
                              {appt.notes.comments.map((comment, idx) => (
                                <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                                  <div className="text-xs text-muted-foreground">
                                    {formatDateTime(comment.timestamp)}
                                  </div>
                                  <div className="text-sm mt-1">{comment.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {/* Quick Contacts by Role */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">🏥</div>
                  <div className="text-sm font-medium">Reception</div>
                  <div className="text-xs text-muted-foreground">
                    {staff.filter((s) => s.role === "receptionist").length} staff
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">👨‍⚕️</div>
                  <div className="text-sm font-medium">Nurses</div>
                  <div className="text-xs text-muted-foreground">
                    {staff.filter((s) => s.role === "nurse").length} staff
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">🔬</div>
                  <div className="text-sm font-medium">Laboratory</div>
                  <div className="text-xs text-muted-foreground">
                    {staff.filter((s) => s.role === "lab_technician").length} staff
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">💊</div>
                  <div className="text-sm font-medium">Pharmacy</div>
                  <div className="text-xs text-muted-foreground">
                    {staff.filter((s) => s.role === "pharmacist").length} staff
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff by Units/Departments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Departments & Units</h3>
            {staffByUnit.size === 0 ? (
              <p className="text-sm text-muted-foreground">No staff available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(staffByUnit.entries()).map(([unit, members]) => (
                  <Card key={unit}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>🏥</span> {unit}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {members.length} staff member{members.length !== 1 ? "s" : ""}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div key={member.staffid} className="border-b pb-3 last:border-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {member.role === "doctor" && "Dr. "}
                                  {member.firstname} {member.middlename ? `${member.middlename} ` : ""}
                                  {member.lastname}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {member.role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                  {member.specialty && ` • ${member.specialty}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-2">
                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <span>📞</span>
                                  <a href={`tel:${member.phone}`} className="hover:underline">
                                    {member.phone}
                                  </a>
                                </div>
                              )}
                              {member.email && (
                                <div className="flex items-center gap-2">
                                  <span>✉️</span>
                                  <a href={`mailto:${member.email}`} className="hover:underline">
                                    {member.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
import { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [bookOperationOpen, setBookOperationOpen] = useState(false);
  const lastLoadedParams = useRef<string | null>(null);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.patientid, p));
    return map;
  }, [patients]);

  useEffect(() => {
    // Create unique key for current params
    const paramsKey = `${selectedDate}-${workspaceid}-${doctorid}`;
    
    // Skip if we've already loaded this combination
    if (lastLoadedParams.current === paramsKey) {
      return;
    }
    
    lastLoadedParams.current = paramsKey;
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

  // Filter staff based on search query
  const filteredStaff = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      return staff;
    }

    const query = contactSearchQuery.toLowerCase();
    return staff.filter((member) => {
      const fullName = `${member.firstname} ${member.middlename || ""} ${member.lastname}`.toLowerCase();
      const role = member.role.toLowerCase();
      const unit = (member.unit || "").toLowerCase();
      const specialty = (member.specialty || "").toLowerCase();
      const staffId = member.staffid.toLowerCase();

      return (
        fullName.includes(query) ||
        role.includes(query) ||
        unit.includes(query) ||
        specialty.includes(query) ||
        staffId.includes(query)
      );
    });
  }, [staff, contactSearchQuery]);

  // Group filtered staff by unit/department
  const staffByUnit = useMemo(() => {
    const grouped = new Map<string, StaffMember[]>();
    filteredStaff.forEach((member) => {
      const unit = member.unit || "General";
      if (!grouped.has(unit)) {
        grouped.set(unit, []);
      }
      grouped.get(unit)!.push(member);
    });
    return grouped;
  }, [filteredStaff]);

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
     {/*  <Card>
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
      </Card> */}

      {/* Date selector */}
     {/*  <div className="flex items-center gap-4">
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
      </div> */}

      {/* Quick Access Cards - 3x3 style grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `/d/${workspaceid}/schedule`)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <span className="text-sm font-semibold text-sky-900"></span>
            <div>
              <div className="text-lg font-semibold mb-4">Appointments</div>
           <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {upcomingAppointments.length} upcoming • {inProgressAppointments.length} in progress
            </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `/d/${workspaceid}/patients`)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <div>
              <div className="text-lg font-semibold mb-4">Patients</div>
              <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              In your care
            </div>
            </div>
            </CardContent>
        </Card>
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `/d/${workspaceid}/operations`)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <span className="text-sm font-semibold text-sky-900">Operation</span>
          </CardContent>
        </Card>
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `#clinical-notes`) }
        >
          <CardContent className="flex items-center justify-center py-6">
            <span className="text-sm font-semibold text-sky-900">Notification</span>
          </CardContent>
        </Card>
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `/d/${workspaceid}/staff`)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <span className="text-sm font-semibold text-sky-900">Contacts</span>
          </CardContent>
        </Card>
        <Card
          className="bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
          onClick={() => (window.location.href = `/d/${workspaceid}/doctor/todos`)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <span className="text-sm font-semibold text-sky-900">To do</span>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>📅</span> Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {upcomingAppointments.length} upcoming • {inProgressAppointments.length} in progress
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>✅</span> Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedAppointments.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {todayAppointments.length > 0 ? Math.round((completedAppointments.length / todayAppointments.length) * 100) : 0}% completion rate
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>👥</span> Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              In your care
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Today&apos;s Schedule</TabsTrigger>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="contacts">Staff Directory</TabsTrigger>
          <TabsTrigger value="operations">Clinical Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {/* Appointment Status Filters */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Filter by status:</span>
            <div className="flex gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                All ({todayAppointments.length})
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                Upcoming ({upcomingAppointments.length})
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                In Progress ({inProgressAppointments.length})
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800">
                Completed ({completedAppointments.length})
              </span>
            </div>
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

                const appointmentTime = new Date(appt.starttime);
                const now = new Date();
                const isNow = appt.status === "in_progress";
                const isPast = appointmentTime < now && appt.status === "scheduled";

                return (
                  <Card key={appt.appointmentid} className={`${
                    isNow ? "border-l-4 border-l-blue-500 bg-blue-50/30" : 
                    isPast ? "border-l-4 border-l-red-500" : ""
                  }`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{patientName}</CardTitle>
                            {isNow && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white animate-pulse">NOW</span>}
                            {isPast && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">OVERDUE</span>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="font-medium">{formatTime(appt.starttime)} - {formatTime(appt.endtime)}</span>
                            {appt.unit && <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">📍 {appt.unit}</span>}
                          </div>
                          {patient && (
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">ID:</span>
                                <span>{patient.nationalid || "N/A"}</span>
                              </div>
                              <div className="flex gap-3">
                                {patient.phone && (
                                  <a href={`tel:${patient.phone}`} className="flex items-center gap-1 hover:underline">
                                    <span>📞</span> {patient.phone}
                                  </a>
                                )}
                                {patient.email && (
                                  <a href={`mailto:${patient.email}`} className="flex items-center gap-1 hover:underline">
                                    <span>✉️</span> {patient.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              appt.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : appt.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {appt.status === "scheduled" ? "Scheduled" : 
                             appt.status === "in_progress" ? "In Progress" : "Completed"}
                          </span>
                          {patient && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/d/${workspaceid}/patients/${patient.patientid}`;
                              }}
                              className="text-xs"
                            >
                              View Chart
                            </Button>
                          )}
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">My Patient Panel</h3>
            <p className="text-sm text-muted-foreground">
              {patients.length} patient{patients.length !== 1 ? "s" : ""} under your care
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2">No patients found.</p>
            ) : (
              patients.map((patient) => (
                <Card 
                  key={patient.patientid}
                  className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-purple-500"
                  onClick={() => window.location.href = `/d/${workspaceid}/patients/${patient.patientid}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {patient.firstname} {patient.middlename ? `${patient.middlename} ` : ""}
                          {patient.lastname}
                        </CardTitle>
                        {patient.nationalid && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {patient.nationalid}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/d/${workspaceid}/patients/${patient.patientid}`;
                        }}
                      >
                        Open Chart →
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {patient.phone && (
                          <a 
                            href={`tel:${patient.phone}`} 
                            className="flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>📞</span> {patient.phone}
                          </a>
                        )}
                      </div>
                      {patient.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <a 
                            href={`mailto:${patient.email}`} 
                            className="flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>✉️</span> {patient.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          {/* Header with Book Operation Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Operative Procedures</h2>
              <p className="text-sm text-muted-foreground">Scheduled surgeries and procedures</p>
            </div>
            <Button
              onClick={() => setBookOperationOpen(true)}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <span className="mr-2">➕</span>
              Book Operation
            </Button>
          </div>

          {/* Operative Procedures Section */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span>🏥</span> Scheduled Operative Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dummy Operative Procedure 1 - Emergency Appendectomy */}
                <div className="border-l-4 border-l-red-500 bg-red-50/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">URGENT</span>
                        <h3 className="font-semibold text-lg">Emergency Appendectomy</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Patient:</span>
                          <div className="font-medium">Sarah Johnson</div>
                          <div className="text-xs text-muted-foreground">ID: MRN-2024-001</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Scheduled:</span>
                          <div className="font-medium">{new Date().toLocaleDateString()} - 14:00</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Procedure:</span>
                          <div className="font-medium">Laparoscopic Appendectomy</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">60-90 minutes</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Operating Room:</span>
                          <div className="font-medium">OR-3</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Anesthesia:</span>
                          <div className="font-medium">General</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Clinical Indication:</div>
                        <div className="text-sm">Acute appendicitis with peritonitis. Patient presented with RLQ pain, fever (38.5°C), elevated WBC (15,000). CT scan confirms inflamed appendix with fluid collection.</div>
                      </div>
                      <div className="mt-2 p-3 bg-white rounded border">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Pre-op Checklist:</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Consent Signed</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ NPO 8hrs</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Labs Complete</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ IV Access</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">⏳ Pending: Anesthesia Review</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dummy Operative Procedure 2 - Total Knee Replacement */}
                <div className="border-l-4 border-l-blue-500 bg-blue-50/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">SCHEDULED</span>
                        <h3 className="font-semibold text-lg">Total Knee Replacement</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Patient:</span>
                          <div className="font-medium">Robert Martinez</div>
                          <div className="text-xs text-muted-foreground">ID: MRN-2024-002</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Scheduled:</span>
                          <div className="font-medium">{new Date(Date.now() + 86400000).toLocaleDateString()} - 08:00</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Procedure:</span>
                          <div className="font-medium">Right Total Knee Arthroplasty</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">120-150 minutes</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Operating Room:</span>
                          <div className="font-medium">OR-1 (Orthopedic Suite)</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Anesthesia:</span>
                          <div className="font-medium">Spinal + Sedation</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Clinical Indication:</div>
                        <div className="text-sm">Severe osteoarthritis of right knee, Grade IV. Conservative management failed. Patient reports severe pain (8/10) limiting mobility and ADLs. X-ray shows complete joint space narrowing with bone-on-bone contact.</div>
                      </div>
                      <div className="mt-2 p-3 bg-white rounded border">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Pre-op Checklist:</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Consent Signed</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Pre-op Assessment</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Blood Typed & Crossmatched</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ ECG Normal</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Implant Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regular Appointments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No regular appointments scheduled for this date.</p>
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
          {/* Search Bar */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Staff Directory</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search by name, role, department, specialty, or ID..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    🔍
                  </span>
                  {contactSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2"
                      onClick={() => setContactSearchQuery("")}
                    >
                      ✕
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {contactSearchQuery ? (
                    <span>
                      Found <strong>{filteredStaff.length}</strong> staff member{filteredStaff.length !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span>
                      Total: <strong>{staff.length}</strong> staff members
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Contacts by Role */}
          {!contactSearchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <Card 
                className="bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setContactSearchQuery("receptionist")}
              >
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
              <Card 
                className="bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => setContactSearchQuery("nurse")}
              >
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
              <Card 
                className="bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setContactSearchQuery("lab")}
              >
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
              <Card 
                className="bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => setContactSearchQuery("pharmacist")}
              >
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
          )}

          {/* Staff by Units/Departments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {contactSearchQuery ? "Search Results" : "Departments & Units"}
              </h3>
              {contactSearchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContactSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
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
                                {contactSearchQuery && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    ID: {member.staffid.slice(0, 8)}...
                                  </div>
                                )}
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

      {/* Book Operation Dialog */}
      <Dialog open={bookOperationOpen} onOpenChange={setBookOperationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book New Operation</DialogTitle>
            <DialogDescription>Schedule a new operative procedure for a patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="operation-patient">Patient *</Label>
              <Select>
                <SelectTrigger id="operation-patient">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.patientid} value={p.patientid}>
                      {p.firstname} {p.middlename || ""} {p.lastname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label htmlFor="operation-date">Scheduled Date & Time *</Label>
              <Input
                id="operation-date"
                type="datetime-local"
              />
            </div>

            {/* Operation Name */}
            <div className="space-y-2">
              <Label htmlFor="operation-name">Operation Name *</Label>
              <Input
                id="operation-name"
                placeholder="e.g., Appendectomy, Knee Replacement"
              />
            </div>

            {/* Operation Type */}
            <div className="space-y-2">
              <Label htmlFor="operation-type">Operation Type *</Label>
              <Select>
                <SelectTrigger id="operation-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="elective">Elective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="operation-duration">Estimated Duration</Label>
              <Input
                id="operation-duration"
                placeholder="e.g., 60-90 minutes"
              />
            </div>

            {/* Theater */}
            <div className="space-y-2">
              <Label htmlFor="operation-theater">Operating Theater</Label>
              <Input
                id="operation-theater"
                placeholder="e.g., OR-1, OR-2"
              />
            </div>

            {/* Anesthesia Type */}
            <div className="space-y-2">
              <Label htmlFor="operation-anesthesia">Anesthesia Type</Label>
              <Select>
                <SelectTrigger id="operation-anesthesia">
                  <SelectValue placeholder="Select anesthesia type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="spinal">Spinal</SelectItem>
                  <SelectItem value="epidural">Epidural</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="sedation">Sedation</SelectItem>
                  <SelectItem value="spinal_sedation">Spinal + Sedation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="operation-diagnosis">Diagnosis</Label>
              <Textarea
                id="operation-diagnosis"
                placeholder="Enter primary diagnosis..."
                rows={2}
              />
            </div>

            {/* Pre-operative Assessment */}
            <div className="space-y-2">
              <Label htmlFor="operation-assessment">Pre-operative Assessment</Label>
              <Textarea
                id="operation-assessment"
                placeholder="Enter pre-operative assessment findings..."
                rows={3}
              />
            </div>

            {/* Operation Details */}
            <div className="space-y-2">
              <Label htmlFor="operation-details">Operation Details</Label>
              <Textarea
                id="operation-details"
                placeholder="Enter surgical technique, approach, etc..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBookOperationOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-black hover:bg-gray-800 text-white"
                onClick={() => {
                  // For now, just redirect to operations page
                  window.location.href = `/d/${workspaceid}/operations`;
                }}
              >
                Book Operation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

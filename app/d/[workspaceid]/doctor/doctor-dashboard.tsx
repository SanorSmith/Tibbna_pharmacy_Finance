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

type OpenEHREHR = {
  ehr_id: string;
  subject_id: string;
  created_time: string;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  doctorInfo,
}: {
  workspaceid: string;
  doctorid: string;
  doctorInfo: DoctorInfo;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // For counts
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ehrs, setEhrs] = useState<OpenEHREHR[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Helper to find matching EHR for a patient
  const getEHRForPatient = (patient: Patient): OpenEHREHR | undefined => {
    if (patient.nationalid) {
      const ehrByNationalId = ehrs.find((ehr) => ehr.subject_id === patient.nationalid);
      if (ehrByNationalId) return ehrByNationalId;
    }
    return ehrs.find((ehr) => ehr.subject_id === patient.patientid);
  };

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

      const [apptsRes, allApptsRes, patientsRes, staffRes] = await Promise.all([
        fetch(
          `/api/d/${workspaceid}/appointments?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}&doctorid=${doctorid}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/d/${workspaceid}/doctor/${doctorid}/appointments`,
          { cache: "no-store" }
        ),
        fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" }),
        fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" }),
      ]);

      if (!apptsRes.ok || !patientsRes.ok) {
        throw new Error("Failed to load data");
      }

      const apptsData = await apptsRes.json();
      const allApptsData = allApptsRes.ok ? await allApptsRes.json() : { appointments: [] };
      const patientsData = await patientsRes.json();
      const staffData = staffRes.ok ? await staffRes.json() : { staff: [] };

      setAppointments(apptsData.appointments || []);
      setAllAppointments(allApptsData.appointments || []);
      setPatients(patientsData.patients || []);
      setStaff(staffData.staff || []);

      // Also fetch OpenEHR EHRs
      try {
        const ehrRes = await fetch("/api/ehrbase/ehr", { cache: "no-store" });
        if (ehrRes.ok) {
          const ehrData = await ehrRes.json();
          setEhrs(ehrData ?? []);
        }
      } catch (ehrErr) {
        console.warn("Could not fetch OpenEHR EHRs:", ehrErr);
      }
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

  // Use allAppointments for counts (not filtered by date)
  const todayAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return apptDate >= today && apptDate < tomorrow && a.status !== "cancelled";
    });
  }, [allAppointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return apptDate >= now && a.status === "scheduled";
    });
  }, [allAppointments]);

  const inProgressAppointments = useMemo(() => {
    return allAppointments.filter((a) => a.status === "in_progress");
  }, [allAppointments]);

  const completedAppointments = useMemo(() => {
    return allAppointments.filter((a) => a.status === "completed");
  }, [allAppointments]);

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

 const cardBaseClasses =
  "bg-[#618FF5] hover:bg-[#4F78D1] transition-colors cursor-pointer text-white";

return (
  <div className="space-y-4 mr-4 ml-4">
    {/* Quick Access Cards Grid */}
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* Appointments */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/appointments`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Appointments</div>
            <div className="text-2xl font-bold">{allAppointments.length}</div>
            <div className="text-xs opacity-90 mt-1">
              {todayAppointments.length} today • {upcomingAppointments.length} upcoming
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/patients`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Patients</div>
            <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-xs opacity-90 mt-1">In your care</div>
          </div>
        </CardContent>
      </Card>

      {/* Operation */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/operations`)}
      >
        <CardContent className="flex items-center justify-center py-6">
          <span className="text-md font-bold">Operation</span>
        </CardContent>
      </Card>

      {/* Notification */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `#clinical-notes`)}
      >
        <CardContent className="flex items-center justify-center py-6">
          <span className="text-md font-bold">Notification</span>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/staff`)}
      >
        <CardContent className="flex items-center justify-center py-6">
          <span className="text-md font-bold">Contacts</span>
        </CardContent>
      </Card>

      {/* To-do */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/todos`)}
      >
        <CardContent className="flex items-center justify-center py-6">
          <span className="text-md font-bold">To do</span>
        </CardContent>
      </Card>

    </div>
  </div>
);

}

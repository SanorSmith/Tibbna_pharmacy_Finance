/**
 * Client Component: ScheduleView
 * - FullCalendar day/week views with date navigation.
 * - Drag & drop / resize to reschedule appointments.
 * - Click on appointment to edit details.
 * - No live polling; loads on view/date changes and after edits.
 */
"use client";
import { useCallback, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import EditAppointmentDialog from "../appointments/edit-appointment-dialog";

type Appt = {
  appointmentid: string;
  patientid: string;
  doctorid: string;
  starttime: string;
  endtime: string;
  location?: string | null;
  unit?: string | null;
  status: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled";
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  email?: string | null;
  nationalid?: string | null;
};

type EventChangeInfo = {
  event: { id: string; start: Date | null; end: Date | null };
  revert: () => void;
};

export default function ScheduleView({ 
  workspaceid, 
  userRole 
}: { 
  workspaceid: string;
  userRole?: "doctor" | "administrator";
}) {
  const router = useRouter();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [lastRange, setLastRange] = useState<{ start: Date; end: Date } | null>(null);
  // Ref to prevent duplicate API calls for the same range
  const lastLoadedRangeRef = useRef<string | null>(null);
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appt | null>(null);
  // Booking details
  const departments = [
    "Outpatient Department",
    "ENT (Ear, Nose, Throat)",
    "Cardiology",
    "Neurology",
    "Maternity & Obstetrics",
    "Obstetrics & Gynecology",
    "Psychiatry & Mental Health",
    "Oncology",
    "Dermatology",
    "Ophthalmology",
    "Intensive Care Unit",
    "Operating Theaters",
    "Pharmacy",
    "Laboratory",
  ] as const;
  const [unit, setUnit] = useState<string | undefined>(undefined);
  // Doctor selection
  type Doctor = { userid: string; name: string | null; email: string | null };
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorid, setDoctorId] = useState<string | undefined>(undefined);
  // New appointment fields
  const [appointmentName, setAppointmentName] = useState<"new_patient" | "re_visit" | "follow_up">("new_patient");
  const [appointmentType, setAppointmentType] = useState<"visiting" | "video_call" | "home_visit">("visiting");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [reasonForRequest, setReasonForRequest] = useState("");
  const [description, setDescription] = useState("");

  const patientsById = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.patientid, p);
    return m;
  }, [patients]);

  const toEvents = useCallback(
    (rows: Appt[]): EventInput[] => {
      return rows.map((a) => {
        const p = patientsById.get(a.patientid);
        const name = p ? `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname}` : a.patientid;
        const pidLabel = p?.nationalid ?? a.patientid;
        return {
          id: a.appointmentid,
          start: a.starttime,
          end: a.endtime,
          title: p ? `${name} (${pidLabel})` : `Patient ${pidLabel}`,
          extendedProps: a,
        };
      });
    },
    [patientsById],
  );

  const loadRange = useCallback(
    async (start: Date, end: Date) => {
      // Create a unique key for this range to prevent duplicate calls
      const rangeKey = `${start.toISOString()}-${end.toISOString()}`;
      
      // Skip if we've already loaded this exact range
      if (lastLoadedRangeRef.current === rangeKey) {
        return;
      }
      
      lastLoadedRangeRef.current = rangeKey;
      
      try {
        setError(null);
        const url = `/api/d/${workspaceid}/appointments?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load appointments");
        const data = await res.json();
        setAppts(data.appointments || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load appointments";
        setError(msg);
      }
    },
    [workspaceid],
  );

  const handleEventDrop = useCallback(
    async (info: EventChangeInfo) => {
      const id = info.event.id;
      try {
        const body = {
          starttime: info.event.start?.toISOString(),
          endtime: info.event.end?.toISOString(),
        };
        const res = await fetch(`/api/d/${workspaceid}/appointments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update appointment");
      } catch {
        // Revert UI if failed
        info.revert();
      }
    },
    [workspaceid],
  );

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const id = info.event.id;
      try {
        const body = {
          starttime: info.event.start?.toISOString(),
          endtime: info.event.end?.toISOString(),
        };
        const res = await fetch(`/api/d/${workspaceid}/appointments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update appointment");
      } catch {
        info.revert();
      }
    },
    [workspaceid],
  );

  const ensurePatientsLoaded = useCallback(async () => {
    if (patients.length) return;
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load patients");
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load patients";
      setError(msg);
    }
  }, [workspaceid, patients.length]);

  const ensureDoctorsLoaded = useCallback(async () => {
    if (doctors.length) return;
    try {
      const res = await fetch(`/api/d/${workspaceid}/doctors`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load doctors");
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch {
      // non-blocking; if it fails we'll default to current user
    }
  }, [workspaceid, doctors.length]);

  const handleDatesSet = useCallback(
    (arg: { start: Date; end: Date }) => {
      // Ensure patient list is available (for names) then load appts
      setLastRange({ start: arg.start, end: arg.end });
      ensurePatientsLoaded().finally(() => loadRange(arg.start, arg.end));
    },
    [loadRange, ensurePatientsLoaded],
  );

  const handleDateClick = useCallback(
    async (arg: DateClickArg) => {
      const start = arg.date;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      setPendingStart(start);
      setPendingEnd(end);
      await Promise.all([ensurePatientsLoaded(), ensureDoctorsLoaded()]);
      setPickerOpen(true);
    },
    [ensurePatientsLoaded, ensureDoctorsLoaded],
  );

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const full = `${p.firstname} ${p.middlename ?? ""} ${p.lastname}`.toLowerCase();
      return (
        full.includes(q) ||
        (p.email?.toLowerCase() || "").includes(q) ||
        (p.nationalid || "").toLowerCase().includes(q) ||
        p.patientid.toLowerCase().includes(q)
      );
    });
  }, [patients, search]);

  async function createWithPatient(patientid: string) {
    if (!pendingStart || !pendingEnd) return;
    try {
      setCreating(true);
      const p = patientsById.get(patientid);
      const patientname = p ? `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname}` : undefined;
      const res = await fetch(`/api/d/${workspaceid}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientid,
          doctorid,
          appointmentname: appointmentName,
          appointmenttype: appointmentType,
          clinicalindication: clinicalIndication || null,
          reasonforrequest: reasonForRequest || null,
          description: description || null,
          starttime: pendingStart.toISOString(),
          endtime: pendingEnd.toISOString(),
          status: "scheduled",
          unit,
          patientname,
        }),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      
      // If user is a doctor, redirect to doctor dashboard
      if (userRole === "doctor") {
        router.push(`/d/${workspaceid}/doctor`);
      } else {
        // Otherwise, refresh current range
        if (lastRange) await loadRange(lastRange.start, lastRange.end);
        setPickerOpen(false);
        setSearch("");
        setUnit(undefined);
        setDoctorId(undefined);
        setAppointmentName("new_patient");
        setAppointmentType("visiting");
        setClinicalIndication("");
        setReasonForRequest("");
        setDescription("");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create appointment";
      setError(msg);
    } finally {
      setCreating(false);
      setPendingStart(null);
      setPendingEnd(null);
    }
  }

  const handleEventClick = useCallback((info: EventClickArg) => {
    const appointmentId = info.event.id;
    const appointment = appts.find(a => a.appointmentid === appointmentId);
    if (appointment) {
      setEditingAppointment(appointment);
      setEditDialogOpen(true);
    }
  }, [appts]);

  function handleSaveEdit(updatedAppointment: Appt) {
    // Update local state with the updated appointment
    setAppts(prev =>
      prev.map(apt =>
        apt.appointmentid === updatedAppointment.appointmentid
          ? updatedAppointment
          : apt
      )
    );
  }

  function handleDelete(appointmentId: string) {
    // Remove appointment from local state
    setAppts(prev =>
      prev.filter(apt => apt.appointmentid !== appointmentId)
    );
  }

  const events = useMemo<EventInput[]>(() => toEvents(appts), [appts, toEvents]);
  const inProgress = useMemo(() => appts.filter((a) => a.status === "in_progress"), [appts]);
  const checkedIn = useMemo(() => appts.filter((a) => a.status === "checked_in"), [appts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }}
          slotDuration="00:15:00"
          allDaySlot={false}
          editable
          selectable
          events={events}
          datesSet={handleDatesSet}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
      <div className="space-y-6">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <section>
          <h2 className="font-semibold mb-2">In Progress ({inProgress.length})</h2>
          <ul className="space-y-2">
            {inProgress.map((a) => (
              <li key={a.appointmentid} className="border rounded p-2 text-sm">
                <div className="font-medium">{formatRange(a.starttime, a.endtime)}</div>
                <div className="text-muted-foreground">
                  Patient: {(() => {
                    const p = patientsById.get(a.patientid);
                    const pidLabel = p?.nationalid ?? a.patientid;
                    return p
                      ? `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname} (${pidLabel})`
                      : pidLabel;
                  })()}
                </div>
                {a.location ? <div className="text-muted-foreground">Location: {a.location}</div> : null}
              </li>
            ))}
            {inProgress.length === 0 && (
              <li className="text-sm text-muted-foreground">No ongoing appointments.</li>
            )}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Checked In ({checkedIn.length})</h2>
          <ul className="space-y-2">
            {checkedIn.map((a) => (
              <li key={a.appointmentid} className="border rounded p-2 text-sm">
                <div className="font-medium">{formatRange(a.starttime, a.endtime)}</div>
                <div className="text-muted-foreground">
                  Patient: {(() => {
                    const p = patientsById.get(a.patientid);
                    const pidLabel = p?.nationalid ?? a.patientid;
                    return p
                      ? `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname} (${pidLabel})`
                      : pidLabel;
                  })()}
                </div>
                {a.location ? <div className="text-muted-foreground">Location: {a.location}</div> : null}
              </li>
            ))}
            {checkedIn.length === 0 && (
              <li className="text-sm text-muted-foreground">No patients checked in.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Patient Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select patient</h3>
              <button className="text-sm hover:underline" onClick={() => setPickerOpen(false)}>Close</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, national ID, or UUID"
              className="w-full border rounded px-3 py-2 mb-3 bg-transparent"
            />
            <div className="mb-3">
              <label className="block text-sm mb-1">Unit / Department</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional: select unit" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Doctor (optional)</label>
              <Select value={doctorid} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Default: current user" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.userid} value={d.userid}>
                      {d.name || d.email || d.userid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Appointment Name</label>
              <Select value={appointmentName} onValueChange={(value: "new_patient" | "re_visit" | "follow_up") => setAppointmentName(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_patient">New Patient</SelectItem>
                  <SelectItem value="re_visit">Re-visit Patient</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Appointment Type</label>
              <Select value={appointmentType} onValueChange={(value: "visiting" | "video_call" | "home_visit") => setAppointmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visiting">Visiting (In-Person)</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Clinical Indication</label>
              <Textarea
                placeholder="Enter clinical indication..."
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                rows={2}
                className="bg-transparent"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Reason for Request</label>
              <Textarea
                placeholder="Enter reason for appointment request..."
                value={reasonForRequest}
                onChange={(e) => setReasonForRequest(e.target.value)}
                rows={2}
                className="bg-transparent"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">Description</label>
              <Textarea
                placeholder="Additional notes or description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-transparent"
              />
            </div>
            <div className="border-t pt-3 mt-3">
              <h4 className="text-sm font-medium mb-2">Select Patient:</h4>
              <div className="max-h-60 overflow-auto divide-y border rounded">
                {filteredPatients.map((p) => (
                  <button
                    key={p.patientid}
                    className="w-full text-left p-3 hover:bg-muted/50"
                    disabled={creating}
                    onClick={() => createWithPatient(p.patientid)}
                  >
                    <div className="font-medium">
                      {p.firstname} {p.middlename ? `${p.middlename} ` : ""}{p.lastname}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.email || "No email"} · {p.nationalid || "No ID"}</div>
                    <div className="text-[10px] text-muted-foreground">{p.patientid}</div>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">No patients match your search.</div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        appointment={editingAppointment}
        workspaceid={workspaceid}
        onSave={handleSaveEdit}
        userRole={userRole}
        onDelete={handleDelete}
      />
    </div>
  );
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(s)} - ${fmt(e)}`;
}

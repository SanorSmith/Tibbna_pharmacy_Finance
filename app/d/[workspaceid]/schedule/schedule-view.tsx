/**
 * Client Component: ScheduleView
 * - FullCalendar day/week views with date navigation.
 * - Drag & drop / resize to reschedule appointments.
 * - No live polling; loads on view/date changes and after edits.
 */
"use client";
import { useCallback, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { EventInput } from "@fullcalendar/core";

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

export default function ScheduleView({ workspaceid }: { workspaceid: string }) {
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
    } catch (e) {
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
          starttime: pendingStart.toISOString(),
          endtime: pendingEnd.toISOString(),
          status: "scheduled",
          unit,
          patientname,
        }),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      // Refresh current range
      if (lastRange) await loadRange(lastRange.start, lastRange.end);
      setPickerOpen(false);
      setSearch("");
      setUnit(undefined);
      setDoctorId(undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create appointment";
      setError(msg);
    } finally {
      setCreating(false);
      setPendingStart(null);
      setPendingEnd(null);
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Select patient</h3>
              <button className="text-sm" onClick={() => setPickerOpen(false)}>Close</button>
            </div>
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
            <div className="max-h-80 overflow-auto divide-y">
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
      )}
    </div>
  );
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(s)} - ${fmt(e)}`;
}

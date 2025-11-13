/**
 * Client Component: CalendarView
 * - Displays appointments in a monthly calendar using FullCalendar
 * - Shows appointment details on hover/click
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput } from "@fullcalendar/core";

type Appointment = {
  appointmentid: string;
  patientid: string;
  doctorid: string;
  starttime: string;
  endtime: string;
  location?: string | null;
  unit?: string | null;
  status: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled";
  notes?: {
    patientname?: string;
    comments?: Array<{ timestamp: string; text: string }>;
  } | null;
};

const statusColors = {
  scheduled: "#3b82f6",
  checked_in: "#10b981",
  in_progress: "#f59e0b",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export default function CalendarView({ workspaceid }: { workspaceid: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        // Fetch appointments for a wide date range (last 3 months to next 3 months)
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
        const to = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString();
        
        const res = await fetch(
          `/api/d/${workspaceid}/appointments?from=${from}&to=${to}&doctorid=all`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const data = await res.json();
        setAppointments(data.appointments || []);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError(err instanceof Error ? err.message : "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [workspaceid]);

  const toEvents = useCallback((appts: Appointment[]): EventInput[] => {
    return appts.map((a) => {
      const patientName = a.notes?.patientname || "Unknown Patient";
      const unit = a.unit ? ` - ${a.unit}` : "";
      
      return {
        id: a.appointmentid,
        start: a.starttime,
        end: a.endtime,
        title: `${patientName}${unit}`,
        backgroundColor: statusColors[a.status],
        borderColor: statusColors[a.status],
        extendedProps: {
          ...a,
          patientName,
        },
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
        events={toEvents(appointments)}
        height="auto"
        eventDisplay="block"
        eventClick={(info) => {
          const event = info.event;
          const props = event.extendedProps as Appointment & { patientName: string };
          
          alert(`
Patient: ${props.patientName}
Unit: ${props.unit || "Not specified"}
Location: ${props.location || "Not specified"}
Status: ${props.status}
Time: ${new Date(event.start!).toLocaleString()} - ${new Date(event.end!).toLocaleString()}
          `.trim());
        }}
        eventMouseEnter={(info) => {
          info.el.style.cursor = "pointer";
        }}
      />
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors.scheduled }}></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors.checked_in }}></div>
          <span>Checked In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors.in_progress }}></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors.completed }}></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors.cancelled }}></div>
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}

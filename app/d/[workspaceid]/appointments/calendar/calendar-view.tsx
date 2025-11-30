/**
 * Client Component: CalendarView
 * - Displays appointments in a monthly calendar using FullCalendar
 * - Click on appointment to edit details
 */
"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import EditAppointmentDialog from "../edit-appointment-dialog";

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

export default function CalendarView({ 
  workspaceid,
  userRole 
}: { 
  workspaceid: string;
  userRole?: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetched.current) return;
    
    async function fetchAppointments() {
      try {
        hasFetched.current = true;
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
        hasFetched.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [workspaceid]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const appointmentId = info.event.id;
    const appointment = appointments.find(a => a.appointmentid === appointmentId);
    if (appointment) {
      setEditingAppointment(appointment);
      setEditDialogOpen(true);
    }
  }, [appointments]);

  function handleSaveEdit(updatedAppointment: Appointment) {
    // Update local state with the updated appointment
    setAppointments(prev =>
      prev.map(apt =>
        apt.appointmentid === updatedAppointment.appointmentid
          ? updatedAppointment
          : apt
      )
    );
  }

  function handleDelete(appointmentId: string) {
    // Remove appointment from local state
    setAppointments(prev =>
      prev.filter(apt => apt.appointmentid !== appointmentId)
    );
  }

  const events = useMemo<EventInput[]>(() => {
    return appointments.map((a) => {
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
  }, [appointments]);

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
        events={events}
        height="auto"
        eventDisplay="block"
        eventClick={handleEventClick}
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

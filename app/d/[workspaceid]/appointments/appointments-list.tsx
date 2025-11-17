/**
 * Client Component: AppointmentsList
 * - Fetches and displays all appointments in a table format
 * - Shows patient info, doctor, time, status, and location
 */
"use client";
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Stethoscope, RefreshCw, CheckCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import EditAppointmentDialog from "./edit-appointment-dialog";

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

// Healthcare standard color coding
const statusConfig = {
  scheduled: { 
    label: "Scheduled", 
    color: "bg-blue-50 text-blue-700 border-blue-300",
    icon: "📅",
    priority: "normal"
  },
  checked_in: { 
    label: "Checked In", 
    color: "bg-green-50 text-green-700 border-green-300",
    icon: "✓",
    priority: "ready"
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-amber-50 text-amber-700 border-amber-400",
    icon: "⏱️",
    priority: "active"
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    icon: "✅",
    priority: "done"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-50 text-red-700 border-red-300",
    icon: "❌",
    priority: "cancelled"
  },
};

export default function AppointmentsList({ 
  workspaceid, 
  userRole 
}: { 
  workspaceid: string;
  userRole?: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

  async function handleReschedule(appointmentId: string) {
    if (!confirm("Cancel this appointment? You can then create a new one at a different time.")) return;
    
    setUpdatingId(appointmentId);
    try {
      const res = await fetch(`/api/d/${workspaceid}/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel appointment");
      }

      const data = await res.json();
      
      // Update local state with server response
      setAppointments(prev =>
        prev.map(apt =>
          apt.appointmentid === appointmentId
            ? { ...apt, ...data.appointment }
            : apt
        )
      );
    } catch (err) {
      console.error("Error cancelling:", err);
      alert(err instanceof Error ? err.message : "Failed to cancel appointment");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkDone(appointmentId: string) {
    if (!confirm("Mark this appointment as completed?")) return;
    
    setUpdatingId(appointmentId);
    try {
      const res = await fetch(`/api/d/${workspaceid}/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark appointment as done");
      }

      const data = await res.json();
      
      // Update local state with server response
      setAppointments(prev =>
        prev.map(apt =>
          apt.appointmentid === appointmentId
            ? { ...apt, ...data.appointment }
            : apt
        )
      );
    } catch (err) {
      console.error("Error marking done:", err);
      alert(err instanceof Error ? err.message : "Failed to mark appointment as done");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleOpenEdit(appointment: Appointment) {
    setEditingAppointment(appointment);
    setEditDialogOpen(true);
  }

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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading appointments...</p>
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

  if (appointments.length === 0) {
    return (
      <div className="p-6 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">No appointments found</p>
      </div>
    );
  }

  // Sort appointments by start time (upcoming first, then past)
  const now = new Date();
  const sortedAppointments = [...appointments].sort((a, b) => {
    const aTime = new Date(a.starttime).getTime();
    const bTime = new Date(b.starttime).getTime();
    const nowTime = now.getTime();
    
    // Separate upcoming and past appointments
    const aIsUpcoming = aTime >= nowTime;
    const bIsUpcoming = bTime >= nowTime;
    
    if (aIsUpcoming && !bIsUpcoming) return -1;
    if (!aIsUpcoming && bIsUpcoming) return 1;
    
    // Within same category, sort by time (upcoming: earliest first, past: latest first)
    if (aIsUpcoming) return aTime - bTime;
    return bTime - aTime;
  });

  // Group appointments by date
  const groupedAppointments = sortedAppointments.reduce((groups, appointment) => {
    const date = format(new Date(appointment.starttime), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-1">Scheduled</div>
          <div className="text-2xl font-bold text-blue-900">
            {appointments.filter(a => a.status === "scheduled").length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-1">Checked In</div>
          <div className="text-2xl font-bold text-green-900">
            {appointments.filter(a => a.status === "checked_in").length}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-medium text-amber-700 mb-1">In Progress</div>
          <div className="text-2xl font-bold text-amber-900">
            {appointments.filter(a => a.status === "in_progress").length}
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="text-xs font-medium text-emerald-700 mb-1">Completed</div>
          <div className="text-2xl font-bold text-emerald-900">
            {appointments.filter(a => a.status === "completed").length}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs font-medium text-red-700 mb-1">Cancelled</div>
          <div className="text-2xl font-bold text-red-900">
            {appointments.filter(a => a.status === "cancelled").length}
          </div>
        </div>
      </div>

      {/* Grouped Appointments by Date */}
      {Object.entries(groupedAppointments).map(([date, dayAppointments]) => {
        const dateObj = new Date(date);
        const isToday = format(now, "yyyy-MM-dd") === date;
        const isPast = dateObj < new Date(format(now, "yyyy-MM-dd"));

        return (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <div className={`sticky top-0 z-10 flex items-center gap-3 py-2 px-4 rounded-lg ${
              isToday ? "bg-blue-100 border-2 border-blue-400" :
              isPast ? "bg-gray-100 border border-gray-300" :
              "bg-green-50 border border-green-300"
            }`}>
              <Calendar className="h-5 w-5" />
              <div>
                <div className="font-semibold text-lg">
                  {format(dateObj, "EEEE, MMMM dd, yyyy")}
                  {isToday && <span className="ml-2 text-sm px-2 py-0.5 bg-blue-500 text-white rounded-full">TODAY</span>}
                  {isPast && <span className="ml-2 text-xs text-gray-600">(Past)</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dayAppointments.length} appointment{dayAppointments.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Appointments for this date */}
            <div className="space-y-2">
              {dayAppointments.map((appointment) => {
                const config = statusConfig[appointment.status];
                const startDate = new Date(appointment.starttime);
                const endDate = new Date(appointment.endtime);
                const patientName = appointment.notes?.patientname || "Unknown Patient";
                const hasTimePassed = endDate < now;
                const isUpdating = updatingId === appointment.appointmentid;
                const isHappeningNow = startDate <= now && endDate >= now;
                const isOverdue = hasTimePassed && appointment.status === "scheduled";

                // Determine which action to show
                const canReschedule = appointment.status === "scheduled";
                const canMarkDone = hasTimePassed && 
                  (appointment.status === "checked_in" || 
                   appointment.status === "in_progress");

                return (
                  <div 
                    key={appointment.appointmentid} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                      isHappeningNow ? "border-l-4 border-l-blue-500 bg-blue-50/50" :
                      isOverdue ? "border-l-4 border-l-red-500 bg-red-50/30" :
                      appointment.status === "completed" ? "bg-gray-50/50" :
                      "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Time and Patient Info */}
                      <div className="flex-1 space-y-3">
                        {/* Time */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-lg font-semibold">
                            <Clock className="h-5 w-5 text-blue-600" />
                            {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                          </div>
                          {isHappeningNow && (
                            <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full animate-pulse font-medium">
                              NOW
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs px-2 py-1 bg-red-500 text-white rounded-full font-medium">
                              OVERDUE
                            </span>
                          )}
                        </div>

                        {/* Patient Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-base">{patientName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            Patient ID: {appointment.patientid.slice(0, 8)}...
                          </div>
                        </div>

                        {/* Location and Unit */}
                        <div className="flex flex-wrap gap-4 text-sm ml-6">
                          {appointment.unit && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded">
                              <Stethoscope className="h-3 w-3 text-purple-600" />
                              <span className="text-purple-700 font-medium">{appointment.unit}</span>
                            </div>
                          )}
                          {appointment.location && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              <span className="text-blue-700">{appointment.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Status and Actions */}
                      <div className="flex flex-col items-end gap-3">
                        {/* Status Badge */}
                        <Badge 
                          variant="outline" 
                          className={`${config.color} text-sm px-3 py-1 font-medium`}
                        >
                          <span className="mr-1">{config.icon}</span>
                          {config.label}
                        </Badge>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(appointment)}
                            disabled={isUpdating}
                            title="Edit appointment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canReschedule && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReschedule(appointment.appointmentid)}
                              disabled={isUpdating}
                              className="text-xs"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${isUpdating ? "animate-spin" : ""}`} />
                              Reschedule
                            </Button>
                          )}
                          {canMarkDone && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMarkDone(appointment.appointmentid)}
                              disabled={isUpdating}
                              className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit Dialog */}
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

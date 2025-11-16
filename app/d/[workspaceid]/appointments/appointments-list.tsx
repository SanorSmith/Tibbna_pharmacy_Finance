/**
 * Client Component: AppointmentsList
 * - Fetches and displays all appointments in a table format
 * - Shows patient info, doctor, time, status, and location
 */
"use client";
import { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 border-blue-200" },
  checked_in: { label: "Checked In", color: "bg-green-100 text-green-800 border-green-200" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
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

  // Sort appointments by start time (most recent first)
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.starttime).getTime() - new Date(a.starttime).getTime()
  );

  return (
    <div className="rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date & Time</TableHead>
            <TableHead className="w-[200px]">Patient</TableHead>
            <TableHead className="w-[150px]">Doctor ID</TableHead>
            <TableHead className="w-[150px]">Unit/Department</TableHead>
            <TableHead className="w-[150px]">Location</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAppointments.map((appointment) => {
            const config = statusConfig[appointment.status];
            const startDate = new Date(appointment.starttime);
            const endDate = new Date(appointment.endtime);
            const patientName = appointment.notes?.patientname || "Unknown Patient";
            const now = new Date();
            const hasTimePassed = endDate < now;
            const isUpdating = updatingId === appointment.appointmentid;

            // Determine which action to show
            // Can reschedule if:
            // 1. Scheduled and time hasn't passed yet (future appointment), OR
            // 2. Scheduled and time has passed (patient didn't check in - needs rescheduling)
            const canReschedule = appointment.status === "scheduled";
            
            // Can mark done if:
            // Patient checked in or appointment is in progress and time has passed
            const canMarkDone = hasTimePassed && 
              (appointment.status === "checked_in" || 
               appointment.status === "in_progress");

            return (
              <TableRow key={appointment.appointmentid} className="hover:bg-muted/50">
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(startDate, "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{patientName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {appointment.patientid.slice(0, 8)}...
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">
                      {appointment.doctorid.slice(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {appointment.unit || <span className="text-muted-foreground italic">Not specified</span>}
                  </span>
                </TableCell>
                <TableCell>
                  {appointment.location ? (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {appointment.location}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not specified</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={config.color}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(appointment)}
                      disabled={isUpdating}
                      title="Edit date/time"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {canReschedule && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReschedule(appointment.appointmentid)}
                        disabled={isUpdating}
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
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Done
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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

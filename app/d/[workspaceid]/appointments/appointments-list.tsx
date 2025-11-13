/**
 * Client Component: AppointmentsList
 * - Fetches and displays all appointments in a table format
 * - Shows patient info, doctor, time, status, and location
 */
"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Stethoscope } from "lucide-react";
import { format } from "date-fns";

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

export default function AppointmentsList({ workspaceid }: { workspaceid: string }) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAppointments.map((appointment) => {
            const config = statusConfig[appointment.status];
            const startDate = new Date(appointment.starttime);
            const endDate = new Date(appointment.endtime);
            const patientName = appointment.notes?.patientname || "Unknown Patient";

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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Component: EditAppointmentDialog
 * - Full appointment editing dialog with all fields
 * - Patient, doctor, date, time, unit, location selection
 */
"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  email?: string | null;
};

type Doctor = {
  userid: string;
  name: string | null;
  email: string | null;
};

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

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  workspaceid: string;
  onSave: (updatedAppointment: Appointment) => void;
  userRole?: string;
  onDelete?: (appointmentId: string) => void;
}

export default function EditAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  workspaceid,
  onSave,
  userRole,
  onDelete,
}: EditAppointmentDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form fields
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState("");

  // Load patients and doctors
  useEffect(() => {
    if (!open) return;

    async function loadData() {
      setLoading(true);
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" }),
          fetch(`/api/d/${workspaceid}/doctors`, { cache: "no-store" }),
        ]);

        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.patients || []);
        }

        if (doctorsRes.ok) {
          const doctorsData = await doctorsRes.json();
          setDoctors(doctorsData.doctors || []);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open, workspaceid]);

  // Populate form when appointment changes
  useEffect(() => {
    if (!appointment) return;

    const start = new Date(appointment.starttime);
    const end = new Date(appointment.endtime);

    setSelectedPatientId(appointment.patientid);
    setSelectedDoctorId(appointment.doctorid);
    setStartDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setEndTime(format(end, "HH:mm"));
    setUnit(appointment.unit || "");
    setLocation(appointment.location || "");
  }, [appointment]);

  function handleDeleteClick() {
    // Open confirmation dialog
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!appointment || !onDelete) return;

    setSaving(true);
    setDeleteDialogOpen(false);
    try {
      const res = await fetch(`/api/d/${workspaceid}/appointments/${appointment.appointmentid}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete appointment");
      }

      onDelete(appointment.appointmentid);
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(err instanceof Error ? err.message : "Failed to delete appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!appointment) return;

    setSaving(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${startDate}T${endTime}`);

      // Find patient name
      const patient = patients.find(p => p.patientid === selectedPatientId);
      const patientname = patient 
        ? `${patient.firstname} ${patient.middlename ? patient.middlename + " " : ""}${patient.lastname}`
        : appointment.notes?.patientname;

      const payload = {
        patientid: selectedPatientId,
        doctorid: selectedDoctorId,
        starttime: startDateTime.toISOString(),
        endtime: endDateTime.toISOString(),
        unit: unit || null,
        location: location || null,
        notes: {
          ...appointment.notes,
          patientname,
        },
        // If appointment was cancelled or completed, revert to scheduled
        ...(appointment.status === "cancelled" || appointment.status === "completed" 
          ? { status: "scheduled" } 
          : {}),
      };

      const res = await fetch(`/api/d/${workspaceid}/appointments/${appointment.appointmentid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update appointment");
      }

      const data = await res.json();
      onSave(data.appointment);
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving appointment:", err);
      alert(err instanceof Error ? err.message : "Failed to update appointment");
    } finally {
      setSaving(false);
    }
  }

  if (!appointment) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Change appointment date, time, unit, and location
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Patient (Read-only) */}
            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                {patients.find(p => p.patientid === selectedPatientId)
                  ? `${patients.find(p => p.patientid === selectedPatientId)?.firstname} ${patients.find(p => p.patientid === selectedPatientId)?.middlename || ''} ${patients.find(p => p.patientid === selectedPatientId)?.lastname}`.trim()
                  : appointment?.notes?.patientname || "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">Patient cannot be changed</p>
            </div>

            {/* Doctor (Editable for admin/nurse) */}
            <div className="space-y-2">
              <Label htmlFor="doctor">Doctor</Label>
              {userRole === "administrator" || userRole === "nurse" ? (
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.userid} value={doctor.userid}>
                        {doctor.name || doctor.email || doctor.userid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                    {doctors.find(d => d.userid === selectedDoctorId)?.name || 
                     doctors.find(d => d.userid === selectedDoctorId)?.email || 
                     selectedDoctorId.slice(0, 8) + "..." || "Loading..."}
                  </div>
                  <p className="text-xs text-muted-foreground">Doctor cannot be changed</p>
                </>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Unit/Department */}
            <div className="space-y-2">
              <Label htmlFor="unit">Unit/Department</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g., Room 101, Building A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2">
          <div>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={saving || loading}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this appointment? This action cannot be undone and the appointment will be permanently removed from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

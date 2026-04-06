"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Appointment = {
  appointmentid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: {
    comments?: Array<{
      timestamp: string;
      text: string;
    }>;
    patientname?: string;
    appointmentName?: string;
    appointmentType?: string;
    clinicalIndication?: string;
  } | string | null; // Can be object, string, or null
};

interface AppointmentsTabProps {
  appointments: Appointment[];
  loading: boolean;
  workspaceid: string;
  patientid: string;
  onAppointmentAdded?: () => void;
}

export default function AppointmentsTab({ appointments, loading, workspaceid, patientid, onAppointmentAdded }: AppointmentsTabProps) {
  console.log('AppointmentsTab rendering with:', { appointments, loading });
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ userid: string; name: string; email: string }>>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [formData, setFormData] = useState({
    starttime: "",
    appointmentName: "",
    appointmentType: "",
    clinicalIndication: "",
    reasonForRequest: "",
    unit: "",
    location: "",
    status: "scheduled",
    doctorid: "",
  });
  
  const handleAddAppointment = async () => {
    if (!formData.starttime) {
      alert("Please fill in start time");
      return;
    }

    // Calculate end time (45 minutes after start)
    const startDate = new Date(formData.starttime);
    const endDate = new Date(startDate.getTime() + 45 * 60000); // Add 45 minutes
    const endtime = endDate.toISOString().slice(0, 16);

    try {
      setSaving(true);
      const response = await fetch(`/api/d/${workspaceid}/patients/${patientid}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endtime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }

      setShowAddDialog(false);
      setFormData({
        starttime: "",
        appointmentName: "",
        appointmentType: "",
        clinicalIndication: "",
        reasonForRequest: "",
        unit: "",
        location: "",
        status: "scheduled",
        doctorid: "",
      });
      
      if (onAppointmentAdded) {
        onAppointmentAdded();
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert("Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };
  
  // Fetch doctors when dialog opens
  useEffect(() => {
    if (showAddDialog && doctors.length === 0) {
      setLoadingDoctors(true);
      fetch(`/api/d/${workspaceid}/doctors`)
        .then(res => res.json())
        .then(data => {
          if (data.doctors) {
            setDoctors(data.doctors);
          }
        })
        .catch(err => console.error('Failed to load doctors:', err))
        .finally(() => setLoadingDoctors(false));
    }
  }, [showAddDialog, workspaceid, doctors.length]);

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: 'Unknown', time: 'Unknown' };
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Appointments</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAddDialog(true)}>
              + Add Appointment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading appointments...
          </p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No appointments found
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Appointment Name</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Unit</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-left py-3 px-4 font-medium">Clinical Indication</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const { date, time } = formatDateTime(appt.starttime);
                  
                  // Extract structured data from notes
                  let appointmentName = "-";
                  let appointmentType = "-";
                  let clinicalIndication = "-";
                  
                  if (appt.notes && typeof appt.notes === 'object') {
                    if (appt.notes.appointmentName) {
                      appointmentName = appt.notes.appointmentName.replace(/_/g, ' ');
                    }
                    if (appt.notes.appointmentType) {
                      appointmentType = appt.notes.appointmentType.replace(/_/g, ' ');
                    }
                    if (appt.notes.clinicalIndication) {
                      clinicalIndication = appt.notes.clinicalIndication;
                    }
                  }
                  
                  return (
                    <tr key={appt.appointmentid} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{date}</div>
                        <div className="text-sm text-muted-foreground">{time}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {appointmentName}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {appointmentType}
                      </td>
                      <td className="py-3 px-4">
                        {appt.unit || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {appt.location || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {clinicalIndication}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            appt.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : appt.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : appt.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : appt.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {appt.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Add Appointment Dialog */}
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
      <DialogContent className="max-w-[55vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for this patient
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          {/* Row 1: Date & Time */}
          <div className="space-y-1.5">
            <Label htmlFor="starttime" className="text-sm">Date & Time *</Label>
            <Input
              id="starttime"
              type="datetime-local"
              value={formData.starttime}
              onChange={(e) => setFormData({ ...formData, starttime: e.target.value })}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Duration: 45 minutes</p>
          </div>

          {/* Row 2: Appointment Name & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appointmentName" className="text-sm">Appointment Name *</Label>
              <Select
                value={formData.appointmentName}
                onValueChange={(value) => setFormData({ ...formData, appointmentName: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_patient">New Patient</SelectItem>
                  <SelectItem value="re_visit">Re-visit</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appointmentType" className="text-sm">Type *</Label>
              <Select
                value={formData.appointmentType}
                onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visiting">Visiting</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Doctor & Clinical Indication */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doctorid" className="text-sm">Assign Doctor *</Label>
              <Select
                value={formData.doctorid}
                onValueChange={(value) => setFormData({ ...formData, doctorid: value })}
                disabled={loadingDoctors}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={loadingDoctors ? "Loading..." : "Select doctor"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.userid} value={doctor.userid}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicalIndication" className="text-sm">Clinical Indication</Label>
              <Input
                id="clinicalIndication"
                placeholder="e.g., Chest pain"
                value={formData.clinicalIndication}
                onChange={(e) => setFormData({ ...formData, clinicalIndication: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Row 4: Unit & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-sm">Unit/Department</Label>
              <Input
                id="unit"
                placeholder="e.g., Cardiology"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Room 101"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Row 5: Reason for Request */}
          <div className="space-y-1.5">
            <Label htmlFor="reasonForRequest" className="text-sm">Reason for Request</Label>
            <Textarea
              id="reasonForRequest"
              placeholder="Describe the reason for this appointment..."
              rows={2}
              value={formData.reasonForRequest}
              onChange={(e) => setFormData({ ...formData, reasonForRequest: e.target.value })}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddAppointment} disabled={saving}>
            {saving ? "Creating..." : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
type Appointment = {
  appointmentid: string;
  patientid: string;
  starttime: string;
  endtime: string;
  status: string;
  unit?: string | null;
  location?: string | null;
  notes?: {
    comments?: Array<{
      timestamp: string;
      text: string;
    }>;
    patientname?: string;
    appointmentType?: string;
    clinicalIndication?: string;
  };
  patient?: {
    firstname: string;
    middlename?: string | null;
    lastname: string;
    nationalid?: string | null;
  };
};

export default function AppointmentsList({
  workspaceid,
  doctorid,
}: {
  workspaceid: string;
  doctorid: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "past">(
    "all"
  );

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Loading appointments for doctor:", doctorid);
      const res = await fetch(
        `/api/d/${workspaceid}/doctor/${doctorid}/appointments`
      );
      console.log("Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Appointments data:", data);
        setAppointments(data.appointments || []);
      } else {
        console.error("Failed to load appointments, status:", res.status);
      }
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, doctorid]);

  useEffect(() => {
    loadAppointments();
  }, [workspaceid, doctorid, loadAppointments]);

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "Unknown", time: "Unknown" };
    }
  };

  const filterAppointments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter((appt) => {
      const apptDate = new Date(appt.starttime);

      switch (filter) {
        case "today":
          return apptDate >= today && apptDate < tomorrow;
        case "upcoming":
          return apptDate >= now;
        case "past":
          return apptDate < now;
        default:
          return true;
      }
    });
  };

  const filteredAppointments = filterAppointments();

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div>
        <Link href={`/d/${workspaceid}/doctor`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">
            {filteredAppointments.length} appointment
            {filteredAppointments.length !== 1 ? "s" : ""}{" "}
            {filter !== "all" && `(${appointments.length} total)`}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("today")}
        >
          Today
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("past")}
        >
          Past
        </Button>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading appointments...
            </p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 font-medium">ID</th>
                    <th className="text-left py-3 px-4 font-medium">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Appointment Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Clinical Indication
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appt) => {
                    const { date, time } = formatDateTime(appt.starttime);
                    const patientName = appt.patient
                      ? `${appt.patient.firstname} ${
                          appt.patient.middlename
                            ? appt.patient.middlename + " "
                            : ""
                        }${appt.patient.lastname}`
                      : "Unknown Patient";

                    // Extract appointment type and clinical indication from notes
                    let appointmentType = "-";
                    let clinicalIndication = "-";

                    if (appt.notes && typeof appt.notes === "object") {
                      if (appt.notes.appointmentType) {
                        appointmentType = appt.notes.appointmentType.replace(
                          /_/g,
                          " "
                        );
                      }
                      if (appt.notes.clinicalIndication) {
                        clinicalIndication = appt.notes.clinicalIndication;
                      }
                    }

                    return (
                      <tr
                        key={appt.appointmentid}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/d/${workspaceid}/patients/${appt.patientid}`}
                            className="font-medium hover:underline"
                          >
                            {patientName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {appt.patient?.nationalid || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>{date}</div>
                          <div className="text-muted-foreground">{time}</div>
                        </td>
                        <td className="py-3 px-4 text-sm capitalize">
                          {appointmentType}
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
                        <td className="py-3 px-4">
                          <Link
                            href={`/d/${workspaceid}/patients/${appt.patientid}`}
                          >
                            <Button size="sm" variant="outline">
                              View Patient
                            </Button>
                          </Link>
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
    </div>
  );
}

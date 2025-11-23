"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Appointment = {
  appointmentid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: string | null;
};

interface AppointmentsTabProps {
  appointments: Appointment[];
  loading: boolean;
}

export default function AppointmentsTab({ appointments, loading }: AppointmentsTabProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
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
          <div className="space-y-3">
            {appointments.map((appt) => {
              const { date, time } = formatDateTime(appt.starttime);
              return (
                <div
                  key={appt.appointmentid}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {appt.unit || 'Appointment'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {date} at {time}
                      </div>
                      {appt.location && (
                        <div className="text-sm text-muted-foreground">
                          Location: {appt.location}
                        </div>
                      )}
                      {appt.notes && (
                        <div className="text-sm mt-1">{appt.notes}</div>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          appt.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : appt.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : appt.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

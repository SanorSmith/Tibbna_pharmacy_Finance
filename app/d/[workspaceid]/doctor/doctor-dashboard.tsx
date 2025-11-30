/**
 * Client Component: DoctorDashboard
 * - Shows doctor's appointments with patient details for selected date
 * - Displays patient list and operations
 * - Allows adding timestamped notes to appointments
 * - Notes structure: { timestamp: ISO string, text: string }
 * - Fetches from GET /api/d/[workspaceid]/appointments?doctorid=...
 * - Updates notes via PATCH /api/d/[workspaceid]/appointments/[id]
 */
"use client";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type Appointment = {
  appointmentid: string;
  patientid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  unit?: string | null;
  notes?: {
    patientname?: string;
    comments?: Array<{ timestamp: string; text: string }>;
  };
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
};

type DoctorInfo = {
  name: string;
  email: string;
  staffInfo?: {
    unit?: string | null;
    specialty?: string | null;
  };
};

type StaffMember = {
  staffid: string;
  role: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  unit?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  operationname: string;
  operationtype: string;
  scheduleddate: string;
  duration: string;
  theater: string;
  anesthesiatype: string;
  operationdiagnosis: string;
  preoperativeassessment: string;
  operationdetails: string;
  status: string;
  createdat: string;
};

type Todo = {
  todoid: string;
  workspaceid: string;
  userid: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: string;
  duedate?: string | null;
  createdat: string;
  updatedat: string;
};

type ReferralRecord = {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  receiving_physician?: string;
  clinical_indication: string;
  urgency: string;
  comment?: string;
  referred_by: string;
  status: string;
  patientid: string;
  patientName: string;
  patientNationalId: string;
};

export default function DoctorDashboard({
  workspaceid,
  doctorid,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  doctorInfo,
}: {
  workspaceid: string;
  doctorid: string;
  doctorInfo: DoctorInfo;
}) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { data: allAppointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments", workspaceid, doctorid],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/doctor/${doctorid}/appointments`
      );
      if (res.ok) {
        const data = await res.json();
        return (data.appointments as Appointment[]) || [];
      }
      return [];
    },
  });

  const { data: operations = [], isLoading: loadingOps } = useQuery({
    queryKey: ["operations", workspaceid, doctorid],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/operations?surgeonid=${doctorid}`
      );
      if (res.ok) {
        const data = await res.json();
        return (data.operations as Operation[]) || [];
      }
      return [];
    },
  });

  const { data: todos = [], isLoading: loadingTodos } = useQuery({
    queryKey: ["todos", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/todos`);
      if (res.ok) {
        const data = await res.json();
        return (data.todos as Todo[]) || [];
      }
      return [];
    },
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ["patients", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (res.ok) {
        const data = await res.json();
        return (data.patients as Patient[]) || [];
      }
      return [];
    },
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/staff`);
      if (res.ok) {
        const data = await res.json();
        return (data.staff as StaffMember[]) || [];
      }
      return [];
    },
  });

  // Fetch all referrals for all patients
  const { data: allReferrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["referrals", workspaceid],
    queryFn: async (): Promise<ReferralRecord[]> => {
      const referrals: ReferralRecord[] = [];
      
      // Fetch referrals for each patient
      for (const patient of patients) {
        try {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patient.patientid}/referrals`);
          if (res.ok) {
            const data = await res.json();
            const patientReferrals = (data.referrals as ReferralRecord[]) || [];
            // Add patient info to each referral
            referrals.push(...patientReferrals.map(referral => ({
              ...referral,
              patientid: patient.patientid,
              patientName: `${patient.firstname} ${patient.lastname}`,
              patientNationalId: patient.nationalid || patient.patientid,
            })));
          }
        } catch (error) {
          console.error(`Error fetching referrals for patient ${patient.patientid}:`, error);
        }
      }
      
      return referrals;
    },
    enabled: patients.length > 0,
  });

  const loading =
    loadingAppts ||
    loadingOps ||
    loadingTodos ||
    loadingPatients ||
    loadingStaff ||
    loadingReferrals;

  // Use allAppointments for counts (not filtered by date)
  const todayAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return (
        apptDate >= today && apptDate < tomorrow && a.status !== "cancelled"
      );
    });
  }, [allAppointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return apptDate >= now && a.status === "scheduled";
    });
  }, [allAppointments]);

  const doctorsCount = useMemo(() => {
    return staff.filter((s) => s.role.toLowerCase().includes("doctor")).length;
  }, [staff]);

  const nursesCount = useMemo(() => {
    return staff.filter((s) => s.role.toLowerCase().includes("nurse")).length;
  }, [staff]);

  const nextHighPriorityTodo = useMemo(() => {
    const highPriorityTodos = todos
      .filter((t) => !t.completed && t.priority === "high")
      .sort((a, b) => {
        // Sort by due date (earliest first) or created date if no due date
        const aDate = a.duedate ? new Date(a.duedate).getTime() : new Date(a.createdat).getTime();
        const bDate = b.duedate ? new Date(b.duedate).getTime() : new Date(b.createdat).getTime();
        return aDate - bDate;
      });
    
    return highPriorityTodos[0];
  }, [todos]);

  const nextOperation = useMemo(() => {
    const scheduledOperations = operations
      .filter((o) => o.status === "scheduled")
      .sort((a, b) => new Date(a.scheduleddate).getTime() - new Date(b.scheduleddate).getTime());
    
    return scheduledOperations[0];
  }, [operations]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const scheduledAppointments = allAppointments
      .filter((a) => {
        const apptDate = new Date(a.starttime);
        return apptDate >= now && a.status === "scheduled";
      })
      .sort((a, b) => new Date(a.starttime).getTime() - new Date(b.starttime).getTime());
    
    return scheduledAppointments[0];
  }, [allAppointments]);

  const urgentReferrals = useMemo(() => {
    return allReferrals
      .filter((r) => r.urgency === "urgent")
      .sort((a, b) => new Date(b.recorded_time).getTime() - new Date(a.recorded_time).getTime());
  }, [allReferrals]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const cardBaseClasses =
    "bg-card-bg hover:bg-card-hover rounded-lg transition-colors cursor-pointer text-card-text";

  return (
    <div className="space-y-4 mr-4 ml-4">
      {/* Quick Access Cards Grid */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Appointments */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/doctor/appointments`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">Appointments ({allAppointments.length})</div>
             <div className="text-sm opacity-90 mt-1">
                {todayAppointments.length} today • {upcomingAppointments.length}{" "}
                upcoming
              </div>
              {nextAppointment && (
                <div className="text-sm opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-card-smtext">Next Appointment:</div>
                  <div>
                    {new Date(nextAppointment.starttime).toLocaleDateString()} •{" "}
                    {new Date(nextAppointment.starttime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patients */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/patients`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">Patients ({patients.length})</div>
            </div>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/doctor/operations`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">Operations ({operations.length})</div>
              <div className="text-sm opacity-90 mt-1">
                {operations.filter((o) => o.status === "scheduled").length}{" "}
                scheduled •{" "}
                {operations.filter((o) => o.status === "in_progress").length} in
                progress
              </div>
              {nextOperation ? (
                <div className="text-sm opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-blue-600">Next Operation:</div>
                  <div>
                    {new Date(nextOperation.scheduleddate).toLocaleDateString()} •{" "}
                    {new Date(nextOperation.scheduleddate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="truncate">
                    {nextOperation.operationname}
                  </div>
                </div>
              ) : (
                <div className="text-sm opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-gray-500">No operation scheduled</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/doctor/notifications`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">Notifications ({patients.length})</div>
               <div className="text-sm opacity-90 mt-1">Alerts & updates</div>
              {urgentReferrals.length > 0 && (
                <div className="text-sm opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-red-600">Urgent Referrals:</div>
                  <div className="truncate">
                    {urgentReferrals[0].patientName} • {urgentReferrals[0].physician_department}
                  </div>
                  <div className="text-xs opacity-75">
                    Referred by: {urgentReferrals[0].referred_by}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/staff`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">Contacts ({staff.length})</div>
              <div className="text-sm opacity-90 mt-1">
                {doctorsCount} doctors • {nursesCount} nurses
              </div>
            </div>
          </CardContent>
        </Card>

        {/* To-do */}
        <Card
          className={cardBaseClasses}
          onClick={() => router.push(`/d/${workspaceid}/doctor/todos`)}
        >
          <CardContent className="flex items-center justify-center py-6 text-center">
            <div>
              <div className="text-lg font-semibold mb-4">To do ({todos.length})</div>
              <div className="text-sm opacity-90 mt-1">
                <span className="text-orange-600">
                  {todos.filter((t) => !t.completed).length} active
                </span>
                {" • "}
                {todos.filter((t) => t.completed).length} completed
              </div>
              {nextHighPriorityTodo && (
                <div className="text-sm opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-red-600">Next High Priority:</div>
                  <div className="truncate">
                    {nextHighPriorityTodo.title}
                  </div>
                  {nextHighPriorityTodo.duedate && (
                    <div>
                      Due: {new Date(nextHighPriorityTodo.duedate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

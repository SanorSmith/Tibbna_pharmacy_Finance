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
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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
  gender?: string | null;
  createdat?: string | null;
  lastvisit?: string | null;
  chronicconditions?: string[];
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
  anesthesiatype?: string | null;
  operationdiagnosis?: string | null;
  preoperativeassessment?: string | null;
  operationdetails?: string | null;
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

  // Fetch doctor referrals
  const { data: doctorReferrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ["doctor-referrals", workspaceid],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/d/${workspaceid}/doctor/referrals`);
        if (res.ok) {
          const data = await res.json();
          return {
            incomingReferrals: (data.incomingReferrals as Record<string, unknown>[]) || [],
            outgoingReferrals: (data.outgoingReferrals as Record<string, unknown>[]) || [],
          };
        }
        return { incomingReferrals: [], outgoingReferrals: [] };
      } catch (error) {
        console.error("Error fetching doctor referrals:", error);
        return { incomingReferrals: [], outgoingReferrals: [] };
      }
    },
  });

  // Calculate overdue patients (90+ days since last visit)
  const overduePatients = useMemo(() => {
    return patients.filter((p) => {
      if (!p.lastvisit) return true; // Never visited
      const lastVisit = new Date(p.lastvisit);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return lastVisit < ninetyDaysAgo;
    }).length;
  }, [patients]);

  // Calculate total referrals
  const totalReferrals = useMemo(() => {
    const incomingReferrals = doctorReferrals?.incomingReferrals || [];
    const outgoingReferrals = doctorReferrals?.outgoingReferrals || [];
    return incomingReferrals.length + outgoingReferrals.length;
  }, [doctorReferrals]);

  // Calculate total notifications
  const totalNotifications = overduePatients + totalReferrals;

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

  
  // Chart data calculations
  const weeklyVisitsData = useMemo(() => {
    const today = new Date();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize data for the past 7 days
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = daysOfWeek[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];
      
      // Count appointments for this day
      const dayAppointments = allAppointments.filter(appt => {
        const apptDate = new Date(appt.starttime).toISOString().split('T')[0];
        return apptDate === dateStr && appt.status !== 'cancelled';
      }).length;
      
      // Count new registrations for this day
      const dayRegistrations = patients.filter(p => {
        if (!p.createdat) return false;
        const createdDate = new Date(p.createdat).toISOString().split('T')[0];
        return createdDate === dateStr;
      }).length;
      
      // Count gender breakdown for appointments this day
      let dayMaleAppointments = 0;
      let dayFemaleAppointments = 0;
      
      allAppointments.forEach(appt => {
        const apptDate = new Date(appt.starttime).toISOString().split('T')[0];
        if (apptDate === dateStr && appt.status !== 'cancelled') {
          const patient = patients.find(p => p.patientid === appt.patientid);
          if (patient?.gender?.toLowerCase() === 'male') {
            dayMaleAppointments++;
          } else if (patient?.gender?.toLowerCase() === 'female') {
            dayFemaleAppointments++;
          }
        }
      });
      
      weekData.push({
        name: dayName,
        date: dateStr,
        appointments: dayAppointments,
        registrations: dayRegistrations,
        male: dayMaleAppointments,
        female: dayFemaleAppointments,
        total: dayAppointments + dayRegistrations
      });
    }
    
    return weekData;
  }, [patients, allAppointments]);

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
              <div className="text-xl font-semibold mb-2">Appointments ({allAppointments.length})</div>
              <div className="text-base opacity-90 mt-2">{todayAppointments.length} today - {upcomingAppointments.length} upcoming</div>
              {nextAppointment && (
                <div className="text-base opacity-90 mt-2 border-t pt-2">
                  <div className="font-medium text-card-smtext">Next appointment:</div>
                  <div className="truncate text-card-smtext">
                    {new Date(nextAppointment.starttime).toLocaleDateString()} at{" "}
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
              <div className="text-xl font-semibold mb-2">Patients ({patients.length})</div>
              
              {/* Mini Weekly Activity Chart */}
              <div className="mt-4">
                <div className="text-sm font-medium text-card-smtext mb-2">Weekly Activity</div>
                <ChartContainer 
                  config={{
                    appointments: { label: "Appointments", color: "#3b82f6" },
                    registrations: { label: "New Reg.", color: "#8b5cf6" },
                    male: { label: "Male", color: "#16a34a" },
                    female: { label: "Female", color: "#dc2626" },
                  }} 
                  className="h-40"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyVisitsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="appointments" fill="#3b82f6" name="Appointments" />
                      <Bar dataKey="registrations" fill="#8b5cf6" name="New Reg." />
                      <Bar dataKey="male" fill="#16a34a" name="Male" />
                      <Bar dataKey="female" fill="#dc2626" name="Female" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
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
              <div className="text-xl font-semibold mb-2">Operations ({operations.length})</div>
              <div className="text-lg opacity-90 mt-1">
                {operations.filter((o) => o.status === "scheduled").length}{" "}
                scheduled •{" "}
                {operations.filter((o) => o.status === "in_progress").length} in
                progress
              </div>
              {nextOperation ? (
                <div className="text-base opacity-90 mt-2 border-t pt-2">
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
                <div className="text-base opacity-90 mt-2 border-t pt-2">
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
              <div className="text-xl font-semibold mb-2">Notifications</div>
              <div className={`text-3xl font-bold ${totalNotifications > 0 ? 'text-red-600' : ''}`}>
                {totalNotifications}
              </div>
              <div className="text-base opacity-90 mt-1">
                {totalNotifications === 0 ? 'No notifications' : 
                 totalNotifications === 1 ? '1 notification' : 
                 `${totalNotifications} notifications`}
              </div>
              <div className="text-xs opacity-75 mt-2">
                {overduePatients > 0 && `${overduePatients} overdue${overduePatients === 1 ? ' patient' : ' patients'}`}
                {overduePatients > 0 && totalReferrals > 0 && ' • '}
                {totalReferrals > 0 && `${totalReferrals} referral${totalReferrals === 1 ? '' : 's'}`}
                {overduePatients === 0 && totalReferrals === 0 && 'All caught up!'}
              </div>
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
              <div className="text-xl font-semibold mb-2">Contacts ({staff.length})</div>
              <div className="text-lg opacity-90 mt-1">
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
              <div className="text-xl font-semibold mb-2">To do ({todos.length})</div>
              <div className="text-lg opacity-90 mt-1">
                <span className="text-orange-600">
                  {todos.filter((t) => !t.completed).length} active
                </span>
                {" • "}
                {todos.filter((t) => t.completed).length} completed
              </div>
              {nextHighPriorityTodo && (
                <div className="text-base opacity-90 mt-2 border-t pt-2">
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

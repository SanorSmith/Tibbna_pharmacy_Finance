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
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // For counts
  const [operations, setOperations] = useState<Operation[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, workspaceid, doctorid]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load appointments for selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [allApptsRes, operationsRes, todosRes, patientsRes, staffRes] = await Promise.all([
        fetch(
          `/api/d/${workspaceid}/doctor/${doctorid}/appointments`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/d/${workspaceid}/operations?surgeonid=${doctorid}`,
          { cache: "no-store" }
        ),
        fetch(`/api/d/${workspaceid}/todos`, { cache: "no-store" }),
        fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" }),
        fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" }),
      ]);

      if (!allApptsRes.ok || !patientsRes.ok) {
        throw new Error("Failed to load data");
      }

      const allApptsData = allApptsRes.ok ? await allApptsRes.json() : { appointments: [] };
      const operationsData = operationsRes.ok ? await operationsRes.json() : { operations: [] };
      const todosData = todosRes.ok ? await todosRes.json() : { todos: [] };
      const patientsData = await patientsRes.json();
      const staffData = staffRes.ok ? await staffRes.json() : { staff: [] };

      setAllAppointments(allApptsData.appointments || []);
      setOperations(operationsData.operations || []);
      setTodos(todosData.todos || []);
      setPatients(patientsData.patients || []);
      setStaff(staffData.staff || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  
  // Use allAppointments for counts (not filtered by date)
  const todayAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return apptDate >= today && apptDate < tomorrow && a.status !== "cancelled";
    });
  }, [allAppointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return allAppointments.filter((a) => {
      const apptDate = new Date(a.starttime);
      return apptDate >= now && a.status === "scheduled";
    });
  }, [allAppointments]);

  
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

 const cardBaseClasses =
  "bg-[#618FF5] hover:bg-[#4F78D1] transition-colors cursor-pointer text-white";

return (
  <div className="space-y-4 mr-4 ml-4">
    {/* Quick Access Cards Grid */}
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* Appointments */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/appointments`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Appointments</div>
            <div className="text-2xl font-bold">{allAppointments.length}</div>
            <div className="text-xs opacity-90 mt-1">
              {todayAppointments.length} today • {upcomingAppointments.length} upcoming
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/patients`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Patients</div>
            <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-xs opacity-90 mt-1">In your care</div>
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/operations`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Operations</div>
            <div className="text-2xl font-bold">{operations.length}</div>
            <div className="text-xs opacity-90 mt-1">
              {operations.filter((o) => o.status === "scheduled").length} scheduled • {operations.filter((o) => o.status === "in_progress").length} in progress
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/notifications`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Notifications</div>
            <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-xs opacity-90 mt-1">Alerts & updates</div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/staff`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">Contacts</div>
            <div className="text-2xl font-bold">{staff.length}</div>
            <div className="text-xs opacity-90 mt-1">Staff members</div>
          </div>
        </CardContent>
      </Card>

      {/* To-do */}
      <Card
        className={cardBaseClasses}
        onClick={() => (window.location.href = `/d/${workspaceid}/doctor/todos`)}
      >
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div>
            <div className="text-lg font-semibold mb-4">To do</div>
            <div className="text-2xl font-bold">{todos.length}</div>
            <div className="text-xs opacity-90 mt-1">
              {todos.filter((t) => !t.completed).length} active • {todos.filter((t) => t.completed).length} completed
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  </div>
);

}

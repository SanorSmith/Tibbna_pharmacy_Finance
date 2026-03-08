/**
 * Client Component: DashboardContent
 * - Displays overview statistics for the administrator dashboard
 * - Fetches data from various endpoints
 */
"use client";
import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  Calendar,
  Building,
  TestTube,
  Pill,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  Trash2,
  Search,
  Settings,
  Shield,
  CreditCard,
  CheckSquare,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";

type DashboardStats = {
  patients: number;
  staff: number;
  appointments: number;
  departments: number;
  labs: number;
  pharmacies: number;
  todayAppointments: number;
  pendingAppointments: number;
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  email?: string | null;
  phone?: string | null;
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

export default function DashboardContent({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (patientsList.length > 0) {
      const query = searchQuery.toLowerCase();
      setFilteredPatients(
        patientsList.filter(
          (p) =>
            p.firstname.toLowerCase().includes(query) ||
            p.lastname.toLowerCase().includes(query) ||
            (p.nationalid && p.nationalid.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, patientsList]);

  async function handleDeletePatient() {
    if (!patientToDelete) return;

    try {
      setDeletingId(patientToDelete.patientid);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientToDelete.patientid}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        // Remove from list
        setPatientsList((prev) =>
          prev.filter((p) => p.patientid !== patientToDelete.patientid)
        );
        // Update stats count
        setStats((prev) =>
          prev ? { ...prev, patients: prev.patients - 1 } : null
        );
      } else {
        alert("Failed to delete patient");
      }
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Error deleting patient");
    } finally {
      setDeletingId(null);
      setPatientToDelete(null);
    }
  }

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetched.current) return;

    async function fetchStats() {
      try {
        hasFetched.current = true;
        // Fetch all data in parallel
        const [
          patientsRes,
          staffRes,
          appointmentsRes,
          departmentsRes,
          labsRes,
          pharmaciesRes,
          todosRes,
        ] = await Promise.all([
          fetch(`/api/d/${workspaceid}/patients`),
          fetch(`/api/d/${workspaceid}/staff`),
          fetch(`/api/d/${workspaceid}/appointments`),
          fetch(`/api/d/${workspaceid}/departments`),
          fetch(`/api/d/${workspaceid}/labs`),
          fetch(`/api/d/${workspaceid}/pharmacies`),
          fetch(`/api/d/${workspaceid}/todos`),
        ]);

        const [patients, staff, appointments, departments, labs, pharmacies, todosData] =
          await Promise.all([
            patientsRes.json(),
            staffRes.json(),
            appointmentsRes.json(),
            departmentsRes.json(),
            labsRes.json(),
            pharmaciesRes.json(),
            todosRes.json(),
          ]);

        // Calculate today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments =
          appointments.appointments?.filter((apt: { starttime: string }) => {
            const aptDate = new Date(apt.starttime);
            return aptDate >= today && aptDate < tomorrow;
          }).length || 0;

        const pendingAppointments =
          appointments.appointments?.filter(
            (apt: { status: string }) => apt.status === "scheduled"
          ).length || 0;

        setStats({
          patients: patients.patients?.length || 0,
          staff: staff.staff?.length || 0,
          appointments: appointments.appointments?.length || 0,
          departments: departments.departments?.length || 0,
          labs: labs.labs?.length || 0,
          pharmacies: pharmacies.pharmacies?.length || 0,
          todayAppointments,
          pendingAppointments,
        });

        const pList = patients.patients || [];
        setPatientsList(pList);
        setFilteredPatients(pList);
        
        // Set todos
        const todosList = todosData.todos || [];
        setTodos(todosList);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [workspaceid]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
    );
  }

  if (!stats) {
    return (
      <p className="text-sm text-destructive">Failed to load dashboard data.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.patients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Staff Members
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.staff}</div>
              <p className="text-xs text-muted-foreground mt-1">Active staff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.appointments}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active departments
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Today&apos;s Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Appointments
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.todayAppointments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Appointments
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pendingAppointments}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting check-in
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                System Status
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground mt-1">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Facilities Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Laboratories
              </CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.labs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lab facilities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pharmacies</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pharmacies}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pharmacy locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                +{stats.patients + stats.staff}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total registrations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Manage Patients</CardTitle>
              <CardDescription>View and edit patient records</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/patients`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Users className="h-4 w-4 mr-2" />
                  Go to Patients
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Other quick actions... */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Manage Staff</CardTitle>
              <CardDescription>Add or edit staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/staff`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Go to Staff
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">View Appointments</CardTitle>
              <CardDescription>Manage all appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/appointments`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Calendar className="h-4 w-4 mr-2" />
                  Go to Appointments
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Departments</CardTitle>
              <CardDescription>Manage hospital departments</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/departments`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Building className="h-4 w-4 mr-2" />
                  Go to Departments
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Laboratories</CardTitle>
              <CardDescription>Manage lab facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/lab`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <TestTube className="h-4 w-4 mr-2" />
                  Go to Labs
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Pharmacies</CardTitle>
              <CardDescription>Manage pharmacy locations</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/pharmacy`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Pill className="h-4 w-4 mr-2" />
                  Go to Pharmacies
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Lab Management</CardTitle>
              <CardDescription>Laboratory inventory and equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/lab-management`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Inventory
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Insurance</CardTitle>
              <CardDescription>Insurance verification and claims</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/insurance`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Insurance
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Billing</CardTitle>
              <CardDescription>Billing and payment processing</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/billing`}>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Todos</CardTitle>
              <CardDescription>Manage tasks and to-do items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{todos.filter(t => !t.completed).length} active</span>
                  <span>{todos.filter(t => t.completed).length} completed</span>
                </div>
                <Link href={`/d/${workspaceid}/todos`}>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 ">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Manage Todos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Patient Management Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Patient Management</CardTitle>
                <CardDescription>
                  View and manage all patients in the system
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>National ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.patientid}>
                        <TableCell className="font-medium">
                          {patient.firstname}{" "}
                          {patient.middlename ? patient.middlename + " " : ""}
                          {patient.lastname}
                        </TableCell>
                        <TableCell>{patient.nationalid || "N/A"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {patient.email && <div>{patient.email}</div>}
                            {patient.phone && (
                              <div className="text-muted-foreground">
                                {patient.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setPatientToDelete(patient)}
                            disabled={deletingId === patient.patientid}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Showing {filteredPatients.length} of {patientsList.length}{" "}
              patients
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!patientToDelete}
        onOpenChange={(open) => !open && setPatientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the patient{" "}
              <strong>
                {patientToDelete?.firstname} {patientToDelete?.lastname}
              </strong>{" "}
              from the database and their OpenEHR record. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleDeletePatient();
              }}
              disabled={!!deletingId}
            >
              {deletingId ? "Deleting..." : "Delete Patient"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Client Component: DashboardContent
 * - Displays overview statistics for the administrator dashboard
 * - Fetches data from various endpoints
 */
"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle
} from "lucide-react";
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

export default function DashboardContent({ workspaceid }: { workspaceid: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetched.current) return;
    
    async function fetchStats() {
      try {
        hasFetched.current = true;
        // Fetch all data in parallel
        const [patientsRes, staffRes, appointmentsRes, departmentsRes, labsRes, pharmaciesRes] = await Promise.all([
          fetch(`/api/d/${workspaceid}/patients`),
          fetch(`/api/d/${workspaceid}/staff`),
          fetch(`/api/d/${workspaceid}/appointments`),
          fetch(`/api/d/${workspaceid}/departments`),
          fetch(`/api/d/${workspaceid}/labs`),
          fetch(`/api/d/${workspaceid}/pharmacies`),
        ]);

        const [patients, staff, appointments, departments, labs, pharmacies] = await Promise.all([
          patientsRes.json(),
          staffRes.json(),
          appointmentsRes.json(),
          departmentsRes.json(),
          labsRes.json(),
          pharmaciesRes.json(),
        ]);

        // Calculate today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = appointments.appointments?.filter((apt: { starttime: string }) => {
          const aptDate = new Date(apt.starttime);
          return aptDate >= today && aptDate < tomorrow;
        }).length || 0;

        const pendingAppointments = appointments.appointments?.filter((apt: { status: string }) => 
          apt.status === "scheduled"
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
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [workspaceid]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-destructive">Failed to load dashboard data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
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
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.staff}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active staff
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.appointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
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
              <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Appointments</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting check-in
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
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
              <CardTitle className="text-sm font-medium">Laboratories</CardTitle>
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
              <div className="text-2xl font-bold">+{stats.patients + stats.staff}</div>
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
                <Button className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Go to Patients
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Manage Staff</CardTitle>
              <CardDescription>Add or edit staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/d/${workspaceid}/staff`}>
                <Button className="w-full">
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
                <Button className="w-full">
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
                <Button className="w-full" variant="outline">
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
                <Button className="w-full" variant="outline">
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
                <Button className="w-full" variant="outline">
                  <Pill className="h-4 w-4 mr-2" />
                  Go to Pharmacies
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

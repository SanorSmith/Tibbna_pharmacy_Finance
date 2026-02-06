"use client";

import {
  ChevronRight,
  Calendar,
  Users,
  FileText,
  Stethoscope,
  TestTube,
  Pill,
  ClipboardList,
  UserCheck,
  Activity,
  Heart,
  Microscope,
  FlaskConical,
  Package,
  ShoppingCart,
  Settings,
  BarChart3,
  FileSearch,
  Home,
  LayoutDashboard,
  Scissors,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/hooks/use-workspace";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Define types for workspace and role combinations
type WorkspaceType = "hospital" | "laboratory" | "pharmacy";
type WorkspaceRole = "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist" | "administrator";

type MenuItem = {
  title: string;
  url: string;
  icon?: React.ComponentType;
  items?: { title: string; url: string }[];
  isActive?: boolean;
};

type NavigationConfig = {
  [K in WorkspaceType]: {
    [R in WorkspaceRole]: MenuItem[];
  };
};

export function NavMain() {
  const { ttt } = useLanguage();
  const { workspace } = useWorkspace();
  const pathname = usePathname();
  const base = workspace?.workspace?.workspaceid
    ? `/d/${workspace.workspace.workspaceid}`
    : "/d";

  // Helper function to check if a menu item is active
  const isMenuItemActive = (item: MenuItem): boolean => {
    // Exact match for the main URL
    if (pathname === item.url) return true;
    
    // Check if any sub-item matches
    if (item.items) {
      return item.items.some(subItem => pathname === subItem.url || pathname.startsWith(subItem.url + '/'));
    }
    
    // Check if pathname starts with item URL (for nested routes)
    return pathname.startsWith(item.url + '/');
  };

  // Comprehensive navigation configuration for all workspace + role combinations
  const navigationConfig: NavigationConfig = {
    hospital: {
      doctor: [
        {
          title: ttt("Dashboard"),
          url: `${base}/doctor`,
          icon: Home,
          isActive: true,
        },
        {
          title: "Appointments",
          url: `${base}/schedule`,
          icon: Calendar,
        },
        {
          title: ttt("Patients"),
          url: `${base}/patients`,
          icon: Users,
        },
        {
          title: "Operations",
          url: `${base}/operations`,
          icon: Scissors,
        },
        /* {
          title: ttt("Medical Records"),
          url: "/d/records",
          icon: FileText,
          items: [
            { title: ttt("View Records"), url: "/d/records" },
            { title: ttt("Create Record"), url: "/d/records/new" },
            { title: ttt("Lab Results"), url: "/d/records/lab-results" },
          ],
        }, */
        {
          title: ttt("Prescriptions"),
          url: "/d/prescriptions",
          icon: Pill,
          items: [
            { title: ttt("Write Prescription"), url: "/d/prescriptions/new" },
            {
              title: ttt("Prescription History"),
              url: "/d/prescriptions/history",
            },
            { title: ttt("Drug Database"), url: "/d/prescriptions/drugs" },
          ],
        },
        {
          title: ttt("Diagnostics"),
          url: "/d/diagnostics",
          icon: Stethoscope,
          items: [
            { title: ttt("Order Tests"), url: "/d/diagnostics/order" },
            { title: ttt("View Results"), url: "/d/diagnostics/results" },
            { title: ttt("Imaging"), url: "/d/diagnostics/imaging" },
          ],
        },
       /*  {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        }, */
      ],
      nurse: [
        {
          title: "Book Appointment",
          url: `${base}/schedule`,
          icon: Calendar,
          isActive: true,
        },
        {
          title: ttt("Patients"),
          url: `${base}/patients`,
          icon: Users,
          items: [
            { title: ttt("Patient List"), url: `${base}/patients` },
            { title: ttt("Vital Signs"), url: `${base}/patients/vitals` },
            { title: ttt("Medication Admin"), url: `${base}/patients/medications` },
          ],
        },
        {
          title: ttt("Care Plans"),
          url: "/d/care-plans",
          icon: ClipboardList,
          items: [
            { title: ttt("Active Plans"), url: "/d/care-plans" },
            { title: ttt("Create Plan"), url: "/d/care-plans/new" },
            { title: ttt("Progress Notes"), url: "/d/care-plans/notes" },
          ],
        },
        {
          title: ttt("Monitoring"),
          url: "/d/monitoring",
          icon: Activity,
          items: [
            { title: ttt("Patient Monitoring"), url: "/d/monitoring/patients" },
            { title: ttt("Alerts"), url: "/d/monitoring/alerts" },
            { title: ttt("Rounds"), url: "/d/monitoring/rounds" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      receptionist: [
        {
          title: ttt("Appointments"),
          url: "/d/appointments",
          icon: Calendar,
          isActive: true,
          items: [
            {
              title: ttt("Today's Appointments"),
              url: "/d/appointments/today",
            },
            { title: ttt("Schedule Appointment"), url: "/d/appointments/new" },
            { title: ttt("Calendar View"), url: "/d/appointments/calendar" },
          ],
        },
        {
          title: ttt("Patients"),
          url: `${base}/patients`,
          icon: Users,
          items: [
            { title: ttt("Patient List"), url: `${base}/patients` },
            { title: ttt("Check-in"), url: `${base}/patients/checkin` },
          ],
        },
        {
          title: ttt("Billing"),
          url: "/d/billing",
          icon: FileText,
          items: [
            { title: ttt("Generate Invoice"), url: "/d/billing/invoice" },
            { title: ttt("Payment Processing"), url: "/d/billing/payments" },
            { title: ttt("Insurance Claims"), url: "/d/billing/insurance" },
          ],
        },
        {
          title: ttt("Reports"),
          url: "/d/reports",
          icon: BarChart3,
          items: [
            { title: ttt("Daily Reports"), url: "/d/reports/daily" },
            { title: ttt("Patient Flow"), url: "/d/reports/flow" },
            { title: ttt("Revenue Reports"), url: "/d/reports/revenue" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      administrator: [
        {
          title: ttt("Dashboard"),
          url: `${base}/dashboard`,
          icon: LayoutDashboard,
        },
        {
          title: ttt("Appointments"),
          url: `${base}/schedule`,
          icon: Calendar,
          isActive: true,
          items: [
            { title: "Book Appointment", url: `${base}/schedule` },
            { title: ttt("All Appointments"), url: `${base}/appointments` },
            { title: ttt("Calendar View"), url: `${base}/appointments/calendar` },
          ],
        },
        {
          title: "Operative Procedures",
          url: `${base}/operations`,
          icon: Scissors,
        },
        {
          title: ttt("Patients"),
          url: `${base}/patients`,
          icon: Users,
          items: [
            { title: ttt("Patient List"), url: `${base}/patients` },
            { title: ttt("Patient Records"), url: `${base}/patients/records` },
          ],
        },
        {
          title: ttt("Staff Management"),
          url: `${base}/staff`,
          icon: UserCheck,
          items: [
            { title: ttt("Staff List"), url: `${base}/staff` },
            { title: "Staff Schedules", url: `${base}/staff/schedules` },
            { title: ttt("Roles & Permissions"), url: `${base}/staff/roles` },
          ],
        },
        {
          title: ttt("Pharmacy"),
          url: `${base}/pharmacy`,
          icon: Pill,
        },
        {
          title: ttt("Lab"),
          url: `${base}/lab`,
          icon: TestTube,
        },
        {
          title: ttt("Department"),
          url: `${base}/departments`,
          icon: Heart,
          items: [
            { title: ttt("All Departments"), url: `${base}/departments` },
            { title: ttt("Resources"), url: `${base}/departments/resources` },
            { title: ttt("Staff Assignment"), url: `${base}/departments/staff` },
          ],
        },
        {
          title: ttt("Insurance"),
          url: `${base}/insurance`,
          icon: ClipboardList,
          items: [
            { title: ttt("Insurance Plans"), url: `${base}/insurance/plans` },
            { title: ttt("Claims"), url: `${base}/insurance/claims` },
            { title: ttt("Verification"), url: `${base}/insurance/verification` },
            { title: ttt("Providers"), url: `${base}/insurance/providers` },
          ],
        },
        {
          title: ttt("Billing"),
          url: `${base}/billing`,
          icon: FileText,
          items: [
            { title: ttt("Invoices"), url: `${base}/billing/invoices` },
            { title: ttt("Payments"), url: `${base}/billing/payments` },
            { title: ttt("Reports"), url: `${base}/billing/reports` },
            { title: ttt("Outstanding"), url: `${base}/billing/outstanding` },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      lab_technician: [
        {
          title: ttt("Dashboard"),
          url: `${base}/lab-tech`,
          icon: Home,
          isActive: true,
        },
        {
          title: ttt("Lab Orders"),
          url: "/d/orders",
          icon: TestTube,
          items: [
            { title: ttt("Pending Orders"), url: "/d/orders/pending" },
            { title: ttt("In Progress"), url: "/d/orders/progress" },
            { title: ttt("Completed"), url: "/d/orders/completed" },
          ],
        },
        {
          title: "Sample Processing",
          url: "/d/samples",
          icon: TestTube,
          items: [
            { title: "Sample Queue", url: "/d/samples/queue" },
            { title: "Processing Status", url: "/d/samples/status" },
            { title: "Quality Checks", url: "/d/samples/quality" },
          ],
        },
        {
          title: "Results Entry",
          url: "/d/results",
          icon: FileSearch,
          items: [
            { title: "Enter Results", url: "/d/results/enter" },
            { title: "Review Results", url: "/d/results/review" },
            { title: ttt("Critical Values"), url: "/d/results/critical" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      pharmacist: [
        {
          title: "Pharmacy Orders",
          url: `${base}/pharmacy/orders`,
          icon: Pill,
          isActive: true,
        },
        {
          title: ttt("Prescriptions"),
          url: "/d/prescriptions",
          icon: ClipboardList,
          items: [
            { title: "Review Prescriptions", url: "/d/prescriptions/review" },
            { title: ttt("Drug Interactions"), url: "/d/prescriptions/interactions" },
            { title: "Patient Counseling", url: "/d/prescriptions/counseling" },
          ],
        },
        {
          title: "Medication Management",
          url: "/d/medications",
          icon: Package,
          items: [
            { title: ttt("Inventory"), url: "/d/medications/inventory" },
            { title: ttt("Stock Levels"), url: "/d/medications/stock" },
            { title: ttt("Expiry Tracking"), url: "/d/medications/expiry" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
    },
    laboratory: {
      doctor: [
        {
          title: ttt("Lab Orders"),
          url: "/d/orders",
          icon: TestTube,
          isActive: true,
          items: [
            { title: ttt("Pending Orders"), url: "/d/orders/pending" },
            { title: ttt("In Progress"), url: "/d/orders/progress" },
            { title: ttt("Completed"), url: "/d/orders/completed" },
          ],
        },
        {
          title: ttt("Results Review"),
          url: "/d/results",
          icon: FileSearch,
          items: [
            { title: ttt("Pending Review"), url: "/d/results/pending" },
            { title: ttt("Approved Results"), url: "/d/results/approved" },
            { title: ttt("Critical Values"), url: "/d/results/critical" },
          ],
        },
        {
          title: ttt("Quality Control"),
          url: "/d/quality",
          icon: FlaskConical,
          items: [
            { title: ttt("QC Results"), url: "/d/quality/results" },
            { title: ttt("Calibration"), url: "/d/quality/calibration" },
            { title: ttt("Maintenance"), url: "/d/quality/maintenance" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      nurse: [
        {
          title: ttt("Sample Collection"),
          url: "/d/samples",
          icon: TestTube,
          isActive: true,
          items: [
            { title: ttt("Collection Schedule"), url: "/d/samples/schedule" },
            { title: ttt("Sample Tracking"), url: "/d/samples/tracking" },
            {
              title: ttt("Collection Guidelines"),
              url: "/d/samples/guidelines",
            },
          ],
        },
        {
          title: ttt("Patient Preparation"),
          url: "/d/preparation",
          icon: Users,
          items: [
            {
              title: ttt("Pre-test Instructions"),
              url: "/d/preparation/instructions",
            },
            {
              title: ttt("Patient Education"),
              url: "/d/preparation/education",
            },
            { title: ttt("Consent Forms"), url: "/d/preparation/consent" },
          ],
        },
        {
          title: ttt("Lab Results"),
          url: "/d/results",
          icon: FileText,
          items: [
            { title: ttt("View Results"), url: "/d/results" },
            {
              title: ttt("Patient Communication"),
              url: "/d/results/communication",
            },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      receptionist: [
        {
          title: ttt("Appointments"),
          url: "/d/appointments",
          icon: Calendar,
          isActive: true,
          items: [
            { title: ttt("Lab Appointments"), url: "/d/appointments" },
            { title: ttt("Walk-in Queue"), url: "/d/appointments/walkin" },
            { title: ttt("Sample Drop-off"), url: "/d/appointments/dropoff" },
          ],
        },
        {
          title: ttt("Patient Registration"),
          url: "/d/patients",
          icon: Users,
          items: [
            { title: ttt("Register Patient"), url: "/d/patients/register" },
            { title: ttt("Update Information"), url: "/d/patients/update" },
            {
              title: ttt("Insurance Verification"),
              url: "/d/patients/insurance",
            },
          ],
        },
        {
          title: ttt("Billing & Reports"),
          url: "/d/billing",
          icon: FileText,
          items: [
            { title: ttt("Test Billing"), url: "/d/billing/tests" },
            { title: ttt("Insurance Claims"), url: "/d/billing/claims" },
            { title: ttt("Daily Reports"), url: "/d/billing/reports" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      administrator: [
        {
          title: ttt("Lab Management"),
          url: "/d/management",
          icon: Microscope,
          isActive: true,
          items: [
            { title: ttt("Equipment Status"), url: "/d/management/equipment" },
            { title: ttt("Inventory"), url: "/d/management/inventory" },
            {
              title: ttt("Workflow Optimization"),
              url: "/d/management/workflow",
            },
          ],
        },
        {
          title: ttt("Staff & Scheduling"),
          url: "/d/staff",
          icon: UserCheck,
          items: [
            { title: ttt("Staff Management"), url: `${base}/staff` },
            { title: ttt("Shift Scheduling"), url: "/d/staff/shifts" },
            { title: ttt("Competency Tracking"), url: "/d/staff/competency" },
          ],
        },
        {
          title: ttt("Analytics"),
          url: "/d/analytics",
          icon: BarChart3,
          items: [
            { title: ttt("Turnaround Times"), url: "/d/analytics/turnaround" },
            { title: ttt("Test Volume"), url: "/d/analytics/volume" },
            { title: ttt("Quality Metrics"), url: "/d/analytics/quality" },
          ],
        },
        {
          title: ttt("Admin Panel"),
          url: "/d/admin",
          icon: Settings,
        },
      ],
      lab_technician: [
        {
          title: ttt("Lab Orders"),
          url: "/d/orders",
          icon: TestTube,
          isActive: true,
          items: [
            { title: ttt("Pending Orders"), url: "/d/orders/pending" },
            { title: ttt("In Progress"), url: "/d/orders/progress" },
            { title: ttt("Completed"), url: "/d/orders/completed" },
          ],
        },
        {
          title: "Sample Processing",
          url: "/d/samples",
          icon: TestTube,
          items: [
            { title: "Sample Queue", url: "/d/samples/queue" },
            { title: "Processing Status", url: "/d/samples/status" },
            { title: "Quality Checks", url: "/d/samples/quality" },
          ],
        },
        {
          title: "Results Entry",
          url: "/d/results",
          icon: FileSearch,
          items: [
            { title: "Enter Results", url: "/d/results/enter" },
            { title: "Review Results", url: "/d/results/review" },
            { title: ttt("Critical Values"), url: "/d/results/critical" },
          ],
        },
        {
          title: ttt("Quality Control"),
          url: "/d/quality",
          icon: FlaskConical,
          items: [
            { title: ttt("QC Results"), url: "/d/quality/results" },
            { title: ttt("Calibration"), url: "/d/quality/calibration" },
            { title: ttt("Maintenance"), url: "/d/quality/maintenance" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      pharmacist: [
        {
          title: ttt("Lab Results"),
          url: "/d/results",
          icon: FileSearch,
          isActive: true,
          items: [
            { title: "Review Results", url: "/d/results/review" },
            { title: ttt("Approved Results"), url: "/d/results/approved" },
            { title: ttt("Critical Values"), url: "/d/results/critical" },
          ],
        },
        {
          title: ttt("Quality Control"),
          url: "/d/quality",
          icon: FlaskConical,
          items: [
            { title: ttt("QC Results"), url: "/d/quality/results" },
            { title: ttt("Calibration"), url: "/d/quality/calibration" },
            { title: ttt("Maintenance"), url: "/d/quality/maintenance" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
    },
    pharmacy: {
      doctor: [
        {
          title: ttt("Prescription Review"),
          url: "/d/prescriptions",
          icon: Pill,
          isActive: true,
          items: [
            { title: ttt("Pending Review"), url: "/d/prescriptions/pending" },
            {
              title: ttt("Drug Interactions"),
              url: "/d/prescriptions/interactions",
            },
            {
              title: ttt("Clinical Guidelines"),
              url: "/d/prescriptions/guidelines",
            },
          ],
        },
        {
          title: ttt("Patient Consultation"),
          url: "/d/consultation",
          icon: Users,
          items: [
            {
              title: ttt("Medication Counseling"),
              url: "/d/consultation/counseling",
            },
            {
              title: ttt("Therapy Management"),
              url: "/d/consultation/therapy",
            },
            { title: ttt("Adverse Events"), url: "/d/consultation/adverse" },
          ],
        },
        {
          title: ttt("Drug Information"),
          url: "/d/drugs",
          icon: FileSearch,
          items: [
            { title: ttt("Drug Database"), url: "/d/drugs/database" },
            { title: ttt("Formulary"), url: "/d/drugs/formulary" },
            { title: ttt("Clinical Studies"), url: "/d/drugs/studies" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      nurse: [
        {
          title: ttt("Medication Administration"),
          url: "/d/medications",
          icon: Pill,
          isActive: true,
          items: [
            {
              title: ttt("Patient Medications"),
              url: "/d/medications/patients",
            },
            {
              title: ttt("Administration Records"),
              url: "/d/medications/records",
            },
            {
              title: ttt("Medication Reconciliation"),
              url: "/d/medications/reconciliation",
            },
          ],
        },
        {
          title: ttt("Patient Education"),
          url: "/d/education",
          icon: Users,
          items: [
            {
              title: ttt("Medication Instructions"),
              url: "/d/education/instructions",
            },
            { title: ttt("Side Effects"), url: "/d/education/sideeffects" },
            {
              title: ttt("Compliance Monitoring"),
              url: "/d/education/compliance",
            },
          ],
        },
        {
          title: ttt("Inventory Support"),
          url: "/d/inventory",
          icon: Package,
          items: [
            { title: ttt("Stock Levels"), url: "/d/inventory/stock" },
            { title: ttt("Expiry Tracking"), url: "/d/inventory/expiry" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      receptionist: [
        {
          title: "Prescription Processing",
          url: "/d/prescriptions",
          icon: FileText,
          isActive: true,
          items: [
            { title: ttt("New Prescriptions"), url: "/d/prescriptions/new" },
            { title: ttt("Refills"), url: "/d/prescriptions/refills" },
            {
              title: ttt("Insurance Verification"),
              url: "/d/prescriptions/insurance",
            },
          ],
        },
        {
          title: ttt("Customer Service"),
          url: "/d/customers",
          icon: Users,
          items: [
            {
              title: ttt("Customer Registration"),
              url: "/d/customers/register",
            },
            {
              title: ttt("Pickup Notifications"),
              url: "/d/customers/notifications",
            },
            { title: ttt("Payment Processing"), url: "/d/customers/payments" },
          ],
        },
        {
          title: ttt("Sales & Billing"),
          url: "/d/sales",
          icon: ShoppingCart,
          items: [
            { title: ttt("Point of Sale"), url: "/d/sales/pos" },
            { title: ttt("Insurance Claims"), url: "/d/sales/claims" },
            { title: ttt("Daily Reports"), url: "/d/sales/reports" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      administrator: [
        {
          title: ttt("Pharmacy Operations"),
          url: "/d/operations",
          icon: Package,
          isActive: true,
          items: [
            {
              title: "Inventory Management",
              url: "/d/operations/inventory",
            },
            {
              title: ttt("Supplier Relations"),
              url: "/d/operations/suppliers",
            },
            {
              title: ttt("Compliance Monitoring"),
              url: "/d/operations/compliance",
            },
          ],
        },
        {
          title: ttt("Staff Management"),
          url: "/d/staff",
          icon: UserCheck,
          items: [
            {
              title: ttt("Pharmacist Scheduling"),
              url: "/d/staff/pharmacists",
            },
            {
              title: ttt("Technician Management"),
              url: "/d/staff/technicians",
            },
            { title: ttt("Training Records"), url: "/d/staff/training" },
          ],
        },
        {
          title: ttt("Business Analytics"),
          url: "/d/analytics",
          icon: BarChart3,
          items: [
            { title: ttt("Sales Analytics"), url: "/d/analytics/sales" },
            { title: ttt("Prescription Trends"), url: "/d/analytics/trends" },
            { title: ttt("Financial Reports"), url: "/d/analytics/financial" },
          ],
        },
        {
          title: ttt("Admin Panel"),
          url: "/d/admin",
          icon: Settings,
        },
      ],
      lab_technician: [
        {
          title: "Prescription Processing",
          url: "/d/prescriptions",
          icon: Pill,
          isActive: true,
          items: [
            { title: "Process Prescriptions", url: "/d/prescriptions/process" },
            { title: "Compounding", url: "/d/prescriptions/compound" },
            { title: "Quality Check", url: "/d/prescriptions/quality" },
          ],
        },
        {
          title: "Inventory Management",
          url: "/d/inventory",
          icon: Package,
          items: [
            { title: "Stock Management", url: "/d/inventory/stock" },
            { title: ttt("Expiry Tracking"), url: "/d/inventory/expiry" },
            { title: "Supplier Orders", url: "/d/inventory/orders" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
      pharmacist: [
        {
          title: "Pharmacy Orders",
          url: `${base}/pharmacy/orders`,
          icon: Pill,
          isActive: true,
        },
        {
          title: ttt("Prescription Review"),
          url: "/d/prescriptions",
          icon: ClipboardList,
          items: [
            { title: ttt("Pending Review"), url: "/d/prescriptions/pending" },
            {
              title: ttt("Drug Interactions"),
              url: "/d/prescriptions/interactions",
            },
            {
              title: ttt("Clinical Guidelines"),
              url: "/d/prescriptions/guidelines",
            },
          ],
        },
        {
          title: ttt("Drug Information"),
          url: "/d/drugs",
          icon: FileSearch,
          items: [
            { title: ttt("Drug Database"), url: "/d/drugs/database" },
            { title: ttt("Formulary"), url: "/d/drugs/formulary" },
            { title: ttt("Clinical Studies"), url: "/d/drugs/studies" },
          ],
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ],
    },
  };

  // Get the navigation items for current workspace and role
  const getNavigationItems = (): MenuItem[] => {
    if (!workspace?.workspace.type || !workspace.role) {
      // Fallback navigation if workspace or role is not available
      return [
        {
          title: ttt("Dashboard"),
          url: "/d/dashboard",
          icon: BarChart3,
          isActive: true,
        },
        {
          title: ttt("Settings"),
          url: "/d/settings",
          icon: Settings,
        },
      ];
    }

    return navigationConfig[workspace.workspace.type][workspace.role] || [];
  };

  const navItems = [...getNavigationItems()];

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{ttt("Workspace")}</SidebarGroupLabel>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = isMenuItemActive(item);
            
            // Items without sub-items - direct links
            if (!item.items || item.items.length === 0) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            // Items with sub-items - collapsible
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild
                            isActive={pathname === subItem.url || pathname.startsWith(subItem.url + '/')}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

/**
 * Client Component: RolesTable
 * - Fetches staff data and displays roles with permissions in a table
 * - Shows role-based permissions for each staff member
 */
"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Stethoscope, 
  Heart, 
  TestTube, 
  Pill, 
  UserCircle,
  CheckCircle2
} from "lucide-react";

type Staff = {
  staffid: string;
  role: "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist";
  firstname: string;
  middlename?: string | null;
  lastname: string;
  unit?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
};

type WorkspaceUser = {
  userid: string;
  email: string;
  name: string | null;
  image: string | null;
  permissions: string[];
  role: "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist" | "administrator";
};

type CombinedMember = {
  id: string;
  name: string;
  email: string | null;
  role: "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist" | "administrator";
  unit?: string | null;
  specialty?: string | null;
  source: "staff" | "user";
  isAdmin?: boolean;
};

// Define permissions for each role
const rolePermissions: Record<CombinedMember["role"], string[]> = {
  doctor: [
    "View Patients",
    "Edit Patient Records",
    "Prescribe Medications",
    "Order Tests",
    "View Lab Results",
    "Create Diagnoses",
    "Schedule Appointments",
    "View Medical History",
  ],
  nurse: [
    "View Patients",
    "Update Vital Signs",
    "Administer Medications",
    "View Prescriptions",
    "Update Care Plans",
    "View Lab Results",
    "Schedule Appointments",
  ],
  lab_technician: [
    "View Test Orders",
    "Update Lab Results",
    "Manage Lab Equipment",
    "View Patient Lab History",
    "Generate Lab Reports",
  ],
  pharmacist: [
    "View Prescriptions",
    "Dispense Medications",
    "Manage Inventory",
    "Check Drug Interactions",
    "Update Medication Records",
    "Generate Pharmacy Reports",
  ],
  receptionist: [
    "Schedule Appointments",
    "View Patient List",
    "Check-in Patients",
    "Manage Billing",
    "Generate Invoices",
    "Process Payments",
  ],
  administrator: [
    "Full System Access",
    "Manage Users",
    "Manage Staff",
    "View All Records",
    "Edit All Records",
    "System Configuration",
    "Generate All Reports",
    "Manage Departments",
    "Manage Inventory",
    "Financial Management",
  ],
};

// Role display configuration
const roleConfig: Record<CombinedMember["role"], { label: string; icon: React.ElementType; color: string }> = {
  doctor: { label: "Doctor", icon: Stethoscope, color: "bg-blue-100 text-blue-800 border-blue-200" },
  nurse: { label: "Nurse", icon: Heart, color: "bg-pink-100 text-pink-800 border-pink-200" },
  lab_technician: { label: "Lab Technician", icon: TestTube, color: "bg-purple-100 text-purple-800 border-purple-200" },
  pharmacist: { label: "Pharmacist", icon: Pill, color: "bg-green-100 text-green-800 border-green-200" },
  receptionist: { label: "Receptionist", icon: UserCircle, color: "bg-orange-100 text-orange-800 border-orange-200" },
  administrator: { label: "Administrator", icon: Shield, color: "bg-red-100 text-red-800 border-red-200" },
};

export default function RolesTable({ workspaceid }: { workspaceid: string }) {
  const [members, setMembers] = useState<CombinedMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Fetch both staff and workspace users in parallel
        const [staffRes, usersRes] = await Promise.all([
          fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" }),
          fetch(`/api/d/${workspaceid}/users`, { cache: "no-store" }),
        ]);

        if (!staffRes.ok || !usersRes.ok) {
          throw new Error("Failed to load data");
        }

        const staffData = await staffRes.json();
        const usersData = await usersRes.json();

        if (!active) return;

        // Convert staff to combined format
        const staffMembers: CombinedMember[] = (staffData.staff as Staff[] || []).map((s) => ({
          id: s.staffid,
          name: `${s.firstname} ${s.middlename ? s.middlename + " " : ""}${s.lastname}`,
          email: s.email || null,
          role: s.role,
          unit: s.unit || null,
          specialty: s.specialty || null,
          source: "staff" as const,
        }));

        // Convert workspace users to combined format
        const userMembers: CombinedMember[] = (usersData.users as WorkspaceUser[] || []).map((u) => ({
          id: u.userid,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          source: "user" as const,
          isAdmin: u.permissions?.includes("admin"),
        }));

        // Combine and remove duplicates (prefer staff entries)
        const staffEmails = new Set(staffMembers.map(s => s.email?.toLowerCase()).filter(Boolean));
        const uniqueUsers = userMembers.filter(u => !staffEmails.has(u.email?.toLowerCase() || ""));
        
        setMembers([...staffMembers, ...uniqueUsers]);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load data";
        setError(msg);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [workspaceid]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (members === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">No members found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Member</TableHead>
            <TableHead className="w-[180px]">Role</TableHead>
            <TableHead className="w-[200px]">Unit/Department</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member: CombinedMember) => {
            const config = roleConfig[member.role];
            const Icon = config.icon;
            const permissions = rolePermissions[member.role];
            const isExpanded = expandedRow === member.id;

            return (
              <TableRow key={member.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.name}
                      {member.isAdmin && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                          Global Admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.email || "No contact"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${config.color} flex items-center gap-1 w-fit`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {member.unit || <span className="text-muted-foreground italic">Not assigned</span>}
                  </span>
                  {member.specialty && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {member.specialty}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isExpanded ? (
                    <div className="space-y-1">
                      {permissions.map((permission: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span>{permission}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {permissions.length} permissions
                      </Badge>
                      <button
                        onClick={() => setExpandedRow(member.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        View all
                      </button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isExpanded ? (
                    <button
                      onClick={() => setExpandedRow(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Collapse
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedRow(member.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Expand
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

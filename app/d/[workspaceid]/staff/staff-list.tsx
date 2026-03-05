/**
 * Client Component: StaffList
 * - Fetches staff from GET /api/d/[workspaceid]/staff and renders a table
 * - Shows loading, empty, and error states
 * - Administrators can add and edit staff
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Home, Plus } from "lucide-react";
import Link from "next/link";

type Staff = {
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

const roles = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "lab_technician", label: "Lab technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "receptionist", label: "Receptionist" },
] as const;

const departments = [
  "Outpatient Department",
  "ENT (Ear, Nose, Throat)",
  "Cardiology",
  "Neurology",
  "Maternity & Obstetrics",
  "Obstetrics & Gynecology",
  "Psychiatry & Mental Health",
  "Oncology",
  "Dermatology",
  "Ophthalmology",
  "Intensive Care Unit",
  "Operating Theaters",
  "Pharmacy",
  "Laboratory",
] as const;

export default function StaffList({ workspaceid, isAdmin }: { workspaceid: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(roles[0].value);
  const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["staff", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/staff`);
      if (!res.ok) throw new Error("Failed to load staff");
      const data = await res.json();
      return (data.staff as Staff[]) ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = editingStaff
        ? `/api/d/${workspaceid}/staff/${editingStaff.staffid}`
        : `/api/d/${workspaceid}/staff`;
      const method = editingStaff ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${editingStaff ? "update" : "register"} staff`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", workspaceid] });
      setDialogOpen(false);
      setEditingStaff(null);
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  function handleOpenAdd() {
    setEditingStaff(null);
    setSelectedRole(roles[0].value);
    setSelectedUnit(undefined);
    setFormError(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(staff: Staff) {
    setEditingStaff(staff);
    setSelectedRole(staff.role);
    setSelectedUnit(staff.unit || undefined);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setFormError(null);
    try {
      const firstname = String(formData.get("firstname") || "").trim();
      const middlename = (formData.get("middlename") as string) || undefined;
      const lastname = String(formData.get("lastname") || "").trim();
      const specialty = (formData.get("specialty") as string) || undefined;
      const phone = (formData.get("phone") as string) || undefined;
      const email = (formData.get("email") as string) || undefined;

      const isNurseLabPharm = selectedRole === "nurse" || selectedRole === "lab_technician" || selectedRole === "pharmacist";
      
      if (isNurseLabPharm) {
        if (!firstname || !lastname) throw new Error("Name is required for this role");
        if (!selectedUnit) throw new Error("Unit is required for this role");
        if (!phone && !email) throw new Error("Provide at least phone or email");
      }

      const payload = {
        role: selectedRole,
        firstname,
        middlename,
        lastname,
        unit: selectedUnit,
        specialty,
        phone,
        email,
      };

      mutation.mutate(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setFormError(msg);
    }
  }

  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const filteredStaff = rows.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${s.firstname} ${s.middlename || ""} ${s.lastname}`.toLowerCase();
    const role = s.role.toLowerCase().replace("_", " ");
    const unit = (s.unit || "").toLowerCase();
    const specialty = (s.specialty || "").toLowerCase();

    return (
      fullName.includes(q) ||
      role.includes(q) ||
      unit.includes(q) ||
      specialty.includes(q)
    );
  });

  const isNurseLabPharm = selectedRole === "nurse" || selectedRole === "lab_technician" || selectedRole === "pharmacist";

  return (
    <>
      <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Link href={`/d/${workspaceid}/doctor`}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Doctor Dashboard"
             className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-xl font-semibold">Contacts</h1>
      </div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff found.</p>
      ) : (
        <>
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Input
                type="text"
                placeholder="Search by name, role, unit, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {searchQuery ? (
                <span>
                  Found <strong>{filteredStaff.length}</strong> staff member
                  {filteredStaff.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span>
                  Total: <strong>{rows.length}</strong> staff member
                  {rows.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-sm text-muted-foreground">No staff match your search.</p>
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead className="w-[150px]">Role</TableHead>
                    <TableHead className="w-[200px]">Unit/Department</TableHead>
                    <TableHead className="w-[150px]">Specialty</TableHead>
                    <TableHead className="w-[150px]">Phone</TableHead>
                    <TableHead className="w-[200px]">Email</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((s: Staff) => (
                    <TableRow key={s.staffid} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {s.firstname} {s.middlename ? `${s.middlename} ` : ""}
                        {s.lastname}
                      </TableCell>
                      <TableCell className="uppercase text-xs">
                        {s.role.replace("_", " ")}
                      </TableCell>
                      <TableCell>{s.unit || "-"}</TableCell>
                      <TableCell>{s.specialty || "-"}</TableCell>
                      <TableCell>{s.phone || "-"}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{s.email || "-"}</TableCell>
                      <TableCell>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(s)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff" : "Add Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff information" : "Register new staff member"}
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstname">First name</Label>
              <Input 
                id="firstname" 
                name="firstname" 
                required={isNurseLabPharm}
                defaultValue={editingStaff?.firstname || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middlename">Middle name</Label>
              <Input 
                id="middlename" 
                name="middlename" 
                defaultValue={editingStaff?.middlename || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Last name</Label>
              <Input 
                id="lastname" 
                name="lastname" 
                required={isNurseLabPharm}
                defaultValue={editingStaff?.lastname || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit {isNurseLabPharm ? "(required)" : ""}</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit/department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input 
                id="specialty" 
                name="specialty" 
                defaultValue={editingStaff?.specialty || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                defaultValue={editingStaff?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email {isNurseLabPharm ? "(phone or email required)" : ""}</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                defaultValue={editingStaff?.email || ""}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 md:col-span-2" role="alert">{formError}</p>
            )}

            <div className="md:col-span-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : editingStaff ? "Save Changes" : "Register Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

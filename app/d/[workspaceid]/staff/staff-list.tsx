/**
 * Client Component: StaffList
 * - Fetches staff from GET /api/d/[workspaceid]/staff and renders a list
 * - Shows loading, empty, and error states
 * - Administrators can add and edit staff
 */
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus } from "lucide-react";

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
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(roles[0].value);
  const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load staff");
        const data = await res.json();
        if (!active) return;
        setRows((data.staff as Staff[]) ?? []);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load staff";
        setError(msg);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [workspaceid]);

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
    setSaving(true);
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

      const data = await res.json();
      
      if (editingStaff) {
        // Update existing
        setRows(prev => prev ? prev.map(s => 
          s.staffid === editingStaff.staffid ? data.staff : s
        ) : prev);
      } else {
        // Add new
        setRows(prev => prev ? [...prev, data.staff] : [data.staff]);
      }

      setDialogOpen(false);
      setEditingStaff(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows === null) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const isNurseLabPharm = selectedRole === "nurse" || selectedRole === "lab_technician" || selectedRole === "pharmacist";

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff found.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s: Staff) => (
            <li key={s.staffid} className="border rounded-md p-3 flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium">
                  {s.firstname} {s.middlename ? `${s.middlename} ` : ""}
                  {s.lastname} — <span className="uppercase text-xs">{s.role}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.unit ? `Unit: ${s.unit} • ` : ""}
                  {s.specialty ? `Specialty: ${s.specialty} • ` : ""}
                  {s.phone ? `Phone: ${s.phone} • ` : ""}
                  {s.email ? `Email: ${s.email}` : ""}
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(s)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingStaff ? "Save Changes" : "Register Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

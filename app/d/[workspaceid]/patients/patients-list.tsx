/**
 * Client Component: PatientsList
 * - Fetches patients via GET /api/d/[workspaceid]/patients and renders a table.
 * - Shows loading and basic error states; relies on same-origin cookies for auth.
 * - Used by the server page at /d/[workspaceid]/patients.
 * - Only doctors and nurses can click to view patient details
 * - Administrators can edit patient information
 */
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  dateofbirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ehrid?: string | null;
  medicalhistory?: { notes?: string } | null;
};

type UserRole = "doctor" | "nurse" | "receptionist" | "administrator";

export default function PatientsList({ 
  workspaceid, 
  userRole 
}: { 
  workspaceid: string;
  userRole: UserRole;
}) {
  const [rows, setRows] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Only doctors and nurses can view patient details
  const canViewDetails = userRole === "doctor" || userRole === "nurse";
  // Only administrators can edit
  const canEdit = userRole === "administrator";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Query the workspace-scoped patients endpoint; cookies carry auth
        const res = await fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        if (!active) return;
        setRows((data.patients as Patient[]) ?? []);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load patients";
        setError(msg);
      }
    }
    // Kick off initial load
    load();
    return () => {
      // Guard against setState after unmount
      active = false;
    };
  }, [workspaceid]);

  function handleOpenEdit(patient: Patient) {
    setEditingPatient(patient);
    setEditDialogOpen(true);
    setEditError(null);
  }

  async function handleSaveEdit(formData: FormData) {
    if (!editingPatient) return;
    
    setEditError(null);
    setSaving(true);
    try {
      const payload = {
        firstname: String(formData.get("firstname") || ""),
        middlename: (formData.get("middlename") as string) || undefined,
        lastname: String(formData.get("lastname") || ""),
        nationalid: (formData.get("nationalid") as string) || undefined,
        dateofbirth: (formData.get("dateofbirth") as string) || undefined,
        phone: (formData.get("phone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
        address: (formData.get("address") as string) || undefined,
        medicalhistory: formData.get("medicalhistory")
          ? { notes: String(formData.get("medicalhistory")) }
          : {},
      };

      const res = await fetch(`/api/d/${workspaceid}/patients/${editingPatient.patientid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update patient");
      }

      const data = await res.json();
      // Update local state
      setRows(prev => prev ? prev.map(p => 
        p.patientid === editingPatient.patientid ? data.patient : p
      ) : prev);
      
      setEditDialogOpen(false);
      setEditingPatient(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setEditError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Error boundary fallback
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  // Loading placeholder while fetching
  if (rows === null) return <p className="text-sm text-muted-foreground">Loading...</p>;

  // Empty state
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No patients found.</p>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead className="w-[150px]">National ID</TableHead>
              <TableHead className="w-[150px]">Phone</TableHead>
              <TableHead className="w-[200px]">Email</TableHead>
              <TableHead className="w-[150px]">EHR ID</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p: Patient) => (
              <TableRow 
                key={p.patientid}
                className={canViewDetails ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => {
                  if (canViewDetails) {
                    window.location.href = `/d/${workspaceid}/patients/${p.patientid}`;
                  }
                }}
                title={canViewDetails ? "Click to view patient details" : "Only doctors and nurses can view patient details"}
              >
                <TableCell className="font-medium">
                  {p.firstname} {p.middlename ? `${p.middlename} ` : ""}
                  {p.lastname}
                </TableCell>
                <TableCell>{p.nationalid || "-"}</TableCell>
                <TableCell>{p.phone || "-"}</TableCell>
                <TableCell className="truncate max-w-[200px]">{p.email || "-"}</TableCell>
                <TableCell>{p.ehrid || "-"}</TableCell>
                <TableCell>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(p);
                      }}
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

      {/* Edit Patient Dialog */}
      {editingPatient && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
              <DialogDescription>
                Update patient information
              </DialogDescription>
            </DialogHeader>
            <form action={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">First name</Label>
                <Input 
                  id="firstname" 
                  name="firstname" 
                  required 
                  defaultValue={editingPatient.firstname}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middlename">Middle name</Label>
                <Input 
                  id="middlename" 
                  name="middlename" 
                  defaultValue={editingPatient.middlename || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Last name</Label>
                <Input 
                  id="lastname" 
                  name="lastname" 
                  required 
                  defaultValue={editingPatient.lastname}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalid">ID</Label>
                <Input 
                  id="nationalid" 
                  name="nationalid" 
                  defaultValue={editingPatient.nationalid || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateofbirth">Date of Birth</Label>
                <Input 
                  id="dateofbirth" 
                  name="dateofbirth" 
                  type="date" 
                  defaultValue={editingPatient.dateofbirth || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telephone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  type="tel" 
                  defaultValue={editingPatient.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  defaultValue={editingPatient.email || ""}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  defaultValue={editingPatient.address || ""}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="medicalhistory">Medical history</Label>
                <Textarea 
                  id="medicalhistory" 
                  name="medicalhistory" 
                  defaultValue={editingPatient.medicalhistory?.notes || ""}
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 md:col-span-2" role="alert">{editError}</p>
              )}

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * Client Component: PatientsList
 * - Fetches patients via GET /api/d/[workspaceid]/patients and renders a table.
 * - Shows loading and basic error states; relies on same-origin cookies for auth.
 * - Used by the server page at /d/[workspaceid]/patients.
 * - Only doctors and nurses can click to view patient details
 * - Administrators can edit patient information
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  gender?: string | null;
  bloodgroup?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ehrid?: string | null;
  medicalhistory?: { notes?: string } | null;
};

type OpenEHREHR = {
  ehr_id: string;
  subject_id: string;
  created_time: string;
};

type UserRole = "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist" | "administrator";

export default function PatientsList({ 
  workspaceid, 
  userRole 
}: { 
  workspaceid: string;
  userRole: UserRole;
}) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Only doctors and nurses can view patient details
  const canViewDetails = userRole === "doctor" || userRole === "nurse";
  // Only administrators can edit
  const canEdit = userRole === "administrator";

  // Fetch patients - disabled by default, will be triggered by global header search
  const { data: rows = [], isLoading: loadingPatients, error: patientsError } = useQuery({
    queryKey: ["patients", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (!res.ok) throw new Error("Failed to load patients");
      const data = await res.json();
      return (data.patients as Patient[]) ?? [];
    },
    enabled: false, // Will be triggered by global header search
  });

  // Fetch EHRs
  const { data: ehrs = [] } = useQuery({
    queryKey: ["ehrs"],
    queryFn: async () => {
      const res = await fetch("/api/ehrbase/ehr");
      if (!res.ok) return [];
      const data = await res.json();
      return (data as OpenEHREHR[]) ?? [];
    },
    enabled: rows.length > 0, // Only fetch EHRs if we have patients
  });

  const mutation = useMutation({
    mutationFn: async (payload: Patient) => {
      if (!editingPatient) throw new Error("No patient selected");
      
      const res = await fetch(`/api/d/${workspaceid}/patients/${editingPatient.patientid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update patient");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", workspaceid] });
      setEditDialogOpen(false);
      setEditingPatient(null);
    },
    onError: (error: Error) => {
      setEditError(error.message);
    },
  });

  // Helper to find matching EHR for a patient
  // Match by National ID first (preferred), then fall back to patient UUID
  const getEHRForPatient = (patient: Patient): OpenEHREHR | undefined => {
    if (patient.nationalid) {
      // Try to match by National ID first
      const ehrByNationalId = ehrs.find((ehr) => ehr.subject_id === patient.nationalid);
      if (ehrByNationalId) return ehrByNationalId;
    }
    // Fall back to matching by patient UUID
    return ehrs.find((ehr) => ehr.subject_id === patient.patientid);
  };

  // Display all patients (search will be handled by global header)
  const displayedPatients = rows || [];

  function handleOpenEdit(patient: Patient) {
    setEditingPatient(patient);
    setEditDialogOpen(true);
    setEditError(null);
  }

  async function handleSaveEdit(formData: FormData) {
    if (!editingPatient) return;
    
    setEditError(null);
    try {
      const payload = {
        patientid: editingPatient.patientid,
        firstname: String(formData.get("firstname") || ""),
        middlename: String(formData.get("middlename") || ""),
        lastname: String(formData.get("lastname") || ""),
        nationalid: String(formData.get("nationalid") || ""),
        dateofbirth: String(formData.get("dateofbirth") || ""),
        gender: String(formData.get("gender") || ""),
        bloodgroup: String(formData.get("bloodgroup") || ""),
        phone: String(formData.get("phone") || ""),
        email: String(formData.get("email") || ""),
        address: String(formData.get("address") || ""),
        medicalhistory: formData.get("medicalhistory")
          ? { notes: String(formData.get("medicalhistory")) }
          : {},
      };

      mutation.mutate(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setEditError(msg);
    }
  }

  return (
    <>
      {/* Patients Table */}
      {loadingPatients ? (
        <p className="text-sm text-muted-foreground">Loading patients...</p>
      ) : patientsError ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-sm text-red-600">{(patientsError as Error).message}</p>
        </div>
      ) : displayedPatients.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-sm text-muted-foreground">No patients found. Use the search in the header to find patients.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead className="w-[150px]">National ID</TableHead>
                <TableHead className="w-[100px]">Gender</TableHead>
                <TableHead className="w-[100px]">Blood Group</TableHead>
                <TableHead className="w-[150px]">Phone</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[150px]">EHR ID</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedPatients.map((p: Patient) => (
                <TableRow
                  key={p.patientid}
                  className={canViewDetails ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => {
                    if (canViewDetails) {
                      window.location.href = `/d/${workspaceid}/patients/${p.patientid}`;
                    }
                  }}
                  title={
                    canViewDetails
                      ? "Click to view patient details"
                      : "Only doctors and nurses can view patient details"
                  }
                >
                  <TableCell className="font-medium">
                    {p.firstname} {p.middlename ? `${p.middlename} ` : ""}
                    {p.lastname}
                  </TableCell>
                  <TableCell>{p.nationalid || "-"}</TableCell>
                  <TableCell className="capitalize">{p.gender || "-"}</TableCell>
                  <TableCell>{p.bloodgroup || "-"}</TableCell>
                  <TableCell>{p.phone || "-"}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{p.email || "-"}</TableCell>
                  <TableCell>
                    {(() => {
                      const ehr = getEHRForPatient(p);
                      if (ehr) {
                        return (
                          <a
                            href={`/d/admin/openehr/ehrs/${ehr.ehr_id}`}
                            className="text-blue-600 hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                            title="View compositions in OpenEHR"
                          >
                            {ehr.ehr_id.substring(0, 8)}...
                          </a>
                        );
                      }
                      return (
                        <span className="text-muted-foreground text-xs">No EHR</span>
                      );
                    })()}
                  </TableCell>
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
      )}

      {/* Edit Patient Dialog */}
      {editingPatient && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
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
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  aria-label="Select gender"
                  defaultValue={editingPatient.gender || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodgroup">Blood Group</Label>
                <select
                  id="bloodgroup"
                  name="bloodgroup"
                  aria-label="Select blood group"
                  defaultValue={editingPatient.bloodgroup || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
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
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

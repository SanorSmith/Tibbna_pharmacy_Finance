/**
 * Client Component: StaffForm
 * - Shadcn UI form to create workspace staff via POST /api/d/[workspaceid]/staff
 * - Role-based client validation: for nurse/lab_technician/pharmacist require name, unit, and phone or email
 * - On success: redirect to /d/[workspaceid]/staff
 */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roles = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "lab_technician", label: "Lab technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "receptionist", label: "Receptionist" },
] as const;

export default function StaffForm({ workspaceid }: { workspaceid: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>(roles[0].value);
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
  const [unit, setUnit] = useState<string | undefined>(undefined);
  const isNurseLabPharm = role === "nurse" || role === "lab_technician" || role === "pharmacist";

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      // Role-based required fields for nurse/lab_technician/pharmacist
      const firstname = String(formData.get("firstname") || "").trim();
      const middlename = (formData.get("middlename") as string) || undefined;
      const lastname = String(formData.get("lastname") || "").trim();
      const specialty = (formData.get("specialty") as string) || undefined;
      const phone = (formData.get("phone") as string) || undefined;
      const email = (formData.get("email") as string) || undefined;

      if (isNurseLabPharm) {
        if (!firstname || !lastname) throw new Error("Name is required for this role");
        if (!unit) throw new Error("Unit is required for this role");
        if (!phone && !email) throw new Error("Provide at least phone or email");
      }

      const payload = {
        role,
        firstname,
        middlename,
        lastname,
        unit,
        specialty,
        phone,
        email,
      };

      const res = await fetch(`/api/d/${workspaceid}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register staff");
      }
      router.push(`/d/${workspaceid}/staff`);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="role">Role</Label>
        <Select value={role} onValueChange={setRole}>
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
        <Input id="firstname" name="firstname" required={isNurseLabPharm} placeholder="John" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="middlename">Middle name</Label>
        <Input id="middlename" name="middlename" placeholder="A." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastname">Last name</Label>
        <Input id="lastname" name="lastname" required={isNurseLabPharm} placeholder="Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit">Unit {isNurseLabPharm ? "(required)" : ""}</Label>
        <Select value={unit} onValueChange={setUnit}>
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
        <Input id="specialty" name="specialty" placeholder="Pediatrics" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telephone</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 555" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email {isNurseLabPharm ? "(phone or email required)" : ""}</Label>
        <Input id="email" name="email" type="email" placeholder="name@example.com" />
      </div>

      {error && (
        <p className="text-sm text-red-600 md:col-span-2" role="alert">{error}</p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Register Staff"}
        </Button>
      </div>
    </form>
  );
}

export { StaffForm };

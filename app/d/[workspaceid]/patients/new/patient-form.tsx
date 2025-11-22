/**
 * Client Component: PatientForm
 * - Renders Shadcn UI inputs for registering a new patient.
 * - Submits JSON to POST /api/d/[workspaceid]/patients and redirects to the list on success.
 * - Shows a simple loading state and inline error message on failure.
 */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PatientForm({ workspaceid }: { workspaceid: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        firstname: String(formData.get("firstname") || ""),
        middlename: (formData.get("middlename") as string) || undefined,
        lastname: String(formData.get("lastname") || ""),
        nationalid: (formData.get("nationalid") as string) || undefined,
        dateofbirth: (formData.get("dateofbirth") as string) || undefined,
        gender: (formData.get("gender") as string) || undefined,
        bloodgroup: (formData.get("bloodgroup") as string) || undefined,
        phone: (formData.get("phone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
        address: (formData.get("address") as string) || undefined,
        medicalhistory: formData.get("medicalhistory")
          ? { notes: String(formData.get("medicalhistory")) }
          : {},
      };

      const res = await fetch(`/api/d/${workspaceid}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register patient");
      }
      router.push(`/d/${workspaceid}/patients`);
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
      <div className="space-y-2">
        <Label htmlFor="firstname">First name</Label>
        <Input id="firstname" name="firstname" required placeholder="John" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="middlename">Middle name</Label>
        <Input id="middlename" name="middlename" placeholder="A." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastname">Last name</Label>
        <Input id="lastname" name="lastname" required placeholder="Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nationalid">ID</Label>
        <Input id="nationalid" name="nationalid" placeholder="ID number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dateofbirth">Date of Birth</Label>
        <Input id="dateofbirth" name="dateofbirth" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          name="gender"
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
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 555" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="name@example.com" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="123 Main St" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="medicalhistory">Medical history</Label>
        <Textarea id="medicalhistory" name="medicalhistory" placeholder="Notes, conditions, allergies..." />
      </div>

      {error && (
        <p className="text-sm text-red-600 md:col-span-2" role="alert">{error}</p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Register Patient"}
        </Button>
      </div>
    </form>
  );
}

export { PatientForm };

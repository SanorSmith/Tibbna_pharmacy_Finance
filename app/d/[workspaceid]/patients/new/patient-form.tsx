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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PatientForm({ workspaceid }: { workspaceid: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setShowErrorDialog(false);
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
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* --- NAME ROW ----------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:col-span-2">
        <div className="space-y-1">
          <Label htmlFor="firstname">First name</Label>
          <Input
            id="firstname"
            name="firstname"
            required
            placeholder="John"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="middlename">Middle name</Label>
          <Input
            id="middlename"
            name="middlename"
            placeholder="A."
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="lastname">Last name</Label>
          <Input
            id="lastname"
            name="lastname"
            required
            placeholder="Doe"
            className="h-9"
          />
        </div>
      </div>

      {/* --- OTHER FIELDS -------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:col-span-2">
      <div className="space-y-1">
        <Label htmlFor="nationalid">National ID</Label>
        <Input
          id="nationalid"
          name="nationalid"
          placeholder="ID number"
          className="h-9"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="dateofbirth">Date of Birth</Label>
        <Input
          id="dateofbirth"
          name="dateofbirth"
          type="date"
          className="h-9"
        />
      </div>

      {/* --- GENDER -------------------------------------------------------- */}
      <div className="space-y-1">
        <Label htmlFor="gender">Gender</Label>
        <Select name="gender">
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent className="bg-blue-200/90">
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- BLOOD GROUP --------------------------------------------------- */}
      <div className="space-y-1">
        <Label htmlFor="bloodgroup">Blood Group</Label>
        <Select name="bloodgroup">
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select blood group" />
          </SelectTrigger>
          <SelectContent className="bg-blue-200/90">
            <SelectItem value="A+">A+</SelectItem>
            <SelectItem value="A-">A-</SelectItem>
            <SelectItem value="B+">B+</SelectItem>
            <SelectItem value="B-">B-</SelectItem>
            <SelectItem value="AB+">AB+</SelectItem>
            <SelectItem value="AB-">AB-</SelectItem>
            <SelectItem value="O+">O+</SelectItem>
            <SelectItem value="O-">O-</SelectItem>
          </SelectContent>
        </Select>
      </div>
</div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:col-span-2">
      <div className="space-y-1">
        <Label htmlFor="phone">Telephone</Label>
  
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+1 555 555"
          className="h-9"
          />
      </div>

      {/* --- EMAIL + ADDRESS in same row ---------------------------------- */}
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          className="h-9"
          />
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          placeholder="123 Main St"
          className="h-9"
          />
      </div>
          </div>

      {/* --- MEDICAL HISTORY ---------------------------------------------- */}
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="medicalhistory">Medical history</Label>
        <Textarea
          id="medicalhistory"
          name="medicalhistory"
          placeholder="Notes, conditions, allergies..."
        />
      </div>

      {/* --- SUBMIT BUTTON (right aligned) -------------------------------- */}
      <div className="md:col-span-2 flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          aria-label="Back to Doctor Dashboard"
          className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
        >
          {loading ? "Saving..." : "Register Patient"}
        </Button>
      </div>

      {/* --- ERROR DIALOG ------------------------------------------------- */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Registration Failed</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter >
          <AlertDialogAction onClick={() => setShowErrorDialog(false)}className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900">
            
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export { PatientForm };

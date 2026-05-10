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
      // Validate required fields
      const nationalid = (formData.get("nationalid") as string) || "";
      const dateofbirth = (formData.get("dateofbirth") as string) || "";
      const phone = (formData.get("phone") as string) || "";

      if (!nationalid || nationalid.replace(/\D/g, "").length !== 12) {
        throw new Error("National ID must be exactly 12 digits");
      }
      if (!dateofbirth) {
        throw new Error("Date of Birth is required");
      }
      const phoneDigits = phone.replace(/\D/g, "");
      if (!phone || phoneDigits.length < 11 || phoneDigits.length > 16) {
        throw new Error("Telephone must be between 11 and 16 digits");
      }

      const payload = {
        firstname: String(formData.get("firstname") || ""),
        middlename: (formData.get("middlename") as string) || undefined,
        lastname: String(formData.get("lastname") || ""),
        nationalid: nationalid || undefined,
        dateofbirth: dateofbirth || undefined,
        gender: (formData.get("gender") as string) || undefined,
        bloodgroup: (formData.get("bloodgroup") as string) || undefined,
        phone: phone || undefined,
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
    <form action={onSubmit} className="space-y-3">
      {/* Row 1: Names */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstname" className="text-xs">First name</Label>
          <Input id="firstname" name="firstname" required placeholder="John" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="middlename" className="text-xs">Middle name</Label>
          <Input id="middlename" name="middlename" placeholder="A." className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastname" className="text-xs">Last name</Label>
          <Input id="lastname" name="lastname" required placeholder="Doe" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 2: National ID, DOB, Gender, Blood Group */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="nationalid" className="text-xs">National ID *</Label>
          <Input id="nationalid" name="nationalid" required placeholder="12-digit ID" minLength={12} maxLength={12} pattern="[0-9]{12}" title="National ID must be exactly 12 digits" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dateofbirth" className="text-xs">Date of Birth *</Label>
          <Input id="dateofbirth" name="dateofbirth" type="date" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gender" className="text-xs">Gender</Label>
          <Select name="gender">
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-blue-200/90">
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bloodgroup" className="text-xs">Blood Group</Label>
          <Select name="bloodgroup">
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select" />
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

      {/* Row 3: Phone, Email, Address */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="phone" className="text-xs">Telephone *</Label>
          <Input id="phone" name="phone" type="tel" required placeholder="+1 555 555 5555" minLength={11} maxLength={16} title="Telephone must be between 11 and 16 digits" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input id="email" name="email" type="email" placeholder="name@example.com" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="address" className="text-xs">Address</Label>
          <Input id="address" name="address" placeholder="123 Main St" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 4: Medical History + Submit */}
      <div className="space-y-1">
        <Label htmlFor="medicalhistory" className="text-xs">Medical history</Label>
        <Textarea id="medicalhistory" name="medicalhistory" placeholder="Notes, conditions, allergies..." rows={2} className="text-sm resize-none" />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
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

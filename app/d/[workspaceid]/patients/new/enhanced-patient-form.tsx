/**
 * Enhanced Patient Registration Form
 * - Comprehensive patient registration with Arabic/English names, insurance, emergency contacts
 * - Matches the provided HTML design with Tibbna styling
 * - Integrates with enhanced patient database schema
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Shield, CircleAlert, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EnhancedPatientForm({ workspaceid }: { workspaceid: string }) {
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
      const firstnameAr = (formData.get("firstnameAr") as string) || "";
      const lastnameAr = (formData.get("lastnameAr") as string) || "";
      const dateofbirth = (formData.get("dateofbirth") as string) || "";
      const phone = (formData.get("phone") as string) || "";
      const gender = (formData.get("gender") as string) || "";

      if (!firstnameAr) throw new Error("First Name (Arabic) is required");
      if (!lastnameAr) throw new Error("Last Name (Arabic) is required");
      if (!dateofbirth) throw new Error("Date of Birth is required");
      if (!phone) throw new Error("Phone Number is required");
      if (!gender) throw new Error("Gender is required");

      const payload = {
        // Personal Information - Arabic and English
        firstname: (formData.get("firstnameEn") as string) || firstnameAr,
        firstnameAr: firstnameAr,
        middlename: (formData.get("middlenameAr") as string) || undefined,
        middlenameAr: (formData.get("middlenameAr") as string) || undefined,
        lastname: (formData.get("lastnameEn") as string) || lastnameAr,
        lastnameAr: lastnameAr,
        // Demographics
        nationalid: (formData.get("nationalid") as string) || undefined,
        dateofbirth: dateofbirth,
        gender: gender,
        bloodgroup: (formData.get("bloodgroup") as string) || undefined,
        // Contact Information
        phone: phone,
        email: (formData.get("email") as string) || undefined,
        governorate: (formData.get("governorate") as string) || undefined,
        address: (formData.get("address") as string) || undefined,
        // Emergency Contact
        emergencyContactName: (formData.get("emergencyContactName") as string) || undefined,
        emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || undefined,
        // Insurance Information
        insuranceCompany: (formData.get("insuranceCompany") as string) || undefined,
        insuranceNumber: (formData.get("insuranceNumber") as string) || undefined,
        insuranceStatus: (formData.get("insuranceCompany") as string) ? "Active" : "Not Available",
        // Medical Information
        allergies: (formData.get("allergies") as string) || undefined,
        chronicDiseases: (formData.get("chronicDiseases") as string) || undefined,
        currentMedications: (formData.get("currentMedications") as string) || undefined,
        medicalHistory: (formData.get("medicalHistory") as string) || undefined,
        // Legacy medical history
        medicalhistory: {
          notes: (formData.get("medicalHistory") as string) || "",
          allergies: (formData.get("allergies") as string) || "",
          chronicDiseases: (formData.get("chronicDiseases") as string) || "",
          currentMedications: (formData.get("currentMedications") as string) || "",
        },
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
    <div className="inner-wrapper">
      {/* Page Header */}
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href={`/d/${workspaceid}/patients`}>
            <button className="btn-secondary p-2">
              <ArrowLeft width={16} height={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Register New Patient</h2>
            <p className="page-description">Complete patient registration form for Tibbna Non-Medical DB</p>
          </div>
        </div>
      </div>

      <form action={onSubmit} className="space-y-6">
        {/* Personal Information Card */}
        <Card className="tibbna-card">
          <CardHeader>
            <CardTitle className="tibbna-section-title flex items-center gap-2">
              <User width={16} height={16} />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name (Arabic) *
                </Label>
                <Input
                  required
                  className="tibbna-input"
                  placeholder="e.g., Ahmed"
                  name="firstnameAr"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name (Arabic) *
                </Label>
                <Input
                  required
                  className="tibbna-input"
                  placeholder="e.g., Mohammed"
                  name="lastnameAr"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Abdullah"
                  name="middlenameAr"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name (English)
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Ahmed"
                  name="firstnameEn"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name (English)
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Mohammed"
                  name="lastnameEn"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </Label>
                <Input required className="tibbna-input" type="date" name="dateofbirth" />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </Label>
                <Select name="gender" required>
                  <SelectTrigger className="tibbna-input">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </Label>
                <Select name="bloodgroup">
                  <SelectTrigger className="tibbna-input">
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., 123456789012"
                  maxLength={12}
                  name="nationalid"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card className="tibbna-card">
          <CardHeader>
            <CardTitle className="tibbna-section-title flex items-center gap-2">
              <Phone width={16} height={16} />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </Label>
                <Input
                  required
                  className="tibbna-input"
                  placeholder="e.g., +964 770 123 4567"
                  type="tel"
                  name="phone"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., patient@email.com"
                  type="email"
                  name="email"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Governorate
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Baghdad"
                  name="governorate"
                />
              </div>
              <div className="lg:col-span-3">
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Street, District, City, Governorate"
                  name="address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact Card */}
        <Card className="tibbna-card">
          <CardHeader>
            <CardTitle className="tibbna-section-title flex items-center gap-2">
              <Shield width={16} height={16} />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., Sarah Mohammed"
                  name="emergencyContactName"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </Label>
                <Input
                  className="tibbna-input"
                  placeholder="e.g., +964 770 987 6543"
                  type="tel"
                  name="emergencyContactPhone"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Information Card */}
        <Card className="tibbna-card">
          <CardHeader>
            <CardTitle className="tibbna-section-title flex items-center gap-2">
              <Shield width={16} height={16} />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Company
                </Label>
                <Select name="insuranceCompany">
                  <SelectTrigger className="tibbna-input">
                    <SelectValue placeholder="Select Insurance Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia Insurance Company">Asia Insurance Company</SelectItem>
                    <SelectItem value="Gulf Insurance">Gulf Insurance</SelectItem>
                    <SelectItem value="Iraq Insurance Company">Iraq Insurance Company</SelectItem>
                    <SelectItem value="Middle East Insurance">Middle East Insurance</SelectItem>
                    <SelectItem value="National Insurance">National Insurance</SelectItem>
                    <SelectItem value="Test Insurance Company">Test Insurance Company</SelectItem>
                    <SelectItem value="test insurans comp">test insurans comp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    className="tibbna-input flex-1"
                    placeholder="e.g., NAT001-12345-2024"
                    name="insuranceNumber"
                  />
                  <Button type="button" className="btn-secondary px-3 py-2" disabled>
                    {/* Refresh icon would go here */}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information Card */}
        <Card className="tibbna-card">
          <CardHeader>
            <CardTitle className="tibbna-section-title flex items-center gap-2">
              <CircleAlert width={16} height={16} />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Allergies
              </Label>
              <Textarea
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Penicillin, Peanuts, Shellfish"
                name="allergies"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Chronic Diseases
              </Label>
              <Textarea
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Diabetes, Hypertension, Asthma"
                name="chronicDiseases"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Current Medications
              </Label>
              <Textarea
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                name="currentMedications"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Medical History
              </Label>
              <Textarea
                className="tibbna-input"
                rows={3}
                placeholder="e.g., Previous surgeries, hospitalizations, major illnesses"
                name="medicalHistory"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-3">
          <Button type="submit" className="btn-primary" disabled={loading}>
            <Save width={16} height={16} />
            {loading ? "Saving..." : "Register Patient"}
          </Button>
          <Link href={`/d/${workspaceid}/patients`}>
            <Button type="button" className="btn-secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Registration Failed</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorDialog(false)}
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

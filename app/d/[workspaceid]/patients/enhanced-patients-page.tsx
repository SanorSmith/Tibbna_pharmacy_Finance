/**
 * Enhanced Patient Management Page
 * - Comprehensive patient search and management interface
 * - Matches the provided HTML design with Tibbna styling
 * - Advanced search by Patient ID, National ID, or Phone Number
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, SquarePen, Plus } from "lucide-react";
import Link from "next/link";

interface Patient {
  patientid: string;
  firstname: string;
  firstnameAr?: string;
  middlename?: string;
  middlenameAr?: string;
  lastname: string;
  lastnameAr?: string;
  nationalid?: string;
  dateofbirth?: string;
  gender?: string;
  bloodgroup?: string;
  phone?: string;
  email?: string;
  governorate?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceCompany?: string;
  insuranceNumber?: string;
  insuranceStatus?: string;
  allergies?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  medicalHistory?: string;
  createdat: string;
  updatedat: string;
}

export default function EnhancedPatientsPage({ workspaceid }: { workspaceid: string }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [medicalStaff, setMedicalStaff] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);

  // Load initial patient count
  useEffect(() => {
    loadPatients();
  }, [workspaceid]);

  const loadPatients = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setTotalPatients(data.patients?.length || 0);
      }
    } catch (error) {
      console.error("Failed to load patients:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search by Patient ID, National ID, or Phone
      const res = await fetch(`/api/d/${workspaceid}/patients/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.patient) {
          setSelectedPatient(data.patient);
        } else {
          setSelectedPatient(null);
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (selectedPatient) {
      router.push(`/d/${workspaceid}/patients/${selectedPatient.patientid}/edit`);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getGenderDisplay = (gender?: string) => {
    switch (gender) {
      case "MALE": return "Male";
      case "FEMALE": return "Female";
      case "OTHER": return "Other";
      default: return "N/A";
    }
  };

  return (
    <div className="main-wrapper">
      <div className="inner-wrapper">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 lg:p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Patients</h1>
            <p className="text-gray-500 text-sm">{totalPatients} registered patients</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                \ud83c\udfe5 Tibbna Non-Medical DB
              </span>
              <span className="text-xs text-gray-400">Connected to Non-Medical database</span>
            </div>
          </div>
          <Link href={`/d/${workspaceid}/patients/new`}>
            <Button className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit">
              <Plus width={16} height={16} />
              Add Patient
            </Button>
          </Link>
        </div>

        <div className="p-4 lg:p-6 space-y-6">
          {/* Search Section */}
          <Card className="bg-white rounded-lg border shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
              <CardTitle className="text-lg font-semibold text-gray-800">Patient Search</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Search by Patient ID, National ID, or Phone Number</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" width={16} height={16} />
                  <Input
                    placeholder="Search patients..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" width={16} height={16} />
                    <Input
                      placeholder="Select medical staff (optional)"
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={medicalStaff}
                      onChange={(e) => setMedicalStaff(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 max-w-2xl">
                <Button
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search width={16} height={16} />
                  Search
                </Button>
                <Button
                  onClick={handleEdit}
                  disabled={!selectedPatient}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <SquarePen width={16} height={16} />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information Display */}
          <Card className="bg-white rounded-lg border">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
              <CardTitle className="text-lg font-semibold text-gray-800">Patient Information</CardTitle>
              <p className="text-xs text-gray-600 mt-1">View detailed patient records</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {selectedPatient ? (
                <>
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patient ID</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.patientid.slice(0, 8)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">First Name</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.firstnameAr || selectedPatient.firstname || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Middle Name</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.middlenameAr || selectedPatient.middlename || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Last Name</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.lastnameAr || selectedPatient.lastname || ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Demographics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date of Birth</Label>
                        <Input
                          readOnly
                          type="date"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.dateofbirth || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          disabled
                          value={selectedPatient.gender || ""}
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Blood Group</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          disabled
                          value={selectedPatient.bloodgroup || ""}
                        >
                          <option value="">Select</option>
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
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">National ID</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.nationalid || ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone Number</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.phone || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email Address</Label>
                        <Input
                          readOnly
                          type="email"
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.email || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Address</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.address || ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Insurance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Company</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.insuranceCompany || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Number</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.insuranceNumber || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Status</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          disabled
                          value={selectedPatient.insuranceStatus || "Not Available"}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Pending">Pending</option>
                          <option value="Not Available">Not Available</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Emergency Contact Name</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.emergencyContactName || ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Emergency Contact Phone</Label>
                        <Input
                          readOnly
                          placeholder="â\x80\x94"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50"
                          value={selectedPatient.emergencyContactPhone || ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Allergies</Label>
                        <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                          {selectedPatient.allergies || "â\x80\x94"}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Chronic Diseases</Label>
                        <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                          {selectedPatient.chronicDiseases || "â\x80\x94"}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Current Medications</Label>
                        <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                          {selectedPatient.currentMedications || "â\x80\x94"}
                        </div>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Medical History</Label>
                        <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[80px]">
                          {selectedPatient.medicalHistory || "â\x80\x94"}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Search className="text-blue-600" width={32} height={32} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">No Patient Selected</p>
                      <p className="text-xs text-gray-500 mt-1">Enter a Patient ID, National ID, or Phone Number to search</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

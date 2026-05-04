"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DrugAutocomplete } from "@/components/ui/drug-autocomplete";
import { Loader2, Plus, Trash2, User, Search, ArrowLeft, Phone, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PatientSearchModal from "../../../../../components/PatientSearchModal";

interface Patient {
  patientid: string;
  firstname: string;
  middlename: string | null;
  lastname: string;
  nationalid: string | null;
  dateofbirth: string | null;
}

interface OrderItem {
  drugid?: string;
  drugname: string;
  form?: string;
  strength?: string;
  quantity: number;
  doseAmount?: string;
  doseUnit?: string;
  route?: string;
  timingDirections?: string;
  directionDuration?: string;
  validUntil?: string;
  usage?: string;
  asRequired?: boolean;
  asRequiredCriterion?: string;
  additionalInstruction?: string;
  clinicalIndication?: string;
  pharmacistNotes?: string;
}

interface CreateOrderModalProps {
  workspaceid: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userName: string;
  userId: string;
}

export default function CreateOrderModal({
  workspaceid,
  open,
  onClose,
  onSuccess,
  userName,
  userId,
}: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [showInlinePatientForm, setShowInlinePatientForm] = useState(false);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [newPatientForm, setNewPatientForm] = useState({
    first_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    last_name_en: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    email: '',
    national_id: '',
    governorate: '',
    address: '',
    medical_history: '',
    insurance_company: '',
    insurance_number: '',
    emergency_contact: '',
    emergency_phone: '',
    allergies: '',
    chronic_diseases: '',
    current_medications: '',
  });

  useEffect(() => {
    loadInsuranceCompanies();
  }, []);

  const loadInsuranceCompanies = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/insurance-companies`);
      if (res.ok) {
        const data = await res.json();
        setInsuranceCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
    }
  };
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    drugid: "",
    drugname: "",
    form: "",
    strength: "",
    quantity: 1,
    doseAmount: "",
    doseUnit: "mg",
    route: "",
    timingDirections: "Once daily",
    directionDuration: "",
    validUntil: "",
    usage: "",
    asRequired: false,
    asRequiredCriterion: "",
    additionalInstruction: "",
    clinicalIndication: "",
    pharmacistNotes: "",
  });

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setSearchingPatient(true);
      try {
        const res = await fetch(
          `/api/d/${workspaceid}/patients?search=${encodeURIComponent(patientSearch)}`
        );
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
        }
      } catch (error) {
        console.error("Error searching patients:", error);
      } finally {
        setSearchingPatient(false);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [patientSearch, workspaceid]);

  const handleAddItem = () => {
    if (!currentItem.drugname || currentItem.quantity < 1) {
      return;
    }

    const newItem: OrderItem = {
      drugid: currentItem.drugid || "",
      drugname: currentItem.drugname,
      form: "",
      strength: "",
      quantity: currentItem.quantity,
      doseAmount: currentItem.doseAmount,
      doseUnit: currentItem.doseUnit,
      route: currentItem.route,
      timingDirections: currentItem.timingDirections,
      directionDuration: currentItem.directionDuration,
      validUntil: currentItem.validUntil,
      usage: currentItem.usage,
      asRequired: currentItem.asRequired,
      asRequiredCriterion: currentItem.asRequiredCriterion,
      additionalInstruction: currentItem.additionalInstruction,
      clinicalIndication: currentItem.clinicalIndication,
      pharmacistNotes: currentItem.pharmacistNotes,
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentItem({
      drugid: "",
      drugname: "",
      form: "",
      strength: "",
      quantity: 1,
      doseAmount: "",
      doseUnit: "mg",
      route: "",
      timingDirections: "Once daily",
      directionDuration: "",
      validUntil: "",
      usage: "",
      asRequired: false,
      asRequiredCriterion: "",
      additionalInstruction: "",
      clinicalIndication: "",
      pharmacistNotes: "",
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handlePatientSelect = (patient: any) => {
    const formattedPatient: Patient = {
      patientid: patient.patientid,
      firstname: patient.firstname,
      lastname: patient.lastname,
      nationalid: patient.nationalid,
      dateofbirth: patient.dateofbirth,
    };
    setSelectedPatient(formattedPatient);
    setPatientSearch(`${patient.firstname} ${patient.lastname}`);
    setShowPatientSearchModal(false);
  };

  const handleShowInlinePatientForm = () => {
    setShowInlinePatientForm(true);
  };

  const handleCancelInlinePatientForm = () => {
    setShowInlinePatientForm(false);
    setNewPatientForm({
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      middle_name: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      phone: '',
      email: '',
      national_id: '',
      governorate: '',
      address: '',
      medical_history: '',
      insurance_company: '',
      insurance_number: '',
      emergency_contact: '',
      emergency_phone: '',
      allergies: '',
      chronic_diseases: '',
      current_medications: '',
    });
  };

  const handleSaveInlinePatientForm = async () => {
    if (!newPatientForm.phone || !newPatientForm.date_of_birth || !newPatientForm.gender || !newPatientForm.first_name_ar || !newPatientForm.last_name_ar) {
      alert('Please fill all required fields');
      return;
    }

    // Validate national ID - must be exactly 12 digits if provided
    if (newPatientForm.national_id) {
      const nationalIdDigits = newPatientForm.national_id.replace(/\D/g, '');
      if (nationalIdDigits.length !== 12) {
        alert('National ID must be exactly 12 digits');
        return;
      }
      if (nationalIdDigits !== newPatientForm.national_id) {
        alert('National ID must contain only digits');
        return;
      }
    }

    // Validate insurance number format if provided
    if (newPatientForm.insurance_number && newPatientForm.insurance_company) {
      const insurancePattern = /^[A-Z0-9]{3,6}-\d{4,6}-\d{4}$/;
      if (!insurancePattern.test(newPatientForm.insurance_number)) {
        alert('Insurance number must follow format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)');
        return;
      }
    }

    try {
      const patientData = {
        first_name_ar: newPatientForm.first_name_ar || newPatientForm.first_name_en || '',
        last_name_ar: newPatientForm.last_name_ar || newPatientForm.last_name_en || '',
        first_name_en: newPatientForm.first_name_en || '',
        middle_name: newPatientForm.middle_name || '',
        last_name_en: newPatientForm.last_name_en || '',
        date_of_birth: newPatientForm.date_of_birth,
        gender: newPatientForm.gender,
        blood_group: newPatientForm.blood_group,
        national_id: newPatientForm.national_id,
        phone: newPatientForm.phone,
        email: newPatientForm.email,
        governorate: newPatientForm.governorate || newPatientForm.address,
        address: newPatientForm.address,
        emergency_contact: newPatientForm.emergency_contact,
        emergency_phone: newPatientForm.emergency_phone,
        insurance_company: newPatientForm.insurance_company,
        insurance_number: newPatientForm.insurance_number,
        allergies: newPatientForm.allergies,
        chronic_diseases: newPatientForm.chronic_diseases,
        current_medications: newPatientForm.current_medications,
        medical_history: newPatientForm.medical_history,
      };

      const res = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (res.ok) {
        const result = await res.json();
        
        const formattedPatient: Patient = {
          patientid: result.patient.patientid,
          firstname: result.patient.firstname,
          lastname: result.patient.lastname,
          nationalid: result.patient.nationalid,
          dateofbirth: result.patient.dateofbirth,
        };
        
        setSelectedPatient(formattedPatient);
        setPatientSearch(`${result.patient.firstname} ${result.patient.lastname}`);
        setShowInlinePatientForm(false);
        alert('Patient registered successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create patient');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save patient');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || orderItems.length === 0 || loading) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientid: selectedPatient.patientid,
          prescriberid: userId, // Use logged-in user's ID
          prescriberName: userName, // Use logged-in user's name
          items: orderItems,
          source: "PHARMACY",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Order created successfully:", data.order?.orderid);
        onSuccess();
        handleClose();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create order");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setPatients([]);
    setShowInlinePatientForm(false);
    setNewPatientForm({
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      middle_name: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      phone: '',
      email: '',
      national_id: '',
      governorate: '',
      address: '',
      medical_history: '',
      insurance_company: '',
      insurance_number: '',
      emergency_contact: '',
      emergency_phone: '',
      allergies: '',
      chronic_diseases: '',
      current_medications: '',
    });
    setOrderItems([]);
    setCurrentItem({
      drugid: "",
      drugname: "",
      form: "",
      strength: "",
      quantity: 1,
      doseAmount: "",
      doseUnit: "mg",
      route: "",
      timingDirections: "Once daily",
      directionDuration: "",
      validUntil: "",
      usage: "",
      asRequired: false,
      asRequiredCriterion: "",
      additionalInstruction: "",
      clinicalIndication: "",
      pharmacistNotes: "",
    });
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an Order</DialogTitle>
          <DialogDescription>
            Create a new pharmacy order with patient information and medications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </Label>
            
            {!selectedPatient ? (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search patient by name or national ID..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onFocus={() => patientSearch.length >= 2 && setShowPatientSearchModal(true)}
                  />
                  {searchingPatient && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPatientSearchModal(true)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-2"
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
                
                {patients.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <div
                        key={patient.patientid}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setPatients([]);
                          setPatientSearch("");
                        }}
                      >
                        <div className="font-medium">
                          {patient.firstname} {patient.middlename ? `${patient.middlename} ` : ''}{patient.lastname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {patient.nationalid && `ID: ${patient.nationalid}`}
                          {patient.dateofbirth && ` · DOB: ${new Date(patient.dateofbirth).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Show Add Patient button when search has no results */}
                {patientSearch.length >= 2 && patients.length === 0 && !searchingPatient && !showInlinePatientForm && (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Patient Not Found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          No patient found matching "{patientSearch}"
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleShowInlinePatientForm}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Patient
                      </Button>
                      <p className="text-xs text-gray-400">
                        This will open the patient registration form
                      </p>
                    </div>
                  </div>
                )}

                {/* Inline Patient Registration Form */}
                {showInlinePatientForm && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-white z-10 py-2 border-b">
                      <button
                        type="button"
                        onClick={handleCancelInlinePatientForm}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Search
                      </button>
                      <h3 className="text-base font-semibold text-gray-800">Register New Patient</h3>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <User size={14} />
                          Personal Information
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">First Name (Arabic) *</Label>
                            <Input
                              value={newPatientForm.first_name_ar}
                              onChange={(e) => setNewPatientForm({...newPatientForm, first_name_ar: e.target.value})}
                              placeholder="e.g., أحمد"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Last Name (Arabic) *</Label>
                            <Input
                              value={newPatientForm.last_name_ar}
                              onChange={(e) => setNewPatientForm({...newPatientForm, last_name_ar: e.target.value})}
                              placeholder="e.g., محمد"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Middle Name</Label>
                            <Input
                              value={newPatientForm.middle_name}
                              onChange={(e) => setNewPatientForm({...newPatientForm, middle_name: e.target.value})}
                              placeholder="e.g., عبد"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">First Name (English)</Label>
                            <Input
                              value={newPatientForm.first_name_en}
                              onChange={(e) => setNewPatientForm({...newPatientForm, first_name_en: e.target.value})}
                              placeholder="e.g., Ahmed"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Last Name (English)</Label>
                            <Input
                              value={newPatientForm.last_name_en}
                              onChange={(e) => setNewPatientForm({...newPatientForm, last_name_en: e.target.value})}
                              placeholder="e.g., Mohammed"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Date of Birth *</Label>
                            <Input
                              type="date"
                              value={newPatientForm.date_of_birth}
                              onChange={(e) => setNewPatientForm({...newPatientForm, date_of_birth: e.target.value})}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Gender *</Label>
                            <Select
                              value={newPatientForm.gender}
                              onValueChange={(value) => setNewPatientForm({...newPatientForm, gender: value})}
                            >
                              <SelectTrigger className="h-8 text-xs">
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
                            <Label className="text-xs">Blood Group</Label>
                            <Select
                              value={newPatientForm.blood_group}
                              onValueChange={(value) => setNewPatientForm({...newPatientForm, blood_group: value})}
                            >
                              <SelectTrigger className="h-8 text-xs">
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
                            <Label className="text-xs">National ID</Label>
                            <Input
                              value={newPatientForm.national_id}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 12) {
                                  setNewPatientForm({...newPatientForm, national_id: value});
                                }
                              }}
                              placeholder="e.g., 123456789012"
                              maxLength={12}
                              className={`h-8 text-xs font-mono ${
                                newPatientForm.national_id && newPatientForm.national_id.length !== 12 
                                  ? 'border-red-500 focus:border-red-500' 
                                  : ''
                              }`}
                            />
                            {newPatientForm.national_id && newPatientForm.national_id.length !== 12 && (
                              <p className="text-xs text-red-500 mt-1">
                                National ID must be exactly 12 digits ({newPatientForm.national_id.length}/12)
                              </p>
                            )}
                            {newPatientForm.national_id && newPatientForm.national_id.length === 12 && (
                              <p className="text-xs text-green-500 mt-1">
                                ✓ Valid format
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Phone size={14} />
                          Contact Information
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Phone Number *</Label>
                            <Input
                              type="tel"
                              value={newPatientForm.phone}
                              onChange={(e) => setNewPatientForm({...newPatientForm, phone: e.target.value})}
                              placeholder="e.g., +964 770 123 4567"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Email Address</Label>
                            <Input
                              type="email"
                              value={newPatientForm.email}
                              onChange={(e) => setNewPatientForm({...newPatientForm, email: e.target.value})}
                              placeholder="e.g., patient@email.com"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Governorate</Label>
                            <Input
                              value={newPatientForm.governorate}
                              onChange={(e) => setNewPatientForm({...newPatientForm, governorate: e.target.value})}
                              placeholder="e.g., Baghdad"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="lg:col-span-3">
                            <Label className="text-xs">Address</Label>
                            <Input
                              value={newPatientForm.address}
                              onChange={(e) => setNewPatientForm({...newPatientForm, address: e.target.value})}
                              placeholder="e.g., Street, District, City, Governorate"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Shield size={14} />
                          Emergency Contact
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Emergency Contact Name</Label>
                            <Input
                              value={newPatientForm.emergency_contact}
                              onChange={(e) => setNewPatientForm({...newPatientForm, emergency_contact: e.target.value})}
                              placeholder="e.g., Sarah Mohammed"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Emergency Contact Phone</Label>
                            <Input
                              type="tel"
                              value={newPatientForm.emergency_phone}
                              onChange={(e) => setNewPatientForm({...newPatientForm, emergency_phone: e.target.value})}
                              placeholder="e.g., +964 770 987 6543"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Insurance Information */}
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Shield size={14} />
                          Insurance Information
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Insurance Company</Label>
                            <Select
                              value={newPatientForm.insurance_company}
                              onValueChange={(value) => setNewPatientForm({...newPatientForm, insurance_company: value})}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select Insurance Company" />
                              </SelectTrigger>
                              <SelectContent>
                                {insuranceCompanies.map(company => (
                                  <SelectItem key={company.id || company.name} value={company.name}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Insurance Number</Label>
                            <div className="flex gap-2">
                              <Input
                                value={newPatientForm.insurance_number}
                                onChange={(e) => setNewPatientForm({...newPatientForm, insurance_number: e.target.value})}
                                placeholder="e.g., NAT001-12345-2024"
                                className="h-8 text-xs font-mono flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const selectedCompany = insuranceCompanies.find(c => c.name === newPatientForm.insurance_company);
                                  if (selectedCompany) {
                                    const companyCode = selectedCompany.code || selectedCompany.id?.replace('INS-', '') || 'UNK';
                                    const patientNumber = Math.floor(Math.random() * 90000) + 10000;
                                    const year = new Date().getFullYear();
                                    const insuranceNumber = `${companyCode}-${patientNumber}-${year}`;
                                    setNewPatientForm({...newPatientForm, insurance_number: insuranceNumber});
                                  }
                                }}
                                className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!newPatientForm.insurance_company}
                              >
                                <RefreshCw size={14} />
                              </button>
                            </div>
                            {newPatientForm.insurance_company && (
                              <p className="text-xs text-gray-500 mt-1">
                                Format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Medical Information */}
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <AlertCircle size={14} />
                          Medical Information
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <Label className="text-xs">Allergies</Label>
                          <Input
                            value={newPatientForm.allergies}
                            onChange={(e) => setNewPatientForm({...newPatientForm, allergies: e.target.value})}
                            placeholder="e.g., Penicillin, Peanuts, Shellfish"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Chronic Diseases</Label>
                          <Input
                            value={newPatientForm.chronic_diseases}
                            onChange={(e) => setNewPatientForm({...newPatientForm, chronic_diseases: e.target.value})}
                            placeholder="e.g., Diabetes, Hypertension, Asthma"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Current Medications</Label>
                          <Input
                            value={newPatientForm.current_medications}
                            onChange={(e) => setNewPatientForm({...newPatientForm, current_medications: e.target.value})}
                            placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Medical History</Label>
                          <Input
                            value={newPatientForm.medical_history}
                            onChange={(e) => setNewPatientForm({...newPatientForm, medical_history: e.target.value})}
                            placeholder="e.g., Previous surgeries, hospitalizations, major illnesses"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t sticky bottom-0 bg-white py-2">
                      <Button
                        type="button"
                        onClick={handleCancelInlinePatientForm}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveInlinePatientForm}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Register Patient
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div>
                  <div className="font-semibold text-blue-900">
                    {selectedPatient.firstname} {selectedPatient.middlename ? `${selectedPatient.middlename} ` : ''}{selectedPatient.lastname}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedPatient.nationalid && `ID: ${selectedPatient.nationalid}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change Patient
                </Button>
              </div>
            )}
          </div>

          {/* Medication Selection */}
          {!showInlinePatientForm && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Add Medications</Label>
            
            <div className="space-y-3">
              {/* Single Row: Medication Name, Quantity, Dose Amount, Dose Unit */}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Medication Name *</Label>
                  <DrugAutocomplete
                    workspaceid={workspaceid}
                    value={currentItem.drugname}
                    onChange={(value) =>
                      setCurrentItem({ ...currentItem, drugname: value })
                    }
                    onSelect={(drug) => {
                      console.log("Selected drug:", drug); // Debug log
                      
                      // Handle different route data formats
                      let route = "";
                      
                      if (drug.route) {
                        if (typeof drug.route === 'string') {
                          // If route is already a simple string like "oral"
                          if (!drug.route.includes('Route:')) {
                            route = drug.route.toLowerCase();
                          } else {
                            // If route is in format "Route: Oral"
                            const routeMatch = drug.route.match(/Route:\s*([^,]+)/i);
                            route = routeMatch ? routeMatch[1].trim().toLowerCase() : drug.route.toLowerCase();
                          }
                        }
                      }
                      
                      // Map route names to dropdown values
                      const routeMapping: { [key: string]: string } = {
                        'oral': 'Oral',
                        'parenteral': 'Parenteral', 
                        'nasal': 'Nasal',
                        'rectal': 'Rectal',
                        'vaginal': 'Vaginal',
                        'implant': 'Implant',
                        'inhalation': 'Inhalation',
                        'instillation': 'Instillation',
                        'sublingual': 'Sublingual',
                        'buccal': 'Sublingual',
                        'oromucosal': 'Sublingual',
                        'transdermal': 'Transdermal',
                        'intravenous': 'Parenteral',
                        'intramuscular': 'Parenteral',
                        'subcutaneous': 'Parenteral',
                        'topical': 'Transdermal'
                      };
                      
                      const formattedRoute = routeMapping[route] || route.charAt(0).toUpperCase() + route.slice(1);
                      const strengthMatch = drug.strength?.match(/^(\d+)/);
                      
                      // Improved dose unit logic
                      let doseUnit = "mg"; // default
                      if (drug.unit) {
                        // Use the unit from the drug data directly
                        doseUnit = drug.unit.toLowerCase();
                        // Normalize common units
                        if (doseUnit === 'tablet' || doseUnit === 'capsule') {
                          doseUnit = 'mg';
                        } else if (doseUnit === 'microgram') {
                          doseUnit = 'mcg';
                        } else if (doseUnit === 'milliliter') {
                          doseUnit = 'ml';
                        } else if (doseUnit === 'gram') {
                          doseUnit = 'g';
                        }
                      }
                      
                      console.log("Setting doseUnit to:", doseUnit); // Debug log
                      
                      setCurrentItem({
                        ...currentItem,
                        drugid: drug.drugid,
                        drugname: drug.name,
                        form: drug.form || "",
                        strength: drug.strength || "",
                        route: formattedRoute,
                        doseAmount: strengthMatch ? strengthMatch[1] : "",
                        doseUnit: doseUnit,
                        pharmacistNotes: "",
                      });
                    }}
                    placeholder="Search medication..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose Amount *</Label>
                  <Input
                    placeholder="e.g., 500"
                    value={currentItem.doseAmount}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, doseAmount: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose Unit *</Label>
                  <Select
                    value={currentItem.doseUnit}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, doseUnit: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="mcg">mcg</SelectItem>
                      <SelectItem value="U">U</SelectItem>
                      <SelectItem value="TU">TU</SelectItem>
                      <SelectItem value="MU">MU</SelectItem>
                      <SelectItem value="mmol">mmol</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Single Row: Route, Timing, Duration, Instructions, Usage, Valid Until */}
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <Label className="text-xs">Route *</Label>
                  <Select
                    value={currentItem.route}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, route: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Implant">Implant</SelectItem>
                      <SelectItem value="Inhalation">Inhalation</SelectItem>
                      <SelectItem value="Instillation">Instillation</SelectItem>
                      <SelectItem value="Nasal">Nasal</SelectItem>
                      <SelectItem value="Oral">Oral</SelectItem>
                      <SelectItem value="Parenteral">Parenteral</SelectItem>
                      <SelectItem value="Rectal">Rectal</SelectItem>
                      <SelectItem value="Sublingual">Sublingual</SelectItem>
                      <SelectItem value="Transdermal">Transdermal</SelectItem>
                      <SelectItem value="Vaginal">Vaginal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Timing *</Label>
                  <Select
                    value={currentItem.timingDirections}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, timingDirections: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Timing..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                      <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                      <SelectItem value="Every 12 hours">Every 12 hours</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                      <SelectItem value="When in pain">When in pain</SelectItem>
                      <SelectItem value="When fever rises">When fever rises</SelectItem>
                      <SelectItem value="Before sleep">Before sleep</SelectItem>
                      <SelectItem value="After meals">After meals</SelectItem>
                      <SelectItem value="Before meals">Before meals</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Duration</Label>
                  <Select
                    value={currentItem.directionDuration}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, directionDuration: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Duration..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3 days">3 days</SelectItem>
                      <SelectItem value="5 days">5 days</SelectItem>
                      <SelectItem value="7 days">7 days</SelectItem>
                      <SelectItem value="10 days">10 days</SelectItem>
                      <SelectItem value="2 weeks">2 weeks</SelectItem>
                      <SelectItem value="1 month">1 month</SelectItem>
                      <SelectItem value="Until finished">Until finished</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Select
                    value={currentItem.additionalInstruction}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, additionalInstruction: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Instructions..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Take with food">Take with food</SelectItem>
                      <SelectItem value="Take before meals">Take before meals</SelectItem>
                      <SelectItem value="Take after meals">Take after meals</SelectItem>
                      <SelectItem value="Take with plenty of water">Take with plenty of water</SelectItem>
                      <SelectItem value="Swallow whole, do not crush">Swallow whole, do not crush</SelectItem>
                      <SelectItem value="Chew well before swallowing">Chew well before swallowing</SelectItem>
                      <SelectItem value="Dissolve under tongue">Dissolve under tongue</SelectItem>
                      <SelectItem value="Shake well before use">Shake well before use</SelectItem>
                      <SelectItem value="Avoid driving after taking">Avoid driving after taking</SelectItem>
                      <SelectItem value="Avoid alcohol during treatment">Avoid alcohol during treatment</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Usage</Label>
                  <Select
                    value={currentItem.usage}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, usage: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Usage..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="For headache">For headache</SelectItem>
                      <SelectItem value="For fever">For fever</SelectItem>
                      <SelectItem value="For high blood pressure">For high blood pressure</SelectItem>
                      <SelectItem value="For diabetes">For diabetes</SelectItem>
                      <SelectItem value="For infection">For infection</SelectItem>
                      <SelectItem value="For asthma">For asthma</SelectItem>
                      <SelectItem value="For allergies">For allergies</SelectItem>
                      <SelectItem value="For stomach pain">For stomach pain</SelectItem>
                      <SelectItem value="For diarrhea">For diarrhea</SelectItem>
                      <SelectItem value="For anxiety">For anxiety</SelectItem>
                      <SelectItem value="For anemia">For anemia</SelectItem>
                      <SelectItem value="For vitamin deficiency">For vitamin deficiency</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valid Until</Label>
                  <Input
                    type="date"
                    value={currentItem.validUntil}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, validUntil: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            
            {/* PRN & Clinical Indication */}
            <div className="space-y-3">

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="asRequired"
                  checked={currentItem.asRequired}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, asRequired: e.target.checked })
                  }
                />
                <Label htmlFor="asRequired">As Required (PRN)</Label>
              </div>

              {currentItem.asRequired && (
                <div>
                  <Label>PRN Criterion</Label>
                  <Input
                    placeholder="e.g., for pain"
                    value={currentItem.asRequiredCriterion}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, asRequiredCriterion: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Input
                    placeholder="e.g., Take with food"
                    value={currentItem.additionalInstruction}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, additionalInstruction: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Clinical Indication</Label>
                  <Input
                    placeholder="e.g., Bacterial infection"
                    value={currentItem.clinicalIndication}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, clinicalIndication: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Pharmacist Notes */}
              <div>
                <Label className="text-xs">Pharmacist Notes</Label>
                <Input
                  placeholder="Add pharmacist notes for this medication..."
                  value={currentItem.pharmacistNotes}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, pharmacistNotes: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!currentItem.drugname || currentItem.quantity < 1}
              className=" w-full bg-gray-100 hover:bg-green-300 text-gray-900 gap-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Medication to Order
            </Button>
          </div>
          )}

          {/* Order Items List */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Order Items ({orderItems.length})</Label>
              <div className="border rounded-md divide-y">
                {orderItems.map((item, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.drugname}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} • {item.doseAmount} {item.doseUnit} • {item.route} • {item.timingDirections}
                      </div>
                      {item.pharmacistNotes && (
                        <div className="text-sm text-muted-foreground">
                          Pharmacist Notes: {item.pharmacistNotes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!showInlinePatientForm && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={handleSubmit}
              disabled={loading || !selectedPatient || orderItems.length === 0}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </div>
          )}
        </div>
      </DialogContent>
      </Dialog>

      {/* Patient Search Modal */}
      <PatientSearchModal
        isOpen={showPatientSearchModal}
        onClose={() => setShowPatientSearchModal(false)}
        onPatientSelect={handlePatientSelect}
        workspaceId={workspaceid}
      />
    </>
  );
}

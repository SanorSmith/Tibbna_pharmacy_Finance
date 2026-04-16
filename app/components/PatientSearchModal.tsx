'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, X, User, Phone, Calendar, MapPin, ArrowLeft, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  patientid: string;
  patient_number?: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  dateofbirth?: string;
  gender?: string;
  bloodgroup?: string;
  nationalid?: string;
  phone?: string;
  email?: string;
  address?: string;
  insurance_company?: string;
  insurance_number?: string;
  insurance_state?: string;
  emergency_contact?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  chronic_diseases?: string;
  current_medications?: string;
  medical_history?: string;
  createdat?: string;
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelect: (patient: Patient) => void;
  workspaceId: string;
}

export default function PatientSearchModal({ isOpen, onClose, onPatientSelect, workspaceId }: PatientSearchModalProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editablePatient, setEditablePatient] = useState<Patient | null>(null);
  const [showInlineForm, setShowInlineForm] = useState(false);
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
      const res = await fetch(`/api/d/${workspaceId}/insurance-companies`);
      if (res.ok) {
        const data = await res.json();
        setInsuranceCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
    }
  };

  useEffect(() => {
    if (isOpen && search.length >= 2) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [search, isOpen]);

  const searchPatients = async () => {
    if (search.length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/d/${workspaceId}/patients?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const data = await response.json();
        const patients = data.patients || [];
        setSearchResults(patients);
        
        if (patients.length === 0) {
          setShowAddPatient(true);
        } else {
          setShowAddPatient(false);
        }
      } else {
        toast.error('Failed to search patients');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearch('');
    setSearchResults([]);
    setShowAddPatient(false);
  };

  const handleAddPatient = () => {
    console.log('Add Patient button clicked!');
    // Show the inline form
    setShowInlineForm(true);
    setShowAddPatient(false);
  };

  const handleCancelInlineForm = () => {
    setShowInlineForm(false);
    setShowAddPatient(true);
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

  const handleSaveInlineForm = async () => {
    if (!newPatientForm.phone || !newPatientForm.date_of_birth || !newPatientForm.gender || !newPatientForm.first_name_ar || !newPatientForm.last_name_ar) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate national ID - must be exactly 12 digits if provided
    if (newPatientForm.national_id) {
      const nationalIdDigits = newPatientForm.national_id.replace(/\D/g, '');
      if (nationalIdDigits.length !== 12) {
        toast.error('National ID must be exactly 12 digits');
        return;
      }
      if (nationalIdDigits !== newPatientForm.national_id) {
        toast.error('National ID must contain only digits');
        return;
      }
    }

    // Validate insurance number format if provided
    if (newPatientForm.insurance_number && newPatientForm.insurance_company) {
      const insurancePattern = /^[A-Z0-9]{3,6}-\d{4,6}-\d{4}$/;
      if (!insurancePattern.test(newPatientForm.insurance_number)) {
        toast.error('Insurance number must follow format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)');
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
        toast.success('Patient created successfully');
        
        // Select the newly created patient
        const formattedPatient: Patient = {
          patientid: result.patient.patientid,
          firstname: result.patient.firstname,
          lastname: result.patient.lastname,
          dateofbirth: result.patient.dateofbirth,
        };
        
        setSelectedPatient(formattedPatient);
        setSearch(`${result.patient.firstname} ${result.patient.lastname}`);
        setShowInlineForm(false);
        setShowAddPatient(false);
        onPatientSelect(formattedPatient);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create patient');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save patient');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const normalizePhoneNumber = (phone?: string) => {
    if (!phone) return 'Not specified';
    
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('00964')) {
      return digits.substring(2); // Remove 00
    } else if (digits.startsWith('964')) {
      return digits;
    } else if (digits.startsWith('07')) {
      return '964' + digits.substring(1);
    } else if (digits.startsWith('7') && digits.length === 10) {
      return '964' + digits;
    }
    
    return digits;
  };

  const handleEditPatient = () => {
    if (!selectedPatient) return;
    
    setEditablePatient({
      ...selectedPatient,
      dateofbirth: selectedPatient.dateofbirth ? new Date(selectedPatient.dateofbirth).toISOString().split('T')[0] : ''
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editablePatient) return;

    try {
      const patientData = {
        firstname: editablePatient.firstname,
        middlename: editablePatient.middlename || '',
        lastname: editablePatient.lastname,
        dateofbirth: editablePatient.dateofbirth,
        gender: editablePatient.gender,
        bloodgroup: editablePatient.bloodgroup,
        phone: normalizePhoneNumber(editablePatient.phone),
        email: editablePatient.email,
        nationalid: editablePatient.nationalid,
        address: editablePatient.address,
        insurance_company: editablePatient.insurance_company || '',
        insurance_number: editablePatient.insurance_number || '',
        insurance_state: editablePatient.insurance_state || 'Not Available',
        emergency_contact: editablePatient.emergency_contact || '',
        emergency_contact_phone: editablePatient.emergency_contact_phone || '',
        allergies: editablePatient.allergies || '',
        chronic_diseases: editablePatient.chronic_diseases || '',
        current_medications: editablePatient.current_medications || '',
        medical_history: editablePatient.medical_history || '',
      };

      const response = await fetch(`/api/d/${workspaceId}/patients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editablePatient.patientid, ...patientData }),
      });

      if (response.ok) {
        toast.success('Patient information updated successfully');
        setSelectedPatient({ ...editablePatient });
        setEditMode(false);
        setEditablePatient(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update patient');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update patient');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditablePatient(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Patient Search</h2>
              <p className="text-sm text-gray-600 mt-1">Search for patients by name, ID, or phone number</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient by name or national ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Results</h3>
            <div className="space-y-3">
              {searchResults.map((patient) => (
                <div
                  key={patient.patientid}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-300 ${
                    selectedPatient?.patientid === patient.patientid ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                  }`}
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {patient.firstname} {patient.middlename} {patient.lastname}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        ID: {patient.patient_number || patient.patientid}
                      </div>
                      {patient.phone && (
                        <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                          <Phone size={12} />
                          {patient.phone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {patient.gender} {patient.dateofbirth && `· ${formatDate(patient.dateofbirth)}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results - Add Patient */}
        {showAddPatient && search.length >= 2 && searchResults.length === 0 && (
          <div className="p-6">
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Patient Not Found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    No patient found matching "{search}"
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPatient}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Patient
                </button>
                <p className="text-xs text-gray-400">
                  This will open the patient registration form
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inline Patient Registration Form */}
        {showInlineForm && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleCancelInlineForm}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Search
              </button>
              <h3 className="text-lg font-semibold text-gray-800">Register New Patient</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input
                  type="text"
                  value={newPatientForm.firstname}
                  onChange={(e) => setNewPatientForm({...newPatientForm, firstname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={newPatientForm.middlename}
                  onChange={(e) => setNewPatientForm({...newPatientForm, middlename: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Middle name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={newPatientForm.lastname}
                  onChange={(e) => setNewPatientForm({...newPatientForm, lastname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={newPatientForm.dateofbirth}
                  onChange={(e) => setNewPatientForm({...newPatientForm, dateofbirth: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select
                  value={newPatientForm.gender}
                  onChange={(e) => setNewPatientForm({...newPatientForm, gender: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                <select
                  value={newPatientForm.bloodgroup}
                  onChange={(e) => setNewPatientForm({...newPatientForm, bloodgroup: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">National ID</label>
                <input
                  type="text"
                  value={newPatientForm.nationalid}
                  onChange={(e) => setNewPatientForm({...newPatientForm, nationalid: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="National ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={newPatientForm.phone}
                  onChange={(e) => setNewPatientForm({...newPatientForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="07xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newPatientForm.email}
                  onChange={(e) => setNewPatientForm({...newPatientForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input
                  type="text"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({...newPatientForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Company</label>
                <input
                  type="text"
                  value={newPatientForm.insurance_company}
                  onChange={(e) => setNewPatientForm({...newPatientForm, insurance_company: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Insurance company"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Number</label>
                <input
                  type="text"
                  value={newPatientForm.insurance_number}
                  onChange={(e) => setNewPatientForm({...newPatientForm, insurance_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="Insurance number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Status</label>
                <select
                  value={newPatientForm.insurance_state}
                  onChange={(e) => setNewPatientForm({...newPatientForm, insurance_state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={newPatientForm.emergency_contact}
                  onChange={(e) => setNewPatientForm({...newPatientForm, emergency_contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Emergency contact name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={newPatientForm.emergency_contact_phone}
                  onChange={(e) => setNewPatientForm({...newPatientForm, emergency_contact_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allergies</label>
                <textarea
                  value={newPatientForm.allergies}
                  onChange={(e) => setNewPatientForm({...newPatientForm, allergies: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Penicillin, Peanuts"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chronic Diseases</label>
                <textarea
                  value={newPatientForm.chronic_diseases}
                  onChange={(e) => setNewPatientForm({...newPatientForm, chronic_diseases: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Diabetes, Hypertension"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Medications</label>
                <textarea
                  value={newPatientForm.current_medications}
                  onChange={(e) => setNewPatientForm({...newPatientForm, current_medications: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Metformin, Lisinopril"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Medical History</label>
                <textarea
                  value={newPatientForm.medical_history}
                  onChange={(e) => setNewPatientForm({...newPatientForm, medical_history: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Brief medical history"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancelInlineForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInlineForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Register Patient
              </button>
            </div>
          </div>
        )}

        {/* Selected Patient Details */}
        {selectedPatient && !editMode && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Patient Details</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleEditPatient}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => onPatientSelect(selectedPatient)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  Select Patient
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Personal Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Patient ID:</span>
                    <span className="text-sm font-medium">{selectedPatient.patient_number || selectedPatient.patientid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Full Name:</span>
                    <span className="text-sm font-medium">
                      {selectedPatient.firstname} {selectedPatient.middlename} {selectedPatient.lastname}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Gender:</span>
                    <span className="text-sm font-medium">{selectedPatient.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date of Birth:</span>
                    <span className="text-sm font-medium">{formatDate(selectedPatient.dateofbirth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Blood Group:</span>
                    <span className="text-sm font-medium">{selectedPatient.bloodgroup || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">National ID:</span>
                    <span className="text-sm font-medium">{selectedPatient.nationalid || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">{selectedPatient.phone || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{selectedPatient.email || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Address:</span>
                    <span className="text-sm font-medium">{selectedPatient.address || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Insurance Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Company:</span>
                    <span className="text-sm font-medium">{selectedPatient.insurance_company || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Number:</span>
                    <span className="text-sm font-medium">{selectedPatient.insurance_number || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium">{selectedPatient.insurance_state || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Emergency Contact</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{selectedPatient.emergency_contact || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">{selectedPatient.emergency_contact_phone || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Medical Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600 block mb-1">Allergies:</span>
                  <div className="text-sm bg-gray-50 p-2 rounded min-h-[40px]">
                    {selectedPatient.allergies || 'None specified'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 block mb-1">Chronic Diseases:</span>
                  <div className="text-sm bg-gray-50 p-2 rounded min-h-[40px]">
                    {selectedPatient.chronic_diseases || 'None specified'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 block mb-1">Current Medications:</span>
                  <div className="text-sm bg-gray-50 p-2 rounded min-h-[40px]">
                    {selectedPatient.current_medications || 'None specified'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 block mb-1">Medical History:</span>
                  <div className="text-sm bg-gray-50 p-2 rounded min-h-[40px]">
                    {selectedPatient.medical_history || 'None specified'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {editMode && editablePatient && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Edit Patient Information</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editablePatient.firstname || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, firstname: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={editablePatient.middlename || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, middlename: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editablePatient.lastname || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, lastname: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Demographics</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editablePatient.dateofbirth || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, dateofbirth: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                    <select
                      value={editablePatient.gender || 'MALE'}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, gender: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                    <select
                      value={editablePatient.bloodgroup || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, bloodgroup: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">National ID</label>
                    <input
                      type="text"
                      value={editablePatient.nationalid || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, nationalid: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editablePatient.phone || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, phone: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editablePatient.email || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, email: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={editablePatient.address || ''}
                      onChange={(e) => setEditablePatient(prev => prev ? {...prev, address: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, User, X, Calendar, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: any) => void;
  workspaceId: string;
}

export default function CreatePatientModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  workspaceId 
}: CreatePatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
    dateofbirth: '',
    gender: 'MALE',
    bloodgroup: '',
    nationalid: '',
    phone: '',
    email: '',
    address: '',
    insurance_company: '',
    insurance_number: '',
    insurance_state: 'Not Available',
    emergency_contact: '',
    emergency_contact_phone: '',
    allergies: '',
    chronic_diseases: '',
    current_medications: '',
    medical_history: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const normalizePhoneNumber = (phone: string): string => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstname || !formData.lastname || !formData.phone) {
      toast.error('Please fill in required fields (First Name, Last Name, Phone)');
      return;
    }

    setLoading(true);
    
    try {
      const patientData = {
        firstname: formData.firstname,
        middlename: formData.middlename || '',
        lastname: formData.lastname,
        dateofbirth: formData.dateofbirth,
        gender: formData.gender,
        bloodgroup: formData.bloodgroup,
        phone: normalizePhoneNumber(formData.phone),
        email: formData.email,
        nationalid: formData.nationalid,
        address: formData.address,
        insurance_company: formData.insurance_company || '',
        insurance_number: formData.insurance_number || '',
        insurance_state: formData.insurance_state || 'Not Available',
        emergency_contact: formData.emergency_contact || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
        allergies: formData.allergies || '',
        chronic_diseases: formData.chronic_diseases || '',
        current_medications: formData.current_medications || '',
        medical_history: formData.medical_history || '',
      };

      const response = await fetch(`/api/d/${workspaceId}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (response.ok) {
        const newPatient = await response.json();
        toast.success('Patient created successfully!');
        onSuccess(newPatient.patient);
        onClose();
        // Reset form
        setFormData({
          firstname: '',
          middlename: '',
          lastname: '',
          dateofbirth: '',
          gender: 'MALE',
          bloodgroup: '',
          nationalid: '',
          phone: '',
          email: '',
          address: '',
          insurance_company: '',
          insurance_number: '',
          insurance_state: 'Not Available',
          emergency_contact: '',
          emergency_contact_phone: '',
          allergies: '',
          chronic_diseases: '',
          current_medications: '',
          medical_history: '',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create patient');
      }
    } catch (error) {
      console.error('Create patient error:', error);
      toast.error('Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Patient
          </DialogTitle>
          <DialogDescription>
            Create a new patient record in the system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="firstname">First Name *</Label>
                <Input
                  id="firstname"
                  value={formData.firstname}
                  onChange={(e) => handleInputChange('firstname', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="middlename">Middle Name</Label>
                <Input
                  id="middlename"
                  value={formData.middlename}
                  onChange={(e) => handleInputChange('middlename', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastname">Last Name *</Label>
                <Input
                  id="lastname"
                  value={formData.lastname}
                  onChange={(e) => handleInputChange('lastname', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateofbirth">Date of Birth</Label>
                <Input
                  id="dateofbirth"
                  type="date"
                  value={formData.dateofbirth}
                  onChange={(e) => handleInputChange('dateofbirth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bloodgroup">Blood Group</Label>
                <Select value={formData.bloodgroup} onValueChange={(value) => handleInputChange('bloodgroup', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
                <Label htmlFor="nationalid">National ID</Label>
                <Input
                  id="nationalid"
                  value={formData.nationalid}
                  onChange={(e) => handleInputChange('nationalid', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="07xxxxxxxxx"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Insurance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insurance_company">Insurance Company</Label>
                <Input
                  id="insurance_company"
                  value={formData.insurance_company}
                  onChange={(e) => handleInputChange('insurance_company', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="insurance_number">Insurance Number</Label>
                <Input
                  id="insurance_number"
                  value={formData.insurance_number}
                  onChange={(e) => handleInputChange('insurance_number', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="insurance_state">Insurance Status</Label>
                <Select value={formData.insurance_state} onValueChange={(value) => handleInputChange('insurance_state', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                  placeholder="e.g., Penicillin, Peanuts"
                />
              </div>
              <div>
                <Label htmlFor="chronic_diseases">Chronic Diseases</Label>
                <Input
                  id="chronic_diseases"
                  value={formData.chronic_diseases}
                  onChange={(e) => handleInputChange('chronic_diseases', e.target.value)}
                  placeholder="e.g., Diabetes, Hypertension"
                />
              </div>
              <div>
                <Label htmlFor="current_medications">Current Medications</Label>
                <Input
                  id="current_medications"
                  value={formData.current_medications}
                  onChange={(e) => handleInputChange('current_medications', e.target.value)}
                  placeholder="e.g., Metformin, Lisinopril"
                />
              </div>
              <div>
                <Label htmlFor="medical_history">Medical History</Label>
                <Input
                  id="medical_history"
                  value={formData.medical_history}
                  onChange={(e) => handleInputChange('medical_history', e.target.value)}
                  placeholder="Brief medical history"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

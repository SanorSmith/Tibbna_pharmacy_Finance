'use client';

import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PatientSearchModal from './PatientSearchModal';

interface PatientSearchInputProps {
  workspaceId: string;
  onPatientSelect?: (patient: any) => void;
  placeholder?: string;
  className?: string;
}

export default function PatientSearchInput({ 
  workspaceId, 
  onPatientSelect, 
  placeholder = "Search patient by name or national ID...",
  className = ""
}: PatientSearchInputProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handlePatientSelect = (patient: any) => {
    setSearchValue(`${patient.firstname} ${patient.lastname}`);
    if (onPatientSelect) {
      onPatientSelect(patient);
    }
    setShowModal(false);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setShowModal(true)}
            className="pl-10 pr-4"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowModal(true)}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-2"
        >
          <Search className="h-3 w-3" />
        </Button>
      </div>

      <PatientSearchModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onPatientSelect={handlePatientSelect}
        workspaceId={workspaceId}
      />
    </>
  );
}

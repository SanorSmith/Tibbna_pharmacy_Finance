/**
 * Frontend Component: Global Patient Access Toggle
 * Allows users to switch between workspace-only and global patient views
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Users, Building2, Search } from "lucide-react";

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  nationalid?: string;
  workspaceid?: string;
  workspaceName?: string;
  isGlobal?: boolean;
  createdat: string;
}

interface GlobalPatientToggleProps {
  workspaceid: string;
  onPatientSelect?: (patient: Patient) => void;
}

export function GlobalPatientToggle({ workspaceid, onPatientSelect }: GlobalPatientToggleProps) {
  const [includeGlobal, setIncludeGlobal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState<any>(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeGlobal: includeGlobal.toString(),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/d/${workspaceid}/patients/enhanced?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    setIncludeGlobal(checked);
  };

  const handleSearch = () => {
    fetchPatients();
  };

  // Auto-fetch when toggle or search changes
  useState(() => {
    const timer = setTimeout(() => {
      if (patients.length > 0 || searchTerm) {
        fetchPatients();
      }
    }, 300);
    return () => clearTimeout(timer);
  });

  return (
    <div className="space-y-6">
      {/* Global Access Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Patient Access Mode
          </CardTitle>
          <CardDescription>
            Choose whether to include globally accessible patients in your search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="global-access"
              checked={includeGlobal}
              onCheckedChange={handleToggleChange}
            />
            <Label htmlFor="global-access" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Include Global Patients
            </Label>
          </div>
          
          {summary && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Total: {summary.total}</span>
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>Workspace: {summary.workspaceSpecific}</span>
              </div>
              {includeGlobal && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>Global: {summary.global}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Results */}
      <Card>
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name or National ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-gray-600">Searching patients...</p>
            </div>
          )}

          {!loading && patients.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Results ({patients.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {patients.map((patient) => (
                  <div
                    key={patient.patientid}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => onPatientSelect?.(patient)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {patient.firstname} {patient.lastname}
                      </div>
                      <div className="text-sm text-gray-600">
                        {patient.nationalid && `ID: ${patient.nationalid}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {patient.isGlobal ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {patient.workspaceName || 'Workspace'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && patients.length === 0 && searchTerm && (
            <div className="text-center py-4 text-gray-500">
              No patients found matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

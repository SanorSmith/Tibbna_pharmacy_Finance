/**
 * Admin Component: Global Patient Management
 * Allows admins to convert workspace patients to global patients
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Globe, Users, Building2, AlertTriangle, CheckCircle } from "lucide-react";

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  nationalid?: string;
  workspaceid: string;
  workspaceName: string;
  createdat: string;
}

interface PatientsByWorkspace {
  [workspaceName: string]: Patient[];
}

export function GlobalPatientManager() {
  const [patientsByWorkspace, setPatientsByWorkspace] = useState<PatientsByWorkspace>({});
  const [loading, setLoading] = useState(false);
  const [makingGlobal, setMakingGlobal] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/patients/make-global');
      if (response.ok) {
        const data = await response.json();
        setPatientsByWorkspace(data.patientsByWorkspace);
        setSummary(data.summary);
        setSelectedPatients([]);
        setResult(null);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const handleWorkspaceSelect = (workspaceName: string, checked: boolean) => {
    const workspacePatients = patientsByWorkspace[workspaceName] || [];
    if (checked) {
      const newSelected = workspacePatients.map(p => p.patientid);
      setSelectedPatients(prev => [...new Set([...prev, ...newSelected])]);
    } else {
      const workspaceIds = new Set(workspacePatients.map(p => p.patientid));
      setSelectedPatients(prev => prev.filter(id => !workspaceIds.has(id)));
    }
  };

  const makeGlobal = async (makeAll: boolean = false) => {
    setMakingGlobal(true);
    try {
      const payload = makeAll 
        ? { makeAllGlobal: true }
        : { patientIds: selectedPatients };

      const response = await fetch('/api/admin/patients/make-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        // Refresh the patient list
        await fetchPatients();
      }
    } catch (error) {
      console.error("Failed to make patients global:", error);
    } finally {
      setMakingGlobal(false);
    }
  };

  const totalPatients = Object.values(patientsByWorkspace).reduce((sum, patients) => sum + patients.length, 0);
  const allSelected = selectedPatients.length === totalPatients && totalPatients > 0;
  const someSelected = selectedPatients.length > 0 && selectedPatients.length < totalPatients;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Patient Management
          </CardTitle>
          <CardDescription>
            Convert workspace-specific patients to globally accessible patients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={fetchPatients} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              Refresh Patients
            </Button>
            
            {totalPatients > 0 && (
              <>
                <Button 
                  onClick={() => makeGlobal(false)} 
                  disabled={makingGlobal || selectedPatients.length === 0}
                  variant="default"
                >
                  {makingGlobal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                  Make {selectedPatients.length} Global
                </Button>
                
                <Button 
                  onClick={() => makeGlobal(true)} 
                  disabled={makingGlobal}
                  variant="destructive"
                >
                  {makingGlobal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                  Make All Global
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.totalWorkspaces}</div>
                <div className="text-sm text-muted-foreground">Workspaces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalPatients}</div>
                <div className="text-sm text-muted-foreground">Total Patients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedPatients.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{((selectedPatients.length / totalPatients) * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Alert className={result.updatedCount > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">{result.message}</div>
              {result.updatedCount > 0 && (
                <div className="text-sm">
                  Successfully converted <span className="font-bold">{result.updatedCount}</span> patients to global access
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Patients List */}
      {Object.keys(patientsByWorkspace).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              ref={(indeterminate) => {
                if (indeterminate) indeterminate.indeterminate = someSelected;
              }}
              onCheckedChange={(checked) => {
                if (checked) {
                  const allIds = Object.values(patientsByWorkspace).flat().map(p => p.patientid);
                  setSelectedPatients(allIds);
                } else {
                  setSelectedPatients([]);
                }
              }}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All Patients ({totalPatients})
            </label>
          </div>

          {Object.entries(patientsByWorkspace).map(([workspaceName, patients]) => (
            <Card key={workspaceName}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {workspaceName}
                  </div>
                  <Badge variant="outline">{patients.length} patients</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`workspace-${workspaceName}`}
                    checked={patients.every(p => selectedPatients.includes(p.patientid))}
                    onCheckedChange={(checked) => handleWorkspaceSelect(workspaceName, checked as boolean)}
                  />
                  <label htmlFor={`workspace-${workspaceName}`} className="text-sm font-medium">
                    Select All in {workspaceName}
                  </label>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {patients.map((patient) => (
                    <div
                      key={patient.patientid}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedPatients.includes(patient.patientid)}
                          onCheckedChange={(checked) => handlePatientSelect(patient.patientid, checked as boolean)}
                        />
                        <div>
                          <div className="font-medium">
                            {patient.firstname} {patient.lastname}
                          </div>
                          <div className="text-sm text-gray-600">
                            {patient.nationalid && `ID: ${patient.nationalid}`}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {new Date(patient.createdat).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {Object.keys(patientsByWorkspace).length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Workspace Patients Found</h3>
            <p className="text-gray-600">
              All patients are already global or no patients exist in the system.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

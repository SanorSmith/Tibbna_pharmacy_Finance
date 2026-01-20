"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History, Edit } from "lucide-react";

export interface DiagnosisRecord {
  composition_uid: string;
  recorded_time: string;
  problem_diagnosis: string;
  clinical_status: string;
  clinical_description?: string;
  body_site?: string;
  date_of_onset?: string;
  date_of_resolution?: string;
  severity?: string;
  comment?: string;
}

interface DiagnosticsTabProps {
  diagnoses: DiagnosisRecord[];
  loadingDiagnoses: boolean;
  loadingMoreDiagnoses: boolean;
  loadDiagnoses: (reset?: boolean) => void;
  diagnosesHasMore: boolean;
  selectedDiagnosis: DiagnosisRecord | null;
  setSelectedDiagnosis: (diagnosis: DiagnosisRecord | null) => void;
  showDiagnosisDetails: boolean;
  setShowDiagnosisDetails: (show: boolean) => void;
  workspaceid: string;
  patientid: string;
  patient: { patientid: string };
}

export function DiagnosticsTab({
  diagnoses,
  loadingDiagnoses,
  loadingMoreDiagnoses,
  loadDiagnoses,
  diagnosesHasMore,
  selectedDiagnosis,
  setSelectedDiagnosis,
  showDiagnosisDetails,
  setShowDiagnosisDetails,
  workspaceid,
  patient,
}: DiagnosticsTabProps) {
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState<DiagnosisRecord | null>(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState({
    problemDiagnosis: "",
    clinicalStatus: "active",
    dateOfOnset: "",
    dateOfResolution: "",
    clinicalDescription: "",
    bodySite: "",
    comment: "",
  });

  return (
    <div className="space-y-4">
       <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">Diagnostics</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                className="bg-blue-500 hover:bg-blue-700 text-white flex items-center gap-1"
                size="sm" 
                onClick={() => setShowDiagnosisForm(true)}
              >
                <Plus className="h-4 w-4" />
                Add Diagnosis
              </Button>

              {diagnosesHasMore && (
                <Button
                  onClick={() => loadDiagnoses(false)}
                  disabled={loadingMoreDiagnoses}
                  variant="outline"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-2"
                >
                  {loadingMoreDiagnoses ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4" />
                      History
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDiagnoses ? (
            <div className="text-center py-8 text-muted-foreground">Loading diagnoses...</div>
          ) : diagnoses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No diagnoses have been recorded yet</div>
              <Button size="sm" onClick={() => setShowDiagnosisForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white">
                Add First Diagnosis
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-semibold bg-blue-100/90 text-blue-800">
                    <th className="text-left p-3 font-medium">Diagnosis</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date Recorded</th>
                    <th className="text-left p-3 font-medium">Onset</th>
                    <th className="text-left p-3 font-medium">Body Site</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((diagnosis, index) => (
                    <tr key={diagnosis.composition_uid} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'} hover:bg-muted/50 transition-colors`}>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{diagnosis.problem_diagnosis}</div>
                          {diagnosis.clinical_description && (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {diagnosis.clinical_description}
                            </div>
                          )}
                        </div>
                        {diagnosis.severity && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Severity: {diagnosis.severity}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={(() => {
                            const base = "px-2 py-1 text-xs rounded-full capitalize font-medium";
                            switch (diagnosis.clinical_status?.toLowerCase()) {
                              case "active":
                                return `${base} bg-green-200 text-green-800`;
                              case "inactive":
                                return `${base} bg-gray-200 text-gray-700`;
                              case "resolved":
                                return `${base} bg-blue-200 text-blue-800`;
                              case "recurrence":
                                return `${base} bg-orange-200 text-orange-800`;
                              case "relapse":
                                return `${base} bg-red-200 text-red-800`;
                              case "remission":
                                return `${base} bg-emerald-200 text-emerald-800`;
                              default:
                                return `${base} bg-slate-200 text-slate-800`;
                            }
                          })()}
                        >
                          {diagnosis.clinical_status}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(diagnosis.recorded_time).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm">
                        {diagnosis.date_of_onset 
                          ? new Date(diagnosis.date_of_onset).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="p-3 text-sm">
                        {diagnosis.body_site || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDiagnosis(diagnosis);
                              setShowDiagnosisDetails(true);
                            }}
                            className="bg-blue-100/90 hover:bg-blue-200"
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDiagnosis(diagnosis);
                              setDiagnosisForm({
                                problemDiagnosis: diagnosis.problem_diagnosis,
                                clinicalStatus: diagnosis.clinical_status,
                                dateOfOnset: diagnosis.date_of_onset ? new Date(diagnosis.date_of_onset).toISOString().split('T')[0] : "",
                                dateOfResolution: diagnosis.date_of_resolution ? new Date(diagnosis.date_of_resolution).toISOString().split('T')[0] : "",
                                clinicalDescription: diagnosis.clinical_description || "",
                                bodySite: diagnosis.body_site || "",
                                comment: diagnosis.comment || "",
                              });
                              setShowDiagnosisForm(true);
                            }}
                            className="bg-blue-100/90 hover:bg-blue-200"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnosis Details Dialog */}
      <Dialog open={showDiagnosisDetails} onOpenChange={setShowDiagnosisDetails}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnosis Details</DialogTitle>
            <DialogDescription>
              Complete information about this diagnosis
            </DialogDescription>
          </DialogHeader>
          {selectedDiagnosis && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Diagnosis Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Problem/Diagnosis:</span>
                    <p className="font-medium">{selectedDiagnosis.problem_diagnosis}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Clinical Status:</span>
                    <p className="font-medium">{selectedDiagnosis.clinical_status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Date of Onset:</span>
                    <p className="font-medium">{selectedDiagnosis.date_of_onset || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Date of Resolution:</span>
                    <p className="font-medium">{selectedDiagnosis.date_of_resolution || 'Not resolved'}</p>
                  </div>
                </div>
              </div>

              {selectedDiagnosis.clinical_description && (
                <div>
                  <h4 className="font-medium">Clinical Description</h4>
                  <p className="text-sm mt-1">{selectedDiagnosis.clinical_description}</p>
                </div>
              )}

              {selectedDiagnosis.body_site && (
                <div>
                  <h4 className="font-medium">Body Site</h4>
                  <p className="text-sm mt-1">{selectedDiagnosis.body_site}</p>
                </div>
              )}

              {selectedDiagnosis.comment && (
                <div>
                  <h4 className="font-medium">Additional Comments</h4>
                  <p className="text-sm mt-1">{selectedDiagnosis.comment}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Created:</span>
                    <p className="text-sm">{new Date(selectedDiagnosis.recorded_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Last Updated:</span>
                    <p className="text-sm">{new Date(selectedDiagnosis.recorded_time).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiagnosisDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diagnosis Form Dialog */}
      <Dialog open={showDiagnosisForm} onOpenChange={setShowDiagnosisForm}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDiagnosis ? "Edit Diagnosis" : "Add New Diagnosis"}</DialogTitle>
            <DialogDescription>
              {editingDiagnosis ? "Update diagnosis information" : "Based on openEHR Problem/Diagnosis archetype"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Problem/Diagnosis Name */}
            <div>
              <label htmlFor="problemDiagnosis" className="text-sm font-medium">
                Problem/Diagnosis Name *
              </label>
              <input
                id="problemDiagnosis"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="e.g., Type 2 Diabetes Mellitus"
                value={diagnosisForm.problemDiagnosis}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    problemDiagnosis: e.target.value,
                  })
                }
                aria-label="Problem or diagnosis name"
                title="Enter the name of the problem or diagnosis (preferably coded with ICD-10 or SNOMED CT)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The name of the problem or diagnosis (preferably coded with
                ICD-10 or SNOMED CT)
              </p>
            </div>

            {/* Clinical Status */}
            <div>
              <label htmlFor="clinicalStatus" className="text-sm font-medium">
                Clinical Status *
              </label>
              <select
                id="clinicalStatus"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={diagnosisForm.clinicalStatus}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    clinicalStatus: e.target.value,
                  })
                }
                aria-label="Clinical status of diagnosis"
                title="Select the clinical status of the problem or diagnosis"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resolved">Resolved</option>
                <option value="recurrence">Recurrence</option>
                <option value="relapse">Relapse</option>
                <option value="remission">Remission</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                The clinical status of the problem or diagnosis
              </p>
            </div>

            {/* Date of Onset */}
            <div>
              <label className="text-sm font-medium">
                Date of Onset
              </label>
              <input
                id="dateOfOnset"
                type="date"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={diagnosisForm.dateOfOnset}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    dateOfOnset: e.target.value,
                  })
                }
                aria-label="Date of onset"
                title="Select the date when the problem or diagnosis was first identified"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The date/time when the problem or diagnosis was first
                identified
              </p>
            </div>

            {/* Body Site */}
            <div>
              <label htmlFor="bodySite" className="text-sm font-medium">
                Body Site
              </label>
              <input
                id="bodySite"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="e.g., Left foot, Right arm, Abdomen"
                value={diagnosisForm.bodySite}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    bodySite: e.target.value,
                  })
                }
                aria-label="Body site"
                title="Enter the anatomical location of the problem or diagnosis"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The anatomical location of the problem or diagnosis
              </p>
            </div>

            {/* Clinical Description */}
            <div>
              <label htmlFor="clinicalDescription" className="text-sm font-medium">
                Clinical Description
              </label>
              <textarea
                id="clinicalDescription"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="Detailed clinical description..."
                rows={3}
                value={diagnosisForm.clinicalDescription}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    clinicalDescription: e.target.value,
                  })
                }
                aria-label="Clinical description"
                title="Enter a detailed clinical description of the problem or diagnosis"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Narrative description of the problem or diagnosis
              </p>
            </div>

            {/* Comment */}
            <div>
              <label htmlFor="comment" className="text-sm font-medium">
                Additional Comments
              </label>
              <textarea
                id="comment"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="Any additional notes..."
                rows={2}
                value={diagnosisForm.comment}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    comment: e.target.value,
                  })
                }
                aria-label="Additional comments"
                title="Enter any additional comments or notes"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Additional narrative about the problem or diagnosis
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDiagnosisForm(false);
                  setEditingDiagnosis(null);
                  setDiagnosisForm({
                    problemDiagnosis: "",
                    clinicalStatus: "active",
                    dateOfOnset: "",
                    dateOfResolution: "",
                    clinicalDescription: "",
                    bodySite: "",
                    comment: "",
                  });
                }}
                className="bg-blue-200/90 hover:bg-blue-300"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600/90 hover:bg-blue-800"
                onClick={async () => {
                  if (savingDiagnosis) {
                    return;
                  }

                  if (!diagnosisForm.problemDiagnosis) {
                    alert("Please enter a problem/diagnosis name");
                    return;
                  }

                  try {
                    setSavingDiagnosis(true);
                    const url = `/api/d/${workspaceid}/patients/${patient.patientid}/diagnoses`;
                    const method = editingDiagnosis ? "PUT" : "POST";
                    const body = editingDiagnosis 
                      ? { ...diagnosisForm, composition_uid: editingDiagnosis.composition_uid }
                      : diagnosisForm;

                    const response = await fetch(url, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.error || `Failed to ${editingDiagnosis ? 'update' : 'save'} diagnosis`
                      );
                    }

                    setShowDiagnosisForm(false);
                    setEditingDiagnosis(null);
                    setDiagnosisForm({
                      problemDiagnosis: "",
                      clinicalStatus: "active",
                      dateOfOnset: "",
                      dateOfResolution: "",
                      clinicalDescription: "",
                      bodySite: "",
                      comment: "",
                    });
                    loadDiagnoses(true); // Force reload with reset=true
                  } catch (error) {
                    console.error(`Error ${editingDiagnosis ? 'updating' : 'saving'} diagnosis:`, error);
                    alert(
                      error instanceof Error
                        ? error.message
                        : `Failed to ${editingDiagnosis ? 'update' : 'save'} diagnosis`
                    );
                  } finally {
                    setSavingDiagnosis(false);
                  }
                }}
                disabled={savingDiagnosis}
              >
                {savingDiagnosis
                  ? editingDiagnosis
                    ? "Updating..."
                    : "Saving..."
                  : editingDiagnosis
                    ? "Update Diagnosis"
                    : "Add Diagnosis"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

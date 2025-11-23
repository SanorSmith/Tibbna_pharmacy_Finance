"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, History, FileText } from "lucide-react";

interface DiagnosisRecord {
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
  showDiagnosisForm: boolean;
  setShowDiagnosisForm: (show: boolean) => void;
  loadDiagnoses: (reset?: boolean) => void;
  diagnosesHasMore: boolean;
  selectedDiagnosis: DiagnosisRecord | null;
  setSelectedDiagnosis: (diagnosis: DiagnosisRecord | null) => void;
  showDiagnosisDetails: boolean;
  setShowDiagnosisDetails: (show: boolean) => void;
}

export function DiagnosticsTab({
  diagnoses,
  loadingDiagnoses,
  loadingMoreDiagnoses,
  showDiagnosisForm,
  setShowDiagnosisForm,
  loadDiagnoses,
  diagnosesHasMore,
  selectedDiagnosis,
  setSelectedDiagnosis,
  showDiagnosisDetails,
  setShowDiagnosisDetails,
}: DiagnosticsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
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
              <Button size="sm" onClick={() => setShowDiagnosisForm(true)}>
                Add First Diagnosis
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDiagnosis(diagnosis);
                            setShowDiagnosisDetails(true);
                          }}
                        >
                          Details
                        </Button>
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
      {showDiagnosisDetails && selectedDiagnosis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Diagnosis Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnosisDetails(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Diagnosis</h3>
                <p className="text-lg">{selectedDiagnosis.problem_diagnosis}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                  <p className="capitalize">{selectedDiagnosis.clinical_status}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Date Recorded</h3>
                  <p>{new Date(selectedDiagnosis.recorded_time).toLocaleDateString()}</p>
                </div>
                {selectedDiagnosis.date_of_onset && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Date of Onset</h3>
                    <p>{new Date(selectedDiagnosis.date_of_onset).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedDiagnosis.date_of_resolution && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Date of Resolution</h3>
                    <p>{new Date(selectedDiagnosis.date_of_resolution).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedDiagnosis.severity && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Severity</h3>
                    <p>{selectedDiagnosis.severity}</p>
                  </div>
                )}
                {selectedDiagnosis.body_site && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Body Site</h3>
                    <p>{selectedDiagnosis.body_site}</p>
                  </div>
                )}
              </div>
              
              {selectedDiagnosis.clinical_description && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Clinical Description</h3>
                  <p>{selectedDiagnosis.clinical_description}</p>
                </div>
              )}
              
              {selectedDiagnosis.comment && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Comments</h3>
                  <p>{selectedDiagnosis.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

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
import { Plus, History } from "lucide-react";

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
  showDiagnosisForm: boolean;
  setShowDiagnosisForm: (show: boolean) => void;
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
  setShowDiagnosisForm,
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
      <Dialog open={showDiagnosisDetails} onOpenChange={setShowDiagnosisDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}

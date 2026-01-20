/**
 * Worklist Validation Modal Component
 * Shows patient information and test results for validation in a modal
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ChevronLeft, ChevronRight, Printer, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  dateofbirth: string;
  gender: string;
  age: number;
}

interface Sample {
  sampleid: string;
  samplenumber: string;
  sampletype: string;
  collectiondate: string;
}

interface TestResult {
  resultid: string | null;
  testcode: string;
  testname: string;
  resultvalue: string | null;
  unit: string | null;
  referencemin: number | null;
  referencemax: number | null;
  referencerange: string | null;
  flag: string;
  isabormal: boolean;
  iscritical: boolean;
  status: string;
  hasResult?: boolean;
}

interface WorklistItem {
  worklistitemid: string;
  sampleid: string;
  sample: Sample;
  patient: Patient | null;
  results: TestResult[];
}

interface WorklistValidationModalProps {
  workspaceid: string;
  worklistid: string | null;
  selectedSample?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WorklistValidationModal({
  workspaceid,
  worklistid,
  selectedSample,
  open,
  onOpenChange,
}: WorklistValidationModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [editedResults, setEditedResults] = useState<Record<string, string>>({});

  // Fetch worklist items with patient and sample data
  const { data: worklistData, isLoading, error } = useQuery({
    queryKey: ["worklist-detail", worklistid, workspaceid, selectedSample?.sampleid],
    queryFn: async () => {
      // If individual sample is provided, use it directly
      if (selectedSample) {
        return { items: [selectedSample] };
      }
      
      // Otherwise fetch from worklist
      if (!worklistid) return null;
      const response = await fetch(`/api/lims/worklist/${worklistid}?workspaceid=${workspaceid}`);
      if (!response.ok) {
        throw new Error("Failed to fetch worklist");
      }
      return response.json();
    },
    enabled: (!!worklistid || !!selectedSample) && open,
  });

  const items: WorklistItem[] = worklistData?.items || [];
  
  // Filter items by search term
  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const patientName = item.patient 
      ? `${item.patient.firstname} ${item.patient.lastname}`.toLowerCase()
      : "";
    return (
      patientName.includes(search) ||
      item.patient?.patientid.toLowerCase().includes(search) ||
      item.sample.samplenumber.toLowerCase().includes(search)
    );
  });

  const currentItem = filteredItems[currentIndex];

  // Release result mutation
  const releaseMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'released' }),
      });
      if (!response.ok) throw new Error('Failed to release result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
    },
  });

  // Reject result mutation
  const rejectMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      setShowRejectDialog(false);
    },
  });

  // Rerun result mutation
  const rerunMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rerun_requested' }),
      });
      if (!response.ok) throw new Error('Failed to request rerun');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      setShowRerunDialog(false);
    },
  });

  // Save bulk results mutation
  const saveResultsMutation = useMutation({
    mutationFn: async () => {
      if (!currentItem) return;
      
      const resultsToSave = currentItem.results
        .filter(result => !result.hasResult && result.testcode)
        .map(result => {
          const resultKey = `${currentItem.sampleid}-${result.testcode}`;
          const enteredValue = editedResults[resultKey];
          
          if (!enteredValue) return null;
          
          return {
            testcode: result.testcode,
            testname: result.testname,
            resultvalue: enteredValue,
            unit: result.unit,
            referencemin: result.referencemin,
            referencemax: result.referencemax,
            referencerange: result.referencerange,
          };
        })
        .filter(r => r !== null);

      if (resultsToSave.length === 0) {
        throw new Error('No results to save');
      }

      const response = await fetch('/api/lims/test-results/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleid: currentItem.sampleid,
          workspaceid: workspaceid,
          results: resultsToSave,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save results');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      setEditedResults({});
    },
  });

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!open || (!worklistid && !selectedSample)) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSample ? 'Sample Validation' : 'Worklist Validation'}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Error loading worklist data
            </div>
          ) : !currentItem ? (
            <div className="text-center py-8 text-muted-foreground">
              No samples found in this worklist
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and Navigation - Only show for worklists with multiple samples */}
              {!selectedSample && filteredItems.length > 1 && (
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by patient name, ID, or sample number..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentIndex(0);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNext}
                      disabled={currentIndex === filteredItems.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Patient Information */}
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg">Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {currentItem.patient ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {currentItem.patient.firstname} {currentItem.patient.lastname}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{currentItem.patient.age} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{currentItem.patient.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sample ID</p>
                        <p className="font-medium font-mono">{currentItem.sample.samplenumber}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No patient information available</p>
                  )}
                </CardContent>
              </Card>

              {/* Test Results Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-100 hover:bg-blue-100">
                        <TableHead className="font-bold">Sample ID</TableHead>
                        <TableHead className="font-bold">Test name</TableHead>
                        <TableHead className="font-bold">gender</TableHead>
                        <TableHead className="font-bold">Results</TableHead>
                        <TableHead className="font-bold">Units</TableHead>
                        <TableHead className="font-bold">referent interval</TableHead>
                        <TableHead className="font-bold">previous results</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItem.results && currentItem.results.length > 0 ? (
                        currentItem.results.map((result, index) => {
                          const hasResult = result.hasResult !== false;
                          const resultKey = `${currentItem.sampleid}-${result.testcode}`;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {currentItem.sample.samplenumber}
                              </TableCell>
                              <TableCell className="font-medium">
                                {result.testname}
                              </TableCell>
                              <TableCell className="uppercase text-sm">
                                {currentItem.patient?.gender || '-'}
                              </TableCell>
                              <TableCell>
                                {hasResult ? (
                                  <div className="flex items-center gap-2">
                                    {result.resultvalue || "-"}
                                    {result.iscritical && (
                                      <div className="w-3 h-3 bg-red-600 rounded-sm" />
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {result.referencerange === 'Descriptive result' || result.unit === 'N/A' ? (
                                      <textarea
                                        placeholder="Enter descriptive result"
                                        value={editedResults[resultKey] || ""}
                                        onChange={(e) => setEditedResults(prev => ({
                                          ...prev,
                                          [resultKey]: e.target.value
                                        }))}
                                        className="w-64 min-h-[60px] px-3 py-2 text-sm border rounded-md"
                                        rows={2}
                                      />
                                    ) : (
                                      <>
                                        <Input
                                          type="text"
                                          placeholder="Enter result"
                                          value={editedResults[resultKey] || ""}
                                          onChange={(e) => setEditedResults(prev => ({
                                            ...prev,
                                            [resultKey]: e.target.value
                                          }))}
                                          className="w-32"
                                        />
                                        {result.unit && result.unit !== 'N/A' && (
                                          <span className="text-sm text-muted-foreground">
                                            {result.unit}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {result.unit && result.unit !== 'N/A' ? result.unit : "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {result.referencemin !== null && result.referencemax !== null
                                    ? `${result.referencemin}-${result.referencemax}${result.unit && result.unit !== 'N/A' ? ' ' + result.unit : ""}`
                                    : result.referencerange || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">-</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <div>
                              <p className="font-medium">No test results available</p>
                              <p className="text-sm">This sample has no requested tests or results</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Save Results Button */}
              {Object.keys(editedResults).length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => saveResultsMutation.mutate()}
                    disabled={saveResultsMutation.isPending}
                  >
                    {saveResultsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Results'
                    )}
                  </Button>
                </div>
              )}

            </div>
          )}

          {/* Dialog Footer with Action Buttons */}
          {!isLoading && !error && currentItem && (
            <DialogFooter className="flex justify-between items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;

                  const patientInfo = currentItem.patient 
                    ? `${currentItem.patient.firstname} ${currentItem.patient.lastname} (${currentItem.patient.age}y, ${currentItem.patient.gender})`
                    : 'Unknown Patient';

                  const resultsHTML = currentItem.results.map(result => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">${currentItem.sample.samplenumber}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${result.testname}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${result.resultvalue || '-'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${result.unit || '-'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${result.referencemin !== null && result.referencemax !== null
                          ? `${result.referencemin}-${result.referencemax} ${result.unit || ''}`
                          : result.referencerange || '-'}
                      </td>
                    </tr>
                  `).join('');

                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Test Results - ${currentItem.sample.samplenumber}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          h1 { color: #333; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th { background-color: #4E95D9; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
                          td { padding: 8px; border: 1px solid #ddd; }
                          .info { margin-bottom: 20px; }
                          .info p { margin: 5px 0; }
                        </style>
                      </head>
                      <body>
                        <h1>Laboratory Test Results</h1>
                        <div class="info">
                          <p><strong>Patient:</strong> ${patientInfo}</p>
                          <p><strong>Sample ID:</strong> ${currentItem.sample.samplenumber}</p>
                          <p><strong>Sample Type:</strong> ${currentItem.sample.sampletype}</p>
                          <p><strong>Collection Date:</strong> ${new Date(currentItem.sample.collectiondate).toLocaleString()}</p>
                          <p><strong>Print Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>Sample ID</th>
                              <th>Test Name</th>
                              <th>Result</th>
                              <th>Units</th>
                              <th>Reference Interval</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${resultsHTML}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Results
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    currentItem.results.forEach(result => {
                      if (result.resultid && result.status !== 'released') {
                        releaseMutation.mutate(result.resultid);
                      }
                    });
                  }}
                  disabled={releaseMutation.isPending}
                >
                  Release
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRerunDialog(true)}
                >
                  Rerun
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Results</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject these test results? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedResultId) {
                  rejectMutation.mutate(selectedResultId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rerun Confirmation Dialog */}
      <AlertDialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Rerun</AlertDialogTitle>
            <AlertDialogDescription>
              Request to rerun these tests? The sample will be re-analyzed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedResultId) {
                  rerunMutation.mutate(selectedResultId);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Request Rerun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

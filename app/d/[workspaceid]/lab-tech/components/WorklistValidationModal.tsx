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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, ChevronLeft, ChevronRight, Printer, X, Upload } from "lucide-react";
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
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [changeComment, setChangeComment] = useState<string>("");
  const [pendingResultUpdate, setPendingResultUpdate] = useState<{resultId: string, newValue: string} | null>(null);
  const [showOpenEHRDialog, setShowOpenEHRDialog] = useState(false);
  const [openEHRConclusion, setOpenEHRConclusion] = useState<string>("");
  const [openEHRStatus, setOpenEHRStatus] = useState<"preliminary" | "final" | "amended">("final");

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

  // Update existing result mutation
  const updateResultMutation = useMutation({
    mutationFn: async ({ resultId, newValue, comment }: { resultId: string, newValue: string, comment: string }) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resultvalue: newValue,
          changeComment: comment,
        }),
      });
      if (!response.ok) throw new Error('Failed to update result');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      setEditingResultId(null);
      setEditingValue("");
      setChangeComment("");
      setPendingResultUpdate(null);
    },
  });

  // Submit to OpenEHR mutation
  const submitToOpenEHRMutation = useMutation({
    mutationFn: async () => {
      if (!currentItem) return;
      
      // Get all results with values
      const resultsToSubmit = currentItem.results
        .filter(result => result.resultvalue && result.resultvalue.trim() !== '')
        .map(result => ({
          testCode: result.testcode,
          testName: result.testname,
          resultValue: result.resultvalue!,
          unit: result.unit || undefined,
          referenceMin: result.referencemin || undefined,
          referenceMax: result.referencemax || undefined,
          referenceRange: result.referencerange || undefined,
          flag: result.flag,
          isAbnormal: result.isabormal,
          isCritical: result.iscritical,
        }));

      if (resultsToSubmit.length === 0) {
        throw new Error('No results to submit');
      }

      const response = await fetch('/api/lims/submit-to-openehr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: currentItem.sampleid,
          workspaceId: workspaceid,
          results: resultsToSubmit,
          overallStatus: openEHRStatus,
          conclusion: openEHRConclusion || undefined,
          composerName: 'Lab Technician',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to submit to OpenEHR');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      setShowOpenEHRDialog(false);
      setOpenEHRConclusion("");
      setOpenEHRStatus("final");
      alert(`Successfully submitted to OpenEHR!\nComposition UID: ${data.compositionUid}\nSample: ${data.sampleNumber}`);
    },
    onError: (error: Error) => {
      alert(`Failed to submit to OpenEHR: ${error.message}`);
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

  const handleEditResult = (resultId: string, currentValue: string) => {
    setEditingResultId(resultId);
    setEditingValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (!editingResultId || !editingValue.trim()) return;
    
    // Store pending update and show comment dialog
    setPendingResultUpdate({ resultId: editingResultId, newValue: editingValue });
    setShowCommentDialog(true);
  };

  const handleConfirmUpdate = () => {
    if (!changeComment.trim()) {
      alert("Please provide a comment explaining why the result was changed.");
      return;
    }
    
    if (pendingResultUpdate) {
      updateResultMutation.mutate({
        resultId: pendingResultUpdate.resultId,
        newValue: pendingResultUpdate.newValue,
        comment: changeComment,
      });
      setShowCommentDialog(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingResultId(null);
    setEditingValue("");
  };

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
              {/* Worklist ID Display - Only show for worklist validation */}
              {!selectedSample && worklistid && (
                <div className="border-b pb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Worklist ID: {worklistid.substring(0, 8)} </p>
                </div>
              )}
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
              <div className="border-b pb-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Patient Information</p>
                {currentItem.patient ? (
                  <div className="flex items-center gap-6 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">
                        {currentItem.patient.firstname} {currentItem.patient.lastname}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-medium">{currentItem.patient.age} years</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Gender:</span>
                      <span className="font-medium capitalize">{currentItem.patient.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Sample ID:</span>
                      <span className="font-medium font-mono">{currentItem.sample.samplenumber}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No patient information available</p>
                )}
              </div>

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
                                  editingResultId === result.resultid ? (
                                    // Editing mode
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="w-32"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="h-7 px-2"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    // Display mode
                                    <div className="flex items-center gap-2">
                                      <span className={(() => {
                                        const value = result.resultvalue;
                                        if (!value || value === '-') return '';
                                        
                                        const numericValue = parseFloat(value);
                                        
                                        // Handle numeric results
                                        if (!isNaN(numericValue)) {
                                          const min = result.referencemin;
                                          const max = result.referencemax;
                                          
                                          if (min !== null && max !== null) {
                                            if (numericValue > max) {
                                              return 'bg-red-100 text-red-900 px-2 py-1 rounded font-semibold';
                                            } else if (numericValue < min) {
                                              return 'bg-yellow-100 text-yellow-900 px-2 py-1 rounded font-semibold';
                                            }
                                          }
                                          return 'font-medium';
                                        }
                                        
                                        // Handle descriptive results
                                        const valueLower = value.toLowerCase().trim();
                                        const refRange = (result.referencerange || '').toLowerCase();
                                        
                                        // Check if result indicates abnormal/positive finding
                                        const abnormalTerms = ['positive', 'detected', 'present', 'abnormal', 'growth', 'reactive'];
                                        const normalTerms = ['negative', 'no growth', 'not detected', 'absent', 'normal', 'non-reactive'];
                                        
                                        const isAbnormal = abnormalTerms.some(term => valueLower.includes(term));
                                        const isNormal = normalTerms.some(term => valueLower.includes(term));
                                        
                                        if (isAbnormal && refRange.includes('negative')) {
                                          return 'bg-red-100 text-red-900 px-2 py-1 rounded font-semibold';
                                        } else if (isNormal) {
                                          return 'font-medium';
                                        }
                                        
                                        return 'font-medium';
                                      })()}>
                                        {result.resultvalue || "-"}
                                      </span>
                                      {result.iscritical && (
                                        <div className="w-3 h-3 bg-red-600 rounded-sm" />
                                      )}
                                      {result.resultid && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleEditResult(result.resultid!, result.resultvalue || "")}
                                          className="h-6 px-2 text-xs bg-green-400 hover:bg-green-500 text-green-800"
                                        >
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                  )
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
                                        className={`w-64 min-h-[60px] px-3 py-2 text-sm border rounded-md ${(() => {
                                          const value = editedResults[resultKey];
                                          if (!value || value.trim() === '') return '';
                                          
                                          const valueLower = value.toLowerCase().trim();
                                          const refRange = (result.referencerange || '').toLowerCase();
                                          
                                          // Check if result indicates abnormal/positive finding
                                          const abnormalTerms = ['positive', 'detected', 'present', 'abnormal', 'growth', 'reactive'];
                                          const isAbnormal = abnormalTerms.some(term => valueLower.includes(term));
                                          
                                          if (isAbnormal && refRange.includes('negative')) {
                                            return 'bg-red-100 border-red-300 focus:border-red-500';
                                          }
                                          
                                          return '';
                                        })()}`}
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
                                          className={`w-32 ${(() => {
                                            const value = editedResults[resultKey];
                                            if (!value || value.trim() === '') return '';
                                            
                                            const numericValue = parseFloat(value);
                                            if (isNaN(numericValue)) return '';
                                            
                                            const min = result.referencemin;
                                            const max = result.referencemax;
                                            
                                            if (min !== null && max !== null) {
                                              if (numericValue > max) {
                                                return 'bg-red-100 border-red-300 focus:border-red-500';
                                              } else if (numericValue < min) {
                                                return 'bg-yellow-100 border-yellow-300 focus:border-yellow-500';
                                              }
                                            }
                                            return '';
                                          })()}`}
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
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowOpenEHRDialog(true)}
                  disabled={!currentItem.results.some(r => r.resultvalue)}
                  title="Submit validated results to OpenEHR"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Submit to OpenEHR
                </Button>
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

      {/* Change Comment Dialog */}
      <AlertDialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Result Change Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a comment explaining why this result is being changed. This is required for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="change-comment" className="text-sm font-medium mb-2 block">
              Comment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="change-comment"
              value={changeComment}
              onChange={(e) => setChangeComment(e.target.value)}
              placeholder="Enter reason for changing the result..."
              className="min-h-[100px]"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setChangeComment("");
              setPendingResultUpdate(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdate}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!changeComment.trim() || updateResultMutation.isPending}
            >
              {updateResultMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Update"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit to OpenEHR Dialog */}
      <AlertDialog open={showOpenEHRDialog} onOpenChange={setShowOpenEHRDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Results to OpenEHR</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a laboratory report composition in OpenEHR using the laboratory_report_v1 template.
              {currentItem && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-blue-900">Sample Information:</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p><strong>Sample ID:</strong> {currentItem.sample.samplenumber}</p>
                    <p><strong>Patient:</strong> {currentItem.patient ? `${currentItem.patient.firstname} ${currentItem.patient.lastname}` : 'Unknown'}</p>
                    <p><strong>Sample Type:</strong> {currentItem.sample.sampletype}</p>
                    <p><strong>Results to Submit:</strong> {currentItem.results.filter(r => r.resultvalue).length} test(s)</p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openehr-status">Report Status</Label>
              <select
                id="openehr-status"
                title="Select report status"
                value={openEHRStatus}
                onChange={(e) => setOpenEHRStatus(e.target.value as "preliminary" | "final" | "amended")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="preliminary">Preliminary</option>
                <option value="final">Final</option>
                <option value="amended">Amended</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openehr-conclusion">Overall Conclusion (Optional)</Label>
              <Textarea
                id="openehr-conclusion"
                placeholder="Enter overall interpretation or conclusion for this report..."
                value={openEHRConclusion}
                onChange={(e) => setOpenEHRConclusion(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>

            {currentItem && currentItem.results.filter(r => r.resultvalue).length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ No results available to submit. Please enter test results before submitting to OpenEHR.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitToOpenEHRMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitToOpenEHRMutation.mutate();
              }}
              disabled={submitToOpenEHRMutation.isPending || (currentItem && currentItem.results.filter(r => r.resultvalue).length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitToOpenEHRMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit to OpenEHR
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

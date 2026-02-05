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
import { Search, Loader2, ChevronLeft, ChevronRight, Printer, X, CheckCircle2, Clock } from "lucide-react";
import { calculateTAT, getTATStatusColor } from "@/lib/lims/tat-tracking";
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

  // Technical validation mutation (draft → validated)
  const techValidateMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_technical' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate technically');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
    },
  });

  // Medical/Clinical validation mutation (validated → approved)
  const medicalValidateMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_medical' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate medically');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
    },
  });

  // Release result mutation (approved → released)
  const releaseMutation = useMutation({
    mutationFn: async (resultid: string) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to release result');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
    },
  });

  // Reject result mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ resultid, reason }: { resultid: string; reason?: string }) => {
      const response = await fetch(`/api/d/${workspaceid}/test-results/${resultid}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionreason: reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject result');
      }
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
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">TAT:</span>
                      {(() => {
                        const tat = calculateTAT(currentItem.sample.collectiondate, null, "ROUTINE");
                        return (
                          <Badge variant="outline" className={`text-xs font-medium ${getTATStatusColor(tat.status)}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {tat.elapsedDisplay} ({tat.percentUsed}%)
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No patient information available</p>
                )}
              </div>

              {/* Batch Entry Summary */}
              {(() => {
                const totalTests = currentItem.results.length;
                const withResults = currentItem.results.filter((r: TestResult) => r.hasResult !== false).length;
                const pendingEntry = totalTests - withResults;
                const enteredCount = Object.keys(editedResults).filter(key => 
                  key.startsWith(currentItem.sampleid) && editedResults[key]?.trim()
                ).length;
                
                return pendingEntry > 0 ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-amber-800">
                        <strong>{pendingEntry}</strong> of {totalTests} tests awaiting results
                      </span>
                      {enteredCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          {enteredCount} entered (unsaved)
                        </Badge>
                      )}
                    </div>
                    {withResults > 0 && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {withResults} completed
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-green-800">All {totalTests} tests have results</span>
                  </div>
                );
              })()}

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
              {(() => {
                const pendingCount = currentItem ? Object.keys(editedResults).filter(key =>
                  key.startsWith(currentItem.sampleid) && editedResults[key]?.trim()
                ).length : 0;

                return pendingCount > 0 ? (
                  <div className="flex items-center justify-between">
                    {saveResultsMutation.isSuccess && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Results saved successfully
                      </div>
                    )}
                    {saveResultsMutation.isError && (
                      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
                        <X className="h-4 w-4" />
                        Failed to save results
                      </div>
                    )}
                    {!saveResultsMutation.isSuccess && !saveResultsMutation.isError && <div />}
                    <Button
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => saveResultsMutation.mutate()}
                      disabled={saveResultsMutation.isPending}
                    >
                      {saveResultsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving {pendingCount} results...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Save {pendingCount} Result{pendingCount !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                ) : null;
              })()}

            </div>
          )}

          {/* Dialog Footer with Action Buttons */}
          {!isLoading && !error && currentItem && (
            <DialogFooter className="flex justify-between items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/d/${workspaceid}/lab-report/${currentItem.sampleid}`);
                    if (!response.ok) throw new Error('Failed to fetch report data');
                    const { report } = await response.json();

                    const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                    const html = generateLabReportHTML(report);

                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(html);
                    printWindow.document.close();
                  } catch (err) {
                    console.error('Print report error:', err);
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              
              <div className="flex flex-col gap-2 items-end">
                {/* Validation Chain State Indicator */}
                {(() => {
                  const results = currentItem.results.filter((r: TestResult) => r.resultid);
                  if (results.length === 0) return null;
                  // Use the "lowest" status across all results to determine what's next
                  const statuses = results.map((r: TestResult) => r.status);
                  const allDraft = statuses.every((s: string) => s === 'draft' || s === 'pending');
                  const allValidated = statuses.every((s: string) => s === 'validated');
                  const allApproved = statuses.every((s: string) => s === 'approved');
                  const allReleased = statuses.every((s: string) => s === 'released');
                  const someReleased = statuses.some((s: string) => s === 'released');

                  return (
                    <div className="flex items-center gap-1 text-xs mb-1 w-full">
                      <span className="text-muted-foreground mr-1">Chain:</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${!allDraft ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500'}`}>
                        1. Technical
                      </Badge>
                      <span className="text-gray-300">→</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${allApproved || allReleased ? 'bg-green-100 text-green-700 border-green-300' : allValidated ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500'}`}>
                        2. Medical
                      </Badge>
                      <span className="text-gray-300">→</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${allReleased ? 'bg-green-100 text-green-700 border-green-300' : allApproved ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-100 text-gray-500'}`}>
                        3. Release
                      </Badge>
                    </div>
                  );
                })()}

                {/* Chain-aware Action Buttons */}
                <div className="flex gap-2">
                  {(() => {
                    const results = currentItem.results.filter((r: TestResult) => r.resultid);
                    const statuses = results.map((r: TestResult) => r.status);
                    const allDraft = statuses.every((s: string) => s === 'draft' || s === 'pending');
                    const allValidated = statuses.every((s: string) => s === 'validated');
                    const allApproved = statuses.every((s: string) => s === 'approved');
                    const allReleased = statuses.every((s: string) => s === 'released');
                    const anyPending = techValidateMutation.isPending || medicalValidateMutation.isPending || releaseMutation.isPending;

                    return (
                      <>
                        {/* Technical Validate - shown when draft */}
                        {allDraft && (
                          <Button
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              results.forEach((result: TestResult) => {
                                if (result.resultid) techValidateMutation.mutate(result.resultid);
                              });
                            }}
                            disabled={anyPending}
                            title="Technical validation (Step 1 of 3)"
                          >
                            {techValidateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Tech Validate
                          </Button>
                        )}

                        {/* Medical Validate - shown when tech validated */}
                        {allValidated && (
                          <Button
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              results.forEach((result: TestResult) => {
                                if (result.resultid) medicalValidateMutation.mutate(result.resultid);
                              });
                            }}
                            disabled={anyPending}
                            title="Medical/Clinical validation (Step 2 of 3)"
                          >
                            {medicalValidateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Medical Validate
                          </Button>
                        )}

                        {/* Release - shown when medically approved */}
                        {allApproved && (
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              results.forEach((result: TestResult) => {
                                if (result.resultid) releaseMutation.mutate(result.resultid);
                              });
                            }}
                            disabled={anyPending}
                            title="Release to doctor (Step 3 of 3)"
                          >
                            {releaseMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Release
                          </Button>
                        )}

                        {/* Already released indicator */}
                        {allReleased && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 py-1.5 px-3">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Released
                          </Badge>
                        )}
                      </>
                    );
                  })()}

                  {/* Reject and Rerun - always available unless released */}
                  {!currentItem.results.every((r: TestResult) => r.status === 'released') && (
                    <>
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
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                </div>
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
                if (currentItem) {
                  currentItem.results.forEach((result: TestResult) => {
                    if (result.resultid && result.status !== 'released') {
                      rejectMutation.mutate({ resultid: result.resultid, reason: 'Rejected by lab technician' });
                    }
                  });
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
                if (currentItem) {
                  currentItem.results.forEach((result: TestResult) => {
                    if (result.resultid && result.status !== 'released') {
                      rerunMutation.mutate(result.resultid);
                    }
                  });
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

    </>
  );
}

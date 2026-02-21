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
  validationState?: {
    currentstate: string;
    validateddate: string | null;
    releaseddate: string | null;
    validatedby: {
      name: string;
      email: string;
    } | null;
    releasedby: {
      name: string;
      email: string;
    } | null;
  } | null;
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
  const [showWorklistCompleteDialog, setShowWorklistCompleteDialog] = useState(false);

  // Fetch worklist items with patient and sample data
  const { data: worklistData, isLoading, error } = useQuery({
    queryKey: ["worklist-detail", worklistid, workspaceid, selectedSample?.sampleid],
    queryFn: async () => {
      // If individual sample is provided
      if (selectedSample) {
        // If results are empty, fetch tests for this sample
        if (!selectedSample.results || selectedSample.results.length === 0) {
          const sampleId = selectedSample.sampleid;
          const sampleNumber = selectedSample.sample?.samplenumber || "";
          // Try direct sample API first (fetches existing results)
          if (sampleId) {
            try {
              const directResponse = await fetch(`/api/lims/samples/${sampleId}`);
              if (directResponse.ok) {
                const directData = await directResponse.json();
                if (directData.results && directData.results.length > 0) {
                  const mappedResults = directData.results.map((r: any) => ({
                    resultid: r.resultid || null,
                    testcode: r.testcode,
                    testname: r.testname,
                    resultvalue: r.resultvalue,
                    unit: r.unit,
                    referencemin: r.referencemin,
                    referencemax: r.referencemax,
                    referencerange: r.referencerange,
                    flag: r.flag,
                    isabormal: r.isabormal ?? false,
                    iscritical: r.iscritical ?? false,
                    status: r.status || 'pending',
                    hasResult: r.hasResult !== undefined ? r.hasResult : !!r.resultid,
                  }));
                  const merged = {
                    ...selectedSample,
                    results: mappedResults,
                    patient: directData.sample?.patient || selectedSample.patient,
                  };
                  return { items: [merged] };
                }
              }
            } catch { /* fall through to search API */ }
          }

          // Fall back to search API (fetches requested tests from order)
          if (sampleNumber) {
            const response = await fetch(`/api/lims/samples/search?workspaceid=${workspaceid}&query=${encodeURIComponent(sampleNumber)}`);
            if (response.ok) {
              const data = await response.json();
              const match = data.samples?.find((s: any) => s.sampleid === sampleId);
              if (match && match.results && match.results.length > 0) {
                return { items: [{ ...selectedSample, results: match.results, patient: match.patient || selectedSample.patient }] };
              }
            }
          }
        }
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

  // Release sample mutation (validates then releases all results for the sample)
  const releaseMutation = useMutation({
    mutationFn: async ({ sampleid, resultids }: { sampleid: string; resultids: string[] }) => {
      // Step 1: Validate the sample (clinical validation)
      const validateResponse = await fetch(`/api/lims/samples/${sampleid}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceid,
          resultids,
          validateAll: true,
          comments: {}
        }),
      });
      
      if (!validateResponse.ok) {
        const data = await validateResponse.json();
        throw new Error(data.error || 'Failed to validate results');
      }

      // Step 2: Release the validated sample
      const releaseResponse = await fetch(`/api/lims/samples/${sampleid}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceid }),
      });
      
      if (!releaseResponse.ok) {
        const data = await releaseResponse.json();
        throw new Error(data.error || 'Failed to release results');
      }
      
      return releaseResponse.json();
    },
    onSuccess: async () => {
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["worklist-detail", worklistid] });
      
      // Refetch the updated worklist data to check if all items are released
      if (worklistid) {
        try {
          const response = await fetch(`/api/lims/worklist/${worklistid}?workspaceid=${workspaceid}`);
          if (response.ok) {
            const data = await response.json();
            const items = data.items || [];
            
            // Check if all samples in the worklist have released validation state
            const allItemsReleased = items.length > 0 && items.every((item: WorklistItem) => {
              return item.validationState?.currentstate === "RELEASED";
            });

            // If all items are released, ask user before deleting the worklist
            if (allItemsReleased) {
              setShowWorklistCompleteDialog(true);
            }
          }
        } catch (error) {
          console.error('Failed to check completed worklist:', error);
        }
      }
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
      
      const resultsToSave = (currentItem.results || [])
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
        <DialogContent className="max-w-[85vw] max-h-[90vh] overflow-y-auto">
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
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Worklist ID: {worklistid.substring(0, 8)}
                    {worklistData?.worklist?.worklistname && (
                      <span className="text-gray-600 font-normal"> ({worklistData.worklist.worklistname})</span>
                    )}
                  </p>
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
                  <div className="space-y-2">
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
                    {/* Order ID and Multi-Sample Indicator */}
                    {(() => {
                      const orderid = (currentItem as any).orderid || (currentItem as any).openehrrequestid;
                      if (!orderid) return null;
                      
                      // Count how many samples in this worklist have the same order ID
                      const samplesInSameOrder = items.filter((item: any) => 
                        (item.orderid === orderid || item.openehrrequestid === orderid)
                      );
                      const isMultiSample = samplesInSameOrder.length > 1;
                      
                      return (
                        <div className="flex items-center gap-4 text-xs pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Order ID:</span>
                            <span className="font-mono text-blue-600 font-medium" title={orderid}>
                              {orderid.length > 20 ? `${orderid.substring(0, 20)}...` : orderid}
                            </span>
                          </div>
                          {isMultiSample && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              Multi-Sample Order ({samplesInSameOrder.length} specimens)
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No patient information available</p>
                )}
              </div>

              {/* Batch Entry Summary */}
              {(() => {
                const totalTests = (currentItem.results || []).length;
                const withResults = (currentItem.results || []).filter((r: TestResult) => r.hasResult !== false).length;
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
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {(() => {
                    const results = (currentItem.results || []).filter((r: TestResult) => r.resultid);
                    const statuses = results.map((r: TestResult) => r.status);
                    
                    // Check if all results have valid values (not empty, not null, not just "-")
                    const allHaveResults = results.every((r: TestResult) => {
                      const value = r.resultvalue?.trim();
                      return value && value !== '-' && value !== '';
                    });
                    
                    // Use validation state for consistency, but allow release if results have values
                    const isReleased = currentItem.validationState?.currentstate === "RELEASED";
                    
                    // For worklist modal: allow release if results have values and not already released
                    // Clinical validation is not required in this context
                    const canRelease = !isReleased && allHaveResults;

                    return (
                      <>
                        {/* Release - available when results have values and not yet released */}
                        {!isReleased && results.length > 0 && (
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              // Collect all result IDs for validation
                              const resultids = results
                                .filter((r: TestResult) => r.resultid)
                                .map((r: TestResult) => r.resultid as string);
                              
                              // Validate and release the entire sample
                              releaseMutation.mutate({
                                sampleid: currentItem.sample.sampleid,
                                resultids
                              });
                            }}
                            disabled={releaseMutation.isPending || !canRelease}
                            title={canRelease ? "Release results to OpenEHR" : "All tests must have results before release"}
                          >
                            {releaseMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Release Results
                          </Button>
                        )}

                        {/* Already released indicator */}
                        {isReleased && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 py-1.5 px-3">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Released
                          </Badge>
                        )}
                      </>
                    );
                  })()}

                  {/* Reject and Rerun - always available unless released */}
                  {(() => {
                    const isReleased = currentItem.validationState?.currentstate === "RELEASED";
                    return !isReleased && (
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
                    );
                  })()}
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
                  (currentItem.results || []).forEach((result: TestResult) => {
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
                  (currentItem.results || []).forEach((result: TestResult) => {
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

      {/* Worklist Complete Confirmation Dialog */}
      <AlertDialog open={showWorklistCompleteDialog} onOpenChange={setShowWorklistCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Worklist Completed</AlertDialogTitle>
            <AlertDialogDescription>
              All samples in this worklist have been released. Do you want to delete this completed worklist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowWorklistCompleteDialog(false)}>
              No, Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const deleteResponse = await fetch(`/api/lims/worklists/${worklistid}`, {
                    method: 'DELETE',
                  });
                  if (deleteResponse.ok) {
                    // Invalidate worklists query to refresh the list
                    await queryClient.invalidateQueries({ queryKey: ["worklists", workspaceid] });
                    // Close dialogs and modal
                    setShowWorklistCompleteDialog(false);
                    onOpenChange(false);
                  }
                } catch (error) {
                  console.error('Failed to delete completed worklist:', error);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Worklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

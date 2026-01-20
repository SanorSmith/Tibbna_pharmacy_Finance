/**
 * Worklist Validation Detail Page
 * Shows patient information and test results for validation
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ChevronLeft, ChevronRight, Printer } from "lucide-react";
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

export default function WorklistValidationPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workspaceid = params.workspaceid as string;
  const worklistid = params.worklistid as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [editedResults, setEditedResults] = useState<Record<string, string>>({});

  // Fetch worklist items with patient and sample data
  const { data: worklistData, isLoading, error } = useQuery({
    queryKey: ["worklist-detail", worklistid, workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/worklist/${worklistid}?workspaceid=${workspaceid}`);
      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to fetch worklist:", error);
        throw new Error("Failed to fetch worklist");
      }
      const data = await response.json();
      console.log("Worklist data received:", data);
      return data;
    },
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
  
  console.log("Items count:", items.length);
  console.log("Filtered items count:", filteredItems.length);
  console.log("Current item:", currentItem);

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
      
      // Prepare results to save
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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No items found in this worklist</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Worklists
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search patient name/ID or sample ID"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentIndex(0); // Reset to first item when searching
          }}
          className="pl-10 h-12"
        />
      </div>

      {/* Patient Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient information validation</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === filteredItems.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentItem.patient ? (
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                {currentItem.patient.firstname} {currentItem.patient.lastname}
              </div>
              <div className="text-sm text-muted-foreground">
                Age: {currentItem.patient.age} years
              </div>
              <div className="text-sm text-muted-foreground">
                Gender: {currentItem.patient.gender}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No patient information available</div>
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
                  const resultKey = `${currentItem.sampleid}-${result.testcode}`;
                  const hasResult = result.hasResult !== false;
                  
                  return (
                    <TableRow key={result.resultid || resultKey}>
                      <TableCell className="font-medium">
                        {currentItem.sample.samplenumber}
                      </TableCell>
                      <TableCell>{result.testname}</TableCell>
                      <TableCell className="uppercase">
                        {currentItem.patient?.gender || "-"}
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
                      <p className="text-sm mt-2">
                        Sample: {currentItem.sample?.samplenumber || "Unknown"}
                      </p>
                      <p className="text-xs mt-1 text-gray-500">
                        Test results will appear here once they are entered or received from analyzers
                      </p>
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => {
            // Release all results for current sample
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
          onClick={() => {
            setSelectedResultId(currentItem.results[0]?.resultid);
            setShowRejectDialog(true);
          }}
        >
          Reject
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedResultId(currentItem.results[0]?.resultid);
            setShowRerunDialog(true);
          }}
        >
          Rerun
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Printer
        </Button>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Test Results</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject these test results? This action will mark all results for this sample as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                currentItem.results.forEach(result => {
                  rejectMutation.mutate(result.resultid);
                });
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
              Are you sure you want to request a rerun for these test results? This will mark all results for this sample for reanalysis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                currentItem.results.forEach(result => {
                  rerunMutation.mutate(result.resultid);
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Request Rerun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

interface TestResult {
  resultid: string;
  testcode: string;
  testname: string;
  resultvalue: string;
  unit: string | null;
  referencemin: string | null;
  referencemax: string | null;
  referencerange: string | null;
  flag: string;
  iscritical: boolean;
  previousvalue: string | null;
  previousdate: string | null;
  validationcomment: string | null;
  markedforrerun: boolean;
  rerunreason: string | null;
  analyzeddate: string;
}

interface SampleData {
  sample: {
    sampleid: string;
    patientid: string;
    orderid: string;
    sampletype: string;
    collectiondate: string;
    receiveddate: string;
    analyzer: string | null;
    testgroup: string;
    priority: string;
  };
  results: TestResult[];
  validationState: {
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
  hasPreviousResults: boolean;
}

export default function SampleValidationContent({
  workspaceid,
  sampleid,
}: {
  workspaceid: string;
  sampleid: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const [rerunResults, setRerunResults] = useState<Set<string>>(new Set());
  const [rerunReason, setRerunReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Dialog states
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);

  // Fetch sample data
  const { data, isLoading, error } = useQuery<SampleData>({
    queryKey: ["sample-validation", sampleid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/samples/${sampleid}`);
      if (!response.ok) throw new Error("Failed to fetch sample");
      return response.json();
    },
  });

  const isReleased = data?.validationState?.currentstate === "RELEASED";
  const isValidated = data?.validationState?.currentstate === "CLINICALLY_VALIDATED";

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async (validateAll: boolean) => {
      const response = await fetch(`/api/lims/samples/${sampleid}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultids: Array.from(selectedResults),
          comments,
          validateAll,
          workspaceid,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Validation failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-validation", sampleid] });
      queryClient.invalidateQueries({ queryKey: ["validation-worklist"] });
      setShowValidateDialog(false);
      setSelectedResults(new Set());
      setComments({});
    },
  });

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lims/samples/${sampleid}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Release failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-validation", sampleid] });
      queryClient.invalidateQueries({ queryKey: ["validation-worklist"] });
      setShowReleaseDialog(false);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lims/samples/${sampleid}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectionReason,
          workspaceid,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Rejection failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-validation", sampleid] });
      queryClient.invalidateQueries({ queryKey: ["validation-worklist"] });
      setShowRejectDialog(false);
      setRejectionReason("");
    },
  });

  // Rerun mutation
  const rerunMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lims/samples/${sampleid}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultids: Array.from(rerunResults),
          reason: rerunReason,
          workspaceid,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Rerun request failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-validation", sampleid] });
      queryClient.invalidateQueries({ queryKey: ["validation-worklist"] });
      setShowRerunDialog(false);
      setRerunResults(new Set());
      setRerunReason("");
    },
  });

  const toggleResultSelection = (resultid: string) => {
    const newSelection = new Set(selectedResults);
    if (newSelection.has(resultid)) {
      newSelection.delete(resultid);
    } else {
      newSelection.add(resultid);
    }
    setSelectedResults(newSelection);
  };

  const toggleRerunSelection = (resultid: string) => {
    const newSelection = new Set(rerunResults);
    if (newSelection.has(resultid)) {
      newSelection.delete(resultid);
    } else {
      newSelection.add(resultid);
    }
    setRerunResults(newSelection);
  };

  const selectAllResults = () => {
    if (data?.results) {
      setSelectedResults(new Set(data.results.map((r) => r.resultid)));
    }
  };

  const getFlagBadge = (flag: string, isCritical: boolean) => {
    if (isCritical) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          CRITICAL
        </Badge>
      );
    }

    switch (flag.toLowerCase()) {
      case "high":
        return (
          <Badge variant="default" className="bg-orange-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            High
          </Badge>
        );
      case "low":
        return (
          <Badge variant="default" className="bg-blue-500 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Low
          </Badge>
        );
      case "normal":
        return (
          <Badge variant="outline" className="text-green-600">
            Normal
          </Badge>
        );
      default:
        return <Badge variant="outline">{flag}</Badge>;
    }
  };

  const getStatusBadge = (state: string | null) => {
    if (!state) return null;

    switch (state) {
      case "CLINICALLY_VALIDATED":
        return (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Validated
          </Badge>
        );
      case "RELEASED":
        return (
          <Badge variant="default" className="bg-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Released
          </Badge>
        );
      case "RERUN_REQUESTED":
        return (
          <Badge variant="default" className="bg-orange-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rerun Requested
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {state}
          </Badge>
        );
    }
  };

  // Check if all critical results have comments
  const criticalResultsNeedComments = data?.results.filter(
    (r) => r.iscritical && !r.validationcomment && !comments[r.resultid]
  ) || [];

  const canValidate = selectedResults.size > 0 && !isReleased;
  const canRelease = isValidated && !isReleased;
  const canReject = !isReleased;
  const canRequestRerun = rerunResults.size > 0 && !isReleased;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p>Failed to load sample data</p>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="mt-4"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/d/${workspaceid}/lab-tech`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Worklist
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sample Validation</h1>
            <p className="text-sm text-muted-foreground">
              Sample ID: {data.sample.sampleid.substring(0, 8)}
            </p>
          </div>
        </div>
        {getStatusBadge(data.validationState?.currentstate || null)}
      </div>

      {/* Sample Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Order ID</Label>
              <p className="font-medium">{data.sample.orderid}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sample Type</Label>
              <p className="font-medium">{data.sample.sampletype}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Test Group</Label>
              <Badge variant="outline">{data.sample.testgroup}</Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              {data.sample.priority === "stat" || data.sample.priority === "urgent" ? (
                <Badge variant="destructive">{data.sample.priority.toUpperCase()}</Badge>
              ) : (
                <p className="font-medium">{data.sample.priority}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Collection Date</Label>
              <p className="font-medium">
                {new Date(data.sample.collectiondate).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Received Date</Label>
              <p className="font-medium">
                {new Date(data.sample.receiveddate).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Analyzer</Label>
              <p className="font-medium">{data.sample.analyzer || "N/A"}</p>
            </div>
            {data.validationState?.validatedby && (
              <div>
                <Label className="text-xs text-muted-foreground">Validated By</Label>
                <p className="font-medium">
                  {data.validationState.validatedby.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                {data.hasPreviousResults && "Previous results shown for comparison"}
              </CardDescription>
            </div>
            {!isReleased && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllResults}
                  disabled={isReleased}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedResults(new Set())}
                  disabled={isReleased}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  {!isReleased && <TableHead className="w-12"></TableHead>}
                  <TableHead className="font-semibold">Test Name</TableHead>
                  <TableHead className="font-semibold">Result</TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="font-semibold">Reference Range</TableHead>
                  <TableHead className="font-semibold">Flag</TableHead>
                  {data.hasPreviousResults && (
                    <>
                      <TableHead className="font-semibold">Previous</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                    </>
                  )}
                  <TableHead className="font-semibold">Comment</TableHead>
                  {!isReleased && <TableHead className="font-semibold text-center">Rerun</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((result) => (
                  <TableRow
                    key={result.resultid}
                    className={`${
                      result.iscritical ? "bg-red-50" : ""
                    } ${result.markedforrerun ? "bg-orange-50" : ""}`}
                  >
                    {!isReleased && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedResults.has(result.resultid)}
                          onChange={() => toggleResultSelection(result.resultid)}
                          className="rounded"
                          disabled={result.markedforrerun}
                          aria-label={`Select ${result.testname} for validation`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{result.testname}</TableCell>
                    <TableCell className="font-semibold text-lg">
                      {result.resultvalue}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {result.unit || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {result.referencerange ||
                        (result.referencemin && result.referencemax
                          ? `${result.referencemin} - ${result.referencemax}`
                          : "-")}
                    </TableCell>
                    <TableCell>{getFlagBadge(result.flag, result.iscritical)}</TableCell>
                    {data.hasPreviousResults && (
                      <>
                        <TableCell className="text-sm text-gray-600">
                          {result.previousvalue || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {result.previousdate
                            ? new Date(result.previousdate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="min-w-[200px]">
                      {isReleased ? (
                        <p className="text-sm">{result.validationcomment || "-"}</p>
                      ) : (
                        <Textarea
                          placeholder={
                            result.iscritical
                              ? "Required for critical results"
                              : "Add validation comment..."
                          }
                          value={comments[result.resultid] || result.validationcomment || ""}
                          onChange={(e) =>
                            setComments({ ...comments, [result.resultid]: e.target.value })
                          }
                          className={`h-20 text-sm ${
                            result.iscritical && !comments[result.resultid] && !result.validationcomment
                              ? "border-red-300"
                              : ""
                          }`}
                          disabled={result.markedforrerun}
                        />
                      )}
                      {result.markedforrerun && (
                        <p className="text-xs text-orange-600 mt-1">
                          Marked for rerun: {result.rerunreason}
                        </p>
                      )}
                    </TableCell>
                    {!isReleased && (
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={rerunResults.has(result.resultid)}
                          onChange={() => toggleRerunSelection(result.resultid)}
                          className="rounded"
                          disabled={result.markedforrerun}
                          aria-label={`Request rerun for ${result.testname}`}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {criticalResultsNeedComments.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">Critical results require validation comments</p>
                <p>
                  {criticalResultsNeedComments.length} critical result(s) need comments before
                  validation
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isReleased && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowValidateDialog(true)}
                      disabled={!canValidate || criticalResultsNeedComments.length > 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Validate Selected ({selectedResults.size})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Validate selected test results</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowReleaseDialog(true)}
                      disabled={!canRelease}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Release Results
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Release validated results to openEHR</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowRerunDialog(true)}
                      disabled={!canRequestRerun}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Request Rerun ({rerunResults.size})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Request rerun for selected results</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={!canReject}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reject validation with reason</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validate Dialog */}
      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Validation</DialogTitle>
            <DialogDescription>
              You are about to validate {selectedResults.size} test result(s). This action will be
              logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Do you want to mark the entire sample as clinically validated?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => validateMutation.mutate(true)}
                disabled={validateMutation.isPending}
                className="flex-1"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Validate All
              </Button>
              <Button
                variant="outline"
                onClick={() => validateMutation.mutate(false)}
                disabled={validateMutation.isPending}
                className="flex-1"
              >
                Validate Selected Only
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidateDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Results Release</DialogTitle>
            <DialogDescription>
              This will release the validated results and trigger integration with openEHR. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Once released, results cannot be modified. Ensure all
                validations are complete.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => releaseMutation.mutate()}
              disabled={releaseMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {releaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Validation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this validation. This will be logged in the
              audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rerun Dialog */}
      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Rerun</DialogTitle>
            <DialogDescription>
              You are requesting a rerun for {rerunResults.size} test result(s). Please provide a
              reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rerunReason">Rerun Reason *</Label>
            <Textarea
              id="rerunReason"
              placeholder="Enter reason for rerun request..."
              value={rerunReason}
              onChange={(e) => setRerunReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rerunMutation.mutate()}
              disabled={!rerunReason.trim() || rerunMutation.isPending}
            >
              {rerunMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Request Rerun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Results Validation Component
 * 
 * Allows supervisors to review and validate test results
 * Features multi-level validation workflow and approval tracking
 */

"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, Send, History, AlertTriangle } from "lucide-react";

interface TestResult {
  resultid: string;
  sampleid: string;
  testcode: string;
  testname: string;
  resultvalue: string;
  unit?: string;
  referencerange?: string;
  flag?: string;
  isabormal?: boolean;
  iscritical?: boolean;
  interpretation?: string;
  status: string;
  enteredby?: string;
  entereddate?: string;
  comment?: string;
  techniciannotes?: string;
}

interface ResultsValidationProps {
  workspaceid: string;
  validationLevel: "technical" | "medical";
}

export default function ResultsValidation({ workspaceid, validationLevel }: ResultsValidationProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [validationComment, setValidationComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationAction, setValidationAction] = useState<"approve" | "reject">("approve");
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    fetchPendingResults();
  }, [workspaceid, validationLevel]);

  const fetchPendingResults = async () => {
    try {
      const statusFilter = validationLevel === "technical" ? "entered" : "validated";
      const response = await fetch(`/api/d/${workspaceid}/test-results?status=${statusFilter}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Error fetching pending results:", error);
    }
  };

  const handleValidate = (result: TestResult, action: "approve" | "reject") => {
    setSelectedResult(result);
    setValidationAction(action);
    setValidationComment("");
    setRejectionReason("");
    setShowValidationDialog(true);
  };

  const confirmValidation = async () => {
    if (!selectedResult) return;

    setLoading(true);
    try {
      const action = validationAction === "approve" 
        ? (validationLevel === "technical" ? "validate_technical" : "validate_medical")
        : "reject";

      const response = await fetch(
        `/api/d/${workspaceid}/test-results/${selectedResult.resultid}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            comment: validationComment,
            rejectionreason: validationAction === "reject" ? rejectionReason : undefined,
          }),
        }
      );

      if (response.ok) {
        setAlertMessage(
          validationAction === "approve" 
            ? "Result validated successfully!" 
            : "Result rejected successfully!"
        );
        setShowAlert(true);
        setShowValidationDialog(false);
        fetchPendingResults();
      } else {
        const error = await response.json();
        setAlertMessage(error.error || "Failed to validate result");
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Error validating result:", error);
      setAlertMessage("Error validating result");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "entered":
        return <Badge className="bg-blue-100 text-blue-800">Entered</Badge>;
      case "validated":
        return <Badge className="bg-purple-100 text-purple-800">Validated</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "released":
        return <Badge className="bg-teal-100 text-teal-800">Released</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getFlagBadge = (flag?: string, iscritical?: boolean) => {
    if (iscritical) {
      return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    }
    if (flag === "H" || flag === "HH") {
      return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    }
    if (flag === "L" || flag === "LL") {
      return <Badge className="bg-yellow-100 text-yellow-800">Low</Badge>;
    }
    if (flag === "normal") {
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {validationLevel === "technical" ? "Technical Validation" : "Medical Validation"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Review and validate test results
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {results.length} Pending
        </Badge>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Results</CardTitle>
          <CardDescription>
            Results awaiting {validationLevel} validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending results for validation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.resultid} className={result.iscritical ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{result.sampleid.slice(0, 8)}...</TableCell>
                    <TableCell>{result.testname}</TableCell>
                    <TableCell className="font-semibold">
                      {result.resultvalue} {result.unit}
                    </TableCell>
                    <TableCell>{result.referencerange || "-"}</TableCell>
                    <TableCell>{getFlagBadge(result.flag, result.iscritical)}</TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {result.entereddate 
                        ? new Date(result.entereddate).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleValidate(result, "approve")}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleValidate(result, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationAction === "approve" ? "Approve Result" : "Reject Result"}
            </DialogTitle>
            <DialogDescription>
              {selectedResult && (
                <>
                  Test: {selectedResult.testname} | Result: {selectedResult.resultvalue} {selectedResult.unit}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {validationAction === "approve" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Validation Comment (Optional)</label>
                <Textarea
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  placeholder="Add any comments about this validation..."
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmValidation}
              disabled={loading || (validationAction === "reject" && !rejectionReason)}
              className={validationAction === "approve" 
                ? "bg-green-500 hover:bg-green-600" 
                : "bg-red-500 hover:bg-red-600"
              }
            >
              {loading ? "Processing..." : validationAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notification</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

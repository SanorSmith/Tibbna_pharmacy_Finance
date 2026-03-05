"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImagingRequest {
  composition_uid: string;
  request_name: string;
  description?: string;
  request_status: string;
  requested_by: string;
  recorded_time: string;
  urgency: string;
  target_body_site?: string;
  clinical_indication?: string;
  comment?: string;
}

interface ImagingResult {
  composition_uid: string;
  examination_name: string;
  body_site?: string;
  result_status: string;
  imaging_findings?: string;
  impression?: string;
  additional_details?: string;
  reported_by?: string;
  report_date: string;
  comment?: string;
}

interface ImagingTabProps {
  imagingRequests: ImagingRequest[];
  imagingResults: ImagingResult[];
  loadingImaging: boolean;
  showImagingRequestForm: boolean;
  setShowImagingRequestForm: (show: boolean) => void;
  loadImaging: () => Promise<void>;
  workspaceid: string;
  patient: { patientid: string };
  fullName: string;
}

export default function ImagingTab({
  imagingRequests,
  imagingResults,
  loadingImaging,
  showImagingRequestForm,
  setShowImagingRequestForm,
  loadImaging,
  workspaceid,
  patient,
  fullName,
}: ImagingTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<ImagingRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ImagingResult | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  return (
    <>
      {/* Imaging Requests Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-medium">Imaging Requests</CardTitle>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
              onClick={() => setShowImagingRequestForm(true)}
            >
              + New Imaging Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingImaging ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading imaging requests...
            </div>
          ) : imagingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No imaging requests found. Click &quot;+ New Imaging Request&quot; to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Name</TableHead>
                    <TableHead>Body Site</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imagingRequests.map((request) => (
                    <TableRow key={request.composition_uid}>
                      <TableCell className="font-medium">
                        {request.request_name}
                      </TableCell>
                      <TableCell>{request.target_body_site || "-"}</TableCell>
                      <TableCell>
                        <span className="capitalize">{request.urgency}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(request.recorded_time).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>{request.requested_by}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            request.request_status === "completed"
                              ? "bg-green-100 text-green-800"
                              : request.request_status === "in-progress"
                              ? "bg-yellow-100 text-yellow-800"
                              : request.request_status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {request.request_status.charAt(0).toUpperCase() +
                            request.request_status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRequestDetails(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imaging Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-medium">Imaging Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingImaging ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading imaging results...
            </div>
          ) : imagingResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No imaging results available.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Examination</TableHead>
                    <TableHead>Body Site</TableHead>
                    <TableHead>Impression</TableHead>
                    <TableHead>Report Date</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imagingResults.map((result) => (
                    <TableRow key={result.composition_uid}>
                      <TableCell className="font-medium">
                        {result.examination_name}
                      </TableCell>
                      <TableCell>{result.body_site || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {result.impression || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(result.report_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>{result.reported_by || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            result.result_status === "final"
                              ? "bg-green-100 text-green-800"
                              : result.result_status === "preliminary"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {result.result_status.charAt(0).toUpperCase() +
                            result.result_status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result);
                            setShowResultDetails(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imaging Request Form Dialog */}
      <Dialog
        open={showImagingRequestForm}
        onOpenChange={setShowImagingRequestForm}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Imaging Request</DialogTitle>
            <DialogDescription>
              Create an imaging examination request for {fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Request Name */}
            <div>
              <label className="text-sm font-medium">Request Name *</label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Chest X-Ray, CT Scan Abdomen"
                id="requestName"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief description of the imaging request..."
                id="description"
                aria-label="Imaging request description"
                title="Enter a brief description of the imaging request"
              />
            </div>

            {/* Clinical Indication */}
            <div>
              <label className="text-sm font-medium">
                Clinical Indication
              </label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Reason for imaging request..."
                id="clinicalIndication"
                aria-label="Clinical indication for imaging"
                title="Enter the reason for the imaging request"
              />
            </div>

            {/* Urgency & Contrast Use */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Urgency *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="urgency"
                  defaultValue="routine"
                  aria-label="Imaging request urgency"
                  title="Select the urgency level of the imaging request"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Contrast Use</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="contrastUse"
                  defaultValue="no"
                  aria-label="Contrast use for imaging"
                  title="Select whether contrast should be used"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Target Body Site */}
            <div>
              <label className="text-sm font-medium">
                Target Body Site
              </label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="e.g., Chest, Abdomen, Left knee"
                id="targetBodySite"
              />
            </div>

            {/* Patient Requirement */}
            <div>
              <label className="text-sm font-medium">
                Patient Requirement
              </label>
              <input
                type="text"
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                placeholder="Special patient requirements..."
                id="patientRequirement"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional comments..."
                id="comment"
                aria-label="Additional comments for imaging request"
                title="Enter any additional comments for the imaging request"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowImagingRequestForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  const requestName = (
                    document.getElementById(
                      "requestName"
                    ) as HTMLInputElement
                  )?.value;

                  if (!requestName) {
                    alert("Please fill in the request name");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patient.patientid}/imaging`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "request",
                          data: {
                            requestName,
                            description: (
                              document.getElementById(
                                "description"
                              ) as HTMLTextAreaElement
                            )?.value,
                            clinicalIndication: (
                              document.getElementById(
                                "clinicalIndication"
                              ) as HTMLTextAreaElement
                            )?.value,
                            urgency: (
                              document.getElementById(
                                "urgency"
                              ) as HTMLSelectElement
                            )?.value,
                            contrastUse: (
                              document.getElementById(
                                "contrastUse"
                              ) as HTMLSelectElement
                            )?.value,
                            targetBodySite: (
                              document.getElementById(
                                "targetBodySite"
                              ) as HTMLInputElement
                            )?.value,
                            patientRequirement: (
                              document.getElementById(
                                "patientRequirement"
                              ) as HTMLInputElement
                            )?.value,
                            comment: (
                              document.getElementById(
                                "comment"
                              ) as HTMLTextAreaElement
                            )?.value,
                          },
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadImaging();
                      setShowImagingRequestForm(false);
                      // Clear form
                      (
                        document.getElementById(
                          "requestName"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "description"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "clinicalIndication"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "targetBodySite"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "patientRequirement"
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "comment"
                        ) as HTMLTextAreaElement
                      ).value = "";
                    } else {
                      const error = await res.json();
                      alert(
                        `Failed to create imaging request: ${error.error}`
                      );
                    }
                  } catch (error) {
                    console.error("Error creating imaging request:", error);
                    alert("Failed to create imaging request");
                  }
                }}
              >
                Create Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Imaging Request Details Dialog */}
      <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Imaging Request Details</DialogTitle>
            <DialogDescription>
              Complete information about the imaging request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Request Name
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedRequest.request_name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedRequest.request_status === "completed"
                          ? "bg-green-100 text-green-800"
                          : selectedRequest.request_status === "in-progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedRequest.request_status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {selectedRequest.request_status.charAt(0).toUpperCase() +
                        selectedRequest.request_status.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Request Date
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {new Date(selectedRequest.recorded_time).toLocaleString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Requested By
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedRequest.requested_by}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Urgency
                  </label>
                  <div className="mt-1 text-md font-medium capitalize">
                    {selectedRequest.urgency}
                  </div>
                </div>
                {selectedRequest.target_body_site && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Target Body Site
                    </label>
                    <div className="mt-1 text-md font-medium">
                      {selectedRequest.target_body_site}
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <div className="mt-1 text-gray-700">
                    {selectedRequest.description}
                  </div>
                </div>
              )}

              {selectedRequest.clinical_indication && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Clinical Indication
                  </label>
                  <div className="mt-1 text-gray-700">
                    {selectedRequest.clinical_indication}
                  </div>
                </div>
              )}

              {selectedRequest.comment && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Comment
                  </label>
                  <div className="mt-1 text-gray-700">
                    {selectedRequest.comment}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Imaging Result Details Dialog */}
      <Dialog open={showResultDetails} onOpenChange={setShowResultDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Imaging Result Details</DialogTitle>
            <DialogDescription>
              Complete radiology report with findings and impression
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Examination
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedResult.examination_name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedResult.result_status === "final"
                          ? "bg-green-100 text-green-800"
                          : selectedResult.result_status === "preliminary"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {selectedResult.result_status.charAt(0).toUpperCase() +
                        selectedResult.result_status.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Report Date
                  </label>
                  <div className="mt-1 text-lg font-medium">
                    {new Date(selectedResult.report_date).toLocaleString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Reported By
                  </label>
                  <div className="mt-1 text-lg font-medium">
                    {selectedResult.reported_by || "Unknown"}
                  </div>
                </div>
                {selectedResult.body_site && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Body Site
                    </label>
                    <div className="mt-1 text-lg font-medium">
                      {selectedResult.body_site}
                    </div>
                  </div>
                )}
              </div>

              {selectedResult.imaging_findings && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-lg text-blue-900 mb-2">
                    Imaging Findings
                  </h4>
                  <div className="text-blue-900 whitespace-pre-line">
                    {selectedResult.imaging_findings}
                  </div>
                </div>
              )}

              {selectedResult.impression && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-lg text-purple-900 mb-2">
                    Impression
                  </h4>
                  <div className="text-purple-900 whitespace-pre-line">
                    {selectedResult.impression}
                  </div>
                </div>
              )}

              {selectedResult.additional_details && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Additional Details
                  </label>
                  <div className="mt-1 text-gray-700 whitespace-pre-line">
                    {selectedResult.additional_details}
                  </div>
                </div>
              )}

              {selectedResult.comment && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Comment
                  </label>
                  <div className="mt-1 text-gray-700">
                    {selectedResult.comment}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResultDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

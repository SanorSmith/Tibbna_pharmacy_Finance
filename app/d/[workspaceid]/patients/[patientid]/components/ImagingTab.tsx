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
  return (
    <>
      {/* Imaging Requests Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Imaging Requests</CardTitle>
            <Button
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
              No imaging requests found. Click "+ New Imaging Request" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {imagingRequests.map((request) => (
                <div
                  key={request.composition_uid}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">
                        {request.request_name}
                      </h4>
                      {request.description && (
                        <p className="text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      )}
                    </div>
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
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Requested By
                      </div>
                      <div>{request.requested_by}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Request Date
                      </div>
                      <div>
                        {new Date(
                          request.recorded_time
                        ).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Urgency
                      </div>
                      <div className="capitalize">{request.urgency}</div>
                    </div>
                    {request.target_body_site && (
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Body Site
                        </div>
                        <div>{request.target_body_site}</div>
                      </div>
                    )}
                  </div>
                  {request.clinical_indication && (
                    <div className="mt-3 text-sm">
                      <div className="text-muted-foreground text-xs mb-1">
                        Clinical Indication
                      </div>
                      <div>{request.clinical_indication}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imaging Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Imaging Results</CardTitle>
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
            <div className="space-y-4">
              {imagingResults.map((result) => (
                <div
                  key={result.composition_uid}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {result.examination_name}
                      </h4>
                      {result.body_site && (
                        <p className="text-sm text-muted-foreground">
                          {result.body_site}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  </div>

                  {result.imaging_findings && (
                    <div className="mb-3 p-3 bg-blue-50 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">
                        Imaging Findings
                      </p>
                      <p className="text-sm">{result.imaging_findings}</p>
                    </div>
                  )}

                  {result.impression && (
                    <div className="mb-3 p-3 bg-purple-50 rounded">
                      <p className="text-xs font-medium text-purple-900 mb-1">
                        Impression
                      </p>
                      <p className="text-sm">{result.impression}</p>
                    </div>
                  )}

                  {result.additional_details && (
                    <div className="mb-3 text-sm">
                      <div className="text-muted-foreground text-xs mb-1">
                        Additional Details
                      </div>
                      <div>{result.additional_details}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div>
                      {result.reported_by && (
                        <span>Reported by: {result.reported_by}</span>
                      )}
                      <span className="ml-3">
                        {new Date(result.report_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
    </>
  );
}

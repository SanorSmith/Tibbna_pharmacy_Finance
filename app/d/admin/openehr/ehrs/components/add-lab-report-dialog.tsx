"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  TestStatusCodes,
  InterpretationCodes,
  type TestStatusKey,
  type InterpretationKey,
  type LaboratoryReportData,
} from "@/lib/openehr/laboratory";

interface AddLabReportDialogProps {
  ehrId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TestResultForm {
  resultName: string;
  magnitude: string;
  unit: string;
  referenceRange: string;
  interpretation: InterpretationKey | "";
  comment: string;
}

interface TestEventForm {
  testName: string;
  testStatus: TestStatusKey | "";
  overallInterpretation: string;
  clinicalInformation: string;
  testResults: TestResultForm[];
}

const emptyTestResult: TestResultForm = {
  resultName: "",
  magnitude: "",
  unit: "",
  referenceRange: "",
  interpretation: "",
  comment: "",
};

const emptyTestEvent: TestEventForm = {
  testName: "",
  testStatus: "",
  overallInterpretation: "",
  clinicalInformation: "",
  testResults: [{ ...emptyTestResult }],
};

export function AddLabReportDialog({
  ehrId,
  isOpen,
  onClose,
  onSuccess,
}: AddLabReportDialogProps) {
  const { ttt } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    composerName: "",
    laboratory: "",
    reportId: "",
    status: "Final",
    startTime: new Date().toISOString().slice(0, 16),
    testMethod: "",
    specimenType: "",
  });

  const [testEvents, setTestEvents] = useState<TestEventForm[]>([
    { ...emptyTestEvent },
  ]);

  const addTestEvent = () => {
    setTestEvents([...testEvents, { ...emptyTestEvent, testResults: [{ ...emptyTestResult }] }]);
  };

  const removeTestEvent = (index: number) => {
    if (testEvents.length > 1) {
      setTestEvents(testEvents.filter((_, i) => i !== index));
    }
  };

  const updateTestEvent = (index: number, field: keyof TestEventForm, value: string) => {
    const updated = [...testEvents];
    updated[index] = { ...updated[index], [field]: value };
    setTestEvents(updated);
  };

  const addTestResult = (eventIndex: number) => {
    const updated = [...testEvents];
    updated[eventIndex].testResults.push({ ...emptyTestResult });
    setTestEvents(updated);
  };

  const removeTestResult = (eventIndex: number, resultIndex: number) => {
    const updated = [...testEvents];
    if (updated[eventIndex].testResults.length > 1) {
      updated[eventIndex].testResults = updated[eventIndex].testResults.filter(
        (_, i) => i !== resultIndex
      );
      setTestEvents(updated);
    }
  };

  const updateTestResult = (
    eventIndex: number,
    resultIndex: number,
    field: keyof TestResultForm,
    value: string
  ) => {
    const updated = [...testEvents];
    updated[eventIndex].testResults[resultIndex] = {
      ...updated[eventIndex].testResults[resultIndex],
      [field]: value,
    };
    setTestEvents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build the LaboratoryReportData object
      const reportData: LaboratoryReportData = {
        startTime: formData.startTime + ":00",
        composerName: formData.composerName || "Unknown",
        reportId: formData.reportId || undefined,
        status: formData.status || undefined,
        laboratory: formData.laboratory || undefined,
        testMethod: formData.testMethod || undefined,
        specimenType: formData.specimenType || undefined,
        testEvents: testEvents
          .filter((event) => event.testName)
          .map((event) => ({
            testName: event.testName,
            time: formData.startTime + ":00",
            testStatus: event.testStatus
              ? TestStatusCodes[event.testStatus]
              : undefined,
            overallInterpretation: event.overallInterpretation || undefined,
            clinicalInformation: event.clinicalInformation || undefined,
            testResults: event.testResults
              .filter((result) => result.resultName)
              .map((result) => ({
                resultName: result.resultName,
                resultValue: result.magnitude
                  ? {
                      magnitude: parseFloat(result.magnitude),
                      unit: result.unit || "1",
                    }
                  : undefined,
                referenceRange: result.referenceRange || undefined,
                interpretation: result.interpretation
                  ? InterpretationCodes[result.interpretation]
                  : undefined,
                comment: result.comment || undefined,
              })),
          })),
      };

      const response = await fetch("/api/ehrbase/reports/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ehrId,
          composition: reportData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || ttt("Failed to create lab report"));
      }

      // Reset form
      setFormData({
        composerName: "",
        laboratory: "",
        reportId: "",
        status: "Final",
        startTime: new Date().toISOString().slice(0, 16),
        testMethod: "",
        specimenType: "",
      });
      setTestEvents([{ ...emptyTestEvent, testResults: [{ ...emptyTestResult }] }]);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : ttt("Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ttt("Add Laboratory Report")}</DialogTitle>
          <DialogDescription>
            {ttt("Create a new laboratory report for this EHR")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">{ttt("Basic Information")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="composerName">{ttt("Composer Name")} *</Label>
                <Input
                  id="composerName"
                  required
                  value={formData.composerName}
                  onChange={(e) =>
                    setFormData({ ...formData, composerName: e.target.value })
                  }
                  placeholder={ttt("Enter composer name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="laboratory">{ttt("Laboratory")}</Label>
                <Input
                  id="laboratory"
                  value={formData.laboratory}
                  onChange={(e) =>
                    setFormData({ ...formData, laboratory: e.target.value })
                  }
                  placeholder={ttt("Enter laboratory name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportId">{ttt("Report ID")}</Label>
                <Input
                  id="reportId"
                  value={formData.reportId}
                  onChange={(e) =>
                    setFormData({ ...formData, reportId: e.target.value })
                  }
                  placeholder={ttt("Enter report ID")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">{ttt("Report Time")} *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMethod">{ttt("Test Method")}</Label>
                <Input
                  id="testMethod"
                  value={formData.testMethod}
                  onChange={(e) =>
                    setFormData({ ...formData, testMethod: e.target.value })
                  }
                  placeholder={ttt("Enter test method")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specimenType">{ttt("Specimen Type")}</Label>
                <Input
                  id="specimenType"
                  value={formData.specimenType}
                  onChange={(e) =>
                    setFormData({ ...formData, specimenType: e.target.value })
                  }
                  placeholder={ttt("e.g., Venous blood")}
                />
              </div>
            </div>
          </div>

          {/* Test Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold">{ttt("Test Events")}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addTestEvent}>
                <Plus className="h-4 w-4 mr-1" />
                {ttt("Add Test")}
              </Button>
            </div>

            {testEvents.map((event, eventIndex) => (
              <div
                key={eventIndex}
                className="border rounded-lg p-4 space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {ttt("Test")} #{eventIndex + 1}
                  </h4>
                  {testEvents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestEvent(eventIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{ttt("Test Name")} *</Label>
                    <Input
                      value={event.testName}
                      onChange={(e) =>
                        updateTestEvent(eventIndex, "testName", e.target.value)
                      }
                      placeholder={ttt("e.g., Complete Blood Count")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{ttt("Test Status")}</Label>
                    <Select
                      value={event.testStatus}
                      onValueChange={(value) =>
                        updateTestEvent(eventIndex, "testStatus", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ttt("Select status")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(TestStatusCodes).map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>{ttt("Overall Interpretation")}</Label>
                    <Input
                      value={event.overallInterpretation}
                      onChange={(e) =>
                        updateTestEvent(
                          eventIndex,
                          "overallInterpretation",
                          e.target.value
                        )
                      }
                      placeholder={ttt("Enter overall interpretation")}
                    />
                  </div>
                </div>

                {/* Test Results */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{ttt("Test Results")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTestResult(eventIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {ttt("Add Result")}
                    </Button>
                  </div>

                  {event.testResults.map((result, resultIndex) => (
                    <div
                      key={resultIndex}
                      className="grid grid-cols-6 gap-2 items-end bg-background p-3 rounded border"
                    >
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">{ttt("Result Name")}</Label>
                        <Input
                          value={result.resultName}
                          onChange={(e) =>
                            updateTestResult(
                              eventIndex,
                              resultIndex,
                              "resultName",
                              e.target.value
                            )
                          }
                          placeholder={ttt("e.g., Hemoglobin")}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{ttt("Value")}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={result.magnitude}
                          onChange={(e) =>
                            updateTestResult(
                              eventIndex,
                              resultIndex,
                              "magnitude",
                              e.target.value
                            )
                          }
                          placeholder="14.5"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{ttt("Unit")}</Label>
                        <Input
                          value={result.unit}
                          onChange={(e) =>
                            updateTestResult(
                              eventIndex,
                              resultIndex,
                              "unit",
                              e.target.value
                            )
                          }
                          placeholder="g/dL"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">{ttt("Interpretation")}</Label>
                        <Select
                          value={result.interpretation}
                          onValueChange={(value) =>
                            updateTestResult(
                              eventIndex,
                              resultIndex,
                              "interpretation",
                              value
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(InterpretationCodes).map((key) => (
                              <SelectItem key={key} value={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        {event.testResults.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestResult(eventIndex, resultIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">{ttt("Reference Range")}</Label>
                        <Input
                          value={result.referenceRange}
                          onChange={(e) =>
                            updateTestResult(
                              eventIndex,
                              resultIndex,
                              "referenceRange",
                              e.target.value
                            )
                          }
                          placeholder="12.0-16.0 g/dL"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {ttt("Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ttt("Create Report")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

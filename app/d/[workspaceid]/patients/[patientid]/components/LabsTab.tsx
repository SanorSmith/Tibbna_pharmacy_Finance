"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";

// Lab Results interfaces (openEHR compliant)
export interface LabTestAnalyte {
  analyte_name: string;
  analyte_code?: string;
  result_value: string | number;
  result_unit?: string;
  reference_range?: string;
  result_status: string;
  result_flag?: string;
}

export interface LabTestResult {
  composition_uid: string;
  recorded_time: string;
  test_name: string;
  test_name_code?: string;
  protocol: string;
  specimen_type?: string;
  specimen_collection_time?: string;
  specimen_received_time?: string;
  specimen_id?: string;
  overall_test_status: string;
  clinical_information_provided?: string;
  test_results: LabTestAnalyte[];
  conclusion?: string;
  test_diagnosis?: string;
  laboratory_name: string;
  reported_by?: string;
  verified_by?: string;
  report_date: string;
}

export interface LabTestOrder {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requested_date: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  timing: string;
  request_id: string;
  narrative: string;
}

interface LabsTabProps {
  workspaceid: string;
  patientid: string;
}

// Helper function to determine if result is abnormal based on reference range
const getResultStatus = (analyte: LabTestAnalyte) => {
  // Debug logging for iron result
  if (analyte.analyte_name?.toLowerCase().includes('iron')) {
    console.log('Iron Debug - Analyte:', {
      name: analyte.analyte_name,
      value: analyte.result_value,
      unit: analyte.result_unit,
      range: analyte.reference_range,
      flag: analyte.result_flag,
      status: analyte.result_status
    });
  }
  
  // PRIORITY 1: Parse reference range and compare with result value (most accurate)
  if (analyte.reference_range && analyte.result_value !== undefined && analyte.result_value !== null) {
    const result = parseFloat(String(analyte.result_value));
    if (!isNaN(result)) {
      const range = analyte.reference_range;
      
      if (analyte.analyte_name?.toLowerCase().includes('iron')) {
        console.log('Iron Debug - Parsing range:', { result, range });
      }
      
      // Handle various reference range formats
      // Example: "70-100", "< 5", "> 150", "3.5-11.0", "0.0-1.0"
      
      if (range.includes('-')) {
        // Range format: "70-100" or "60-170 µg/dL"
        // Extract just the numbers before any units
        const rangePart = range.split('-')[1].trim(); // Get "170 µg/dL"
        const maxStr = rangePart.split(' ')[0]; // Get "170"
        const minStr = range.split('-')[0].trim(); // Get "60"
        
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);
        
        if (!isNaN(min) && !isNaN(max)) {
          if (analyte.analyte_name?.toLowerCase().includes('iron')) {
            console.log('Iron Debug - Range parsed:', { min, max, comparison: { result, min, max }, originalRange: range });
          }
          if (result < min) {
            if (analyte.analyte_name?.toLowerCase().includes('iron')) {
              console.log('Iron Debug - Result is LOW');
            }
            return 'low';
          }
          if (result > max) {
            if (analyte.analyte_name?.toLowerCase().includes('iron')) {
              console.log('Iron Debug - Result is HIGH');
            }
            return 'high';
          }
        }
      } else if (range.includes('<')) {
        // Less than format: "< 5"
        const max = parseFloat(range.replace('<', '').trim());
        if (!isNaN(max) && result >= max) return 'high';
      } else if (range.includes('>')) {
        // Greater than format: "> 150"
        const min = parseFloat(range.replace('>', '').trim());
        if (!isNaN(min) && result <= min) return 'low';
      }
    }
  }
  
  // PRIORITY 2: If result_status is already set and not normal, use it
  if (analyte.result_status && analyte.result_status.toLowerCase() !== 'normal') {
    const status = analyte.result_status.toLowerCase();
    if (analyte.analyte_name?.toLowerCase().includes('iron')) {
      console.log('Iron Debug - Using result_status:', status);
    }
    return status;
  }
  
  // PRIORITY 3: If result_flag is set and not N (normal), use it
  if (analyte.result_flag && analyte.result_flag.toLowerCase() !== 'n') {
    const flag = analyte.result_flag.toLowerCase();
    if (analyte.analyte_name?.toLowerCase().includes('iron')) {
      console.log('Iron Debug - Using result_flag:', flag);
    }
    return flag;
  }
  
  if (analyte.analyte_name?.toLowerCase().includes('iron')) {
    console.log('Iron Debug - Falling back to NORMAL');
  }
  return 'normal';
};


export function LabsTab({ workspaceid, patientid }: LabsTabProps) {
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTestResult | null>(null);
  
  const [currentIndexByTest, setCurrentIndexByTest] = useState<Map<string, number>>(new Map());
  const [showHistoryByTest, setShowHistoryByTest] = useState<Map<string, boolean>>(new Map());
  const [expandedTestHistory, setExpandedTestHistory] = useState<Set<string>>(new Set());
  
  const [showLabOrderForm, setShowLabOrderForm] = useState(false);
  const [labOrderForm, setLabOrderForm] = useState({
    service_name: "",
    service_type_code: "104177005",
    service_type_value: "Complete blood count (procedure)",
    description: "",
    clinical_indication: "",
    urgency: "routine",
    requested_date: "",
    requesting_provider: "",
    receiving_provider: "",
    timing: "",
    narrative: "",
  });

  // Fetch dummy lab results (local data)
  const { data: dummyLabResults = [], isLoading: loadingDummyResults } = useQuery({
    queryKey: ["lab-results-dummy", workspaceid, patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/lab-results`);
      if (!res.ok) {
        throw new Error("Failed to load lab results");
      }
      const data = await res.json();
      return (data.labResults || []) as LabTestResult[];
    },
  });

  // lab-results API already groups LIMS results by OpenEHR order
  const allLabResults = dummyLabResults;
  const loadingLabResults = loadingDummyResults;
  const loadLabResults = () => {};

  // Sort by date (newest first) - each entry is an order
  const sortedLabResults = [...allLabResults].sort(
    (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
  );

  // Group by composition_uid (order) for navigation - each order is one entry
  const labResultsByOrder = new Map<string, LabTestResult[]>();
  
  sortedLabResults.forEach((result) => {
    const orderKey = result.composition_uid;
    const existing = labResultsByOrder.get(orderKey);
    if (existing) {
      existing.push(result);
    } else {
      labResultsByOrder.set(orderKey, [result]);
    }
  });

  // Convert to array for rendering
  const labResultRecords = Array.from(labResultsByOrder.entries());

  // Build test history: collect all values for each test across all orders
  const buildTestHistory = (testName: string) => {
    const history: Array<{ date: string; value: any; unit?: string; status: string; orderKey: string }> = [];
    
    // Search through all orders for this test
    for (const [orderKey, results] of labResultsByOrder) {
      for (const result of results) {
        const matchingTests = result.test_results.filter(
          (t: LabTestAnalyte) => t.analyte_name === testName
        );
        
        for (const test of matchingTests) {
          history.push({
            date: result.report_date,
            value: test.result_value,
            unit: test.result_unit,
            status: test.result_status || 'normal',
            orderKey: orderKey
          });
        }
      }
    }
    
    // Sort by date descending (newest first)
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const saveLabOrder = async () => {
    if (!labOrderForm.service_name || !labOrderForm.clinical_indication) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      console.log("Saving lab order with data:", labOrderForm);
      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/lab-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labOrder: labOrderForm,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save lab order"
        );
      }

      const result = await response.json();
      console.log("Lab order saved successfully:", result);

      setShowLabOrderForm(false);
      setLabOrderForm({
        service_name: "",
        service_type_code: "104177005",
        service_type_value: "Complete blood count (procedure)",
        description: "",
        clinical_indication: "",
        urgency: "routine",
        requested_date: "",
        requesting_provider: "",
        receiving_provider: "",
        timing: "",
        narrative: "",
      });
      
      // Wait a moment for the composition to be available, then reload
      setTimeout(() => {
        loadLabResults();
      }, 500);
    } catch (error) {
      console.error("Error saving lab order:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save lab order"
      );
    }
  };

  return (
    <div>
       <Card className="bg-card-bg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Laboratory Test Results</CardTitle>
          </div>
         
        </div>
      </CardHeader>
      <CardContent>
        {loadingLabResults ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading lab results...
          </div>
        ) : labResultRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lab results found.
          </div>
        ) : (
          <div className="space-y-6">
            {labResultRecords.map(([orderKey, results]) => {
              const currentIndex = currentIndexByTest.get(orderKey) || 0;
              const showHistory = showHistoryByTest.get(orderKey) || false;
              const currentResult = results[currentIndex];
              const hasMultipleResults = results.length > 1;
              const samples = (currentResult as any).samples || [];
              const hasSamples = samples.length > 0;

              return (
                <div
                  key={orderKey}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header with Navigation */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {currentResult.test_name}
                        </h3>
                        {(currentResult as any).source === "openEHR" && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            OpenEHR
                          </span>
                        )}
                        {hasSamples && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {samples.length} sample{samples.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {hasMultipleResults && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {currentIndex + 1} of {results.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currentResult.laboratory_name}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            currentResult.overall_test_status === "final"
                              ? "bg-green-100 text-green-800"
                              : currentResult.overall_test_status === "preliminary"
                              ? "bg-yellow-100 text-yellow-800"
                              : currentResult.overall_test_status === "amended"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {currentResult.overall_test_status
                            .charAt(0)
                            .toUpperCase() +
                            currentResult.overall_test_status.slice(1)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(currentResult.report_date).toLocaleDateString()}
                        </p>
                      </div>
                      {/* Navigation Buttons */}
                      {hasMultipleResults && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newIndex = Math.max(0, currentIndex - 1);
                              setCurrentIndexByTest(new Map(currentIndexByTest.set(orderKey, newIndex)));
                            }}
                            disabled={currentIndex === 0}
                            className="h-7 px-2 text-xs"
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newIndex = Math.min(results.length - 1, currentIndex + 1);
                              setCurrentIndexByTest(new Map(currentIndexByTest.set(orderKey, newIndex)));
                            }}
                            disabled={currentIndex === results.length - 1}
                            className="h-7 px-2 text-xs"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Samples in this order */}
                {hasSamples && (
                  <div className="mb-3 p-2 bg-muted/30 rounded">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Specimens ({samples.length})
                    </p>
                    <div className="space-y-1">
                      {samples.map((sample: any) => (
                        <div key={sample.sampleid} className="flex items-center gap-4 text-sm">
                          <span className="font-medium">{sample.samplenumber}</span>
                          <span className="text-muted-foreground">{sample.sampletype}</span>
                          {sample.labcategory && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{sample.labcategory}</span>
                          )}
                          {sample.collectiondate && (
                            <span className="text-xs text-muted-foreground">
                              Collected: {new Date(sample.collectiondate).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-LIMS specimen details (OpenEHR / dummy) */}
                {!hasSamples && currentResult.specimen_type && (
                  <div className="mb-3 p-2 bg-muted/30 rounded">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Specimen Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Type:
                        </span>{" "}
                        {currentResult.specimen_type}
                      </div>
                      {currentResult.specimen_collection_time && (
                        <div>
                          <span className="text-muted-foreground">
                            Collected:
                          </span>{" "}
                          {new Date(
                            currentResult.specimen_collection_time
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Test Results with Traffic Light Colors and History */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">Test Results</p>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left text-xs font-medium">
                            Analyte
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            Reference Range
                          </th>
                          {hasSamples && (
                            <th className="p-2 text-left text-xs font-medium">
                              Sample
                            </th>
                          )}
                          <th className="p-2 text-left text-xs font-medium">
                            Current Result
                          </th>
                          {hasMultipleResults && (
                            <>
                              {results.slice(1, 4).map((histResult, histIdx) => (
                                <th key={histIdx} className="p-2 text-left text-xs font-medium text-muted-foreground">
                                  {new Date(histResult.report_date).toLocaleDateString('sv-SE')}
                                </th>
                              ))}
                            </>
                          )}
                          <th className="p-2 text-left text-xs font-medium">
                            Status
                          </th>
                          <th className="p-2 text-left text-xs font-medium">
                            History
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentResult.test_results.map((analyte: LabTestAnalyte, idx: number) => {
                          // Get full history for this test across all orders
                          const testHistory = buildTestHistory(analyte.analyte_name);
                          const hasHistory = testHistory.length > 1;
                          const historyKey = `${orderKey}-${analyte.analyte_name}`;
                          const isHistoryExpanded = expandedTestHistory.has(historyKey);
                          
                          return (<React.Fragment key={idx}>
                            <tr className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-2 text-sm font-medium">
                              {analyte.analyte_name}
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {analyte.reference_range || "N/A"}
                            </td>
                            {hasSamples && (
                              <td className="p-2 text-xs text-muted-foreground">
                                {(analyte as any).samplenumber || '-'}
                              </td>
                            )}
                            <td className="p-2 text-sm font-semibold">
                              {(() => {
                                const status = getResultStatus(analyte);
                                return (
                                  <span
                                    className={`${
                                      status === "high" || status === "h"
                                        ? "text-red-600"
                                        : status === "low" || status === "l"
                                        ? "text-blue-600"
                                        : status === "critical" || status === "hh"
                                        ? "text-red-700 font-bold"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {analyte.result_value !== undefined && analyte.result_value !== null
                                      ? String(analyte.result_value)
                                      : "-"}
                                    {analyte.result_unit && ` ${analyte.result_unit}`}
                                  </span>
                                );
                              })()}
                            </td>
                            {hasMultipleResults && historicalValues.map((histValue, histIdx) => (
                              <td key={histIdx} className="p-2 text-sm text-muted-foreground">
                                {histValue !== '-' ? String(histValue) : '-'}
                              </td>
                            ))}
                            <td className="p-2 text-sm">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  (() => {
                                    const status = getResultStatus(analyte);
                                    return status === "normal" || status === "n"
                                      ? "bg-green-100 text-green-800"
                                      : status === "high" || status === "h"
                                      ? "bg-red-100 text-red-800"
                                      : status === "low" || status === "l"
                                      ? "bg-blue-100 text-blue-800"
                                      : status === "critical" || status === "hh"
                                      ? "bg-red-100 text-red-800 font-bold"
                                      : "bg-gray-100 text-gray-800";
                                  })()
                                }`}
                                aria-label={`Result status: ${getResultStatus(analyte)}`}
                                title={`Result status: ${getResultStatus(analyte)}`}
                              >
                                {(() => {
                                  const status = getResultStatus(analyte);
                                  return (status === "critical" || status === "hh")
                                    ? "CRITICAL"
                                    : status.toUpperCase();
                                })()}
                              </span>
                            </td>
                            <td className="p-2 text-sm">
                              {hasHistory && (
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedTestHistory);
                                    if (isHistoryExpanded) {
                                      newSet.delete(historyKey);
                                    } else {
                                      newSet.add(historyKey);
                                    }
                                    setExpandedTestHistory(newSet);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  {isHistoryExpanded ? 'Hide' : 'View'} History ({testHistory.length})
                                </button>
                              )}
                            </td>
                          </tr>
                          
                          {/* Expandable history row */}
                          {isHistoryExpanded && (
                            <tr className="bg-blue-50">
                              <td colSpan={hasSamples ? 6 : 5} className="p-3">
                                <div className="text-xs font-semibold mb-2 text-blue-900">
                                  Test History for {analyte.analyte_name}
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-blue-200">
                                        <th className="p-2 text-left">Date</th>
                                        <th className="p-2 text-left">Result</th>
                                        <th className="p-2 text-left">Reference</th>
                                        <th className="p-2 text-left">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {testHistory.map((hist, histIdx) => (
                                        <tr key={histIdx} className="border-b border-blue-100 last:border-0">
                                          <td className="p-2">{new Date(hist.date).toLocaleDateString('sv-SE')}</td>
                                          <td className="p-2 font-semibold">
                                            {hist.value} {hist.unit || ''}
                                          </td>
                                          <td className="p-2 text-muted-foreground">{analyte.reference_range || 'N/A'}</td>
                                          <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                              hist.status === 'normal' ? 'bg-green-100 text-green-800' :
                                              hist.status === 'abnormal' ? 'bg-red-100 text-red-800' :
                                              hist.status === 'critical' ? 'bg-red-100 text-red-800 font-bold' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {hist.status.toUpperCase()}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinical Information */}
                {currentResult.clinical_information_provided && (
                  <div className="mb-3 p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium text-blue-900 mb-1">
                      Clinical Information Provided
                    </p>
                    <p className="text-sm">
                      {currentResult.clinical_information_provided}
                    </p>
                  </div>
                )}

                {/* Conclusion */}
                {currentResult.conclusion && (
                  <div className="mb-3 p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium text-purple-900 mb-1">
                      Conclusion
                    </p>
                    <p className="text-sm">{currentResult.conclusion}</p>
                  </div>
                )}

                {/* Test Diagnosis */}
                {currentResult.test_diagnosis && (
                  <div className="mb-3 p-2 bg-orange-50 rounded">
                    <p className="text-xs font-medium text-orange-900 mb-1">
                      Test Diagnosis
                    </p>
                    <p className="text-sm">{currentResult.test_diagnosis}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div>
                    {currentResult.reported_by && (
                      <span>Reported by: {currentResult.reported_by}</span>
                    )}
                    {currentResult.verified_by && (
                      <span className="ml-3">
                        Verified by: {currentResult.verified_by}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {hasMultipleResults && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newMap = new Map(showHistoryByTest);
                          newMap.set(orderKey, !showHistory);
                          setShowHistoryByTest(newMap);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        {showHistory ? 'Hide History' : 'Show History'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={async () => {
                        const result = currentResult as any;
                        const orderSamples = result.samples || [];
                        
                        console.log('[Print] Order samples:', orderSamples);
                        console.log('[Print] Result source:', result.source);
                        console.log('[Print] Result sampleid:', result.sampleid);
                        
                        if (result.source === 'lims' && orderSamples.length > 0) {
                          // LIMS order with multiple samples: fetch all reports and combine into one
                          try {
                            console.log(`[Print] Fetching reports for ${orderSamples.length} samples`);
                            
                            const reports: any[] = [];
                            // Fetch all sample reports
                            for (const sample of orderSamples) {
                              try {
                                console.log(`[Print] Fetching report for sample ${sample.samplenumber} (${sample.sampleid})`);
                                const response = await fetch(`/api/d/${workspaceid}/lab-report/${sample.sampleid}`);
                                if (response.ok) {
                                  const { report } = await response.json();
                                  reports.push(report);
                                  console.log(`[Print] Added report data for sample ${sample.samplenumber}`);
                                }
                              } catch (err) {
                                console.error(`Error fetching report for sample ${sample.samplenumber}:`, err);
                              }
                            }
                            
                            if (reports.length === 0) {
                              console.error('[Print] No reports fetched');
                              return;
                            }
                            
                            console.log(`[Print] Generating combined report for ${reports.length} samples`);
                            
                            // Generate a single combined report HTML
                            const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                            
                            // Use the first report's facility and patient info
                            const firstReport = reports[0];
                            
                            // Combine all test results from all samples
                            const allResults = reports.flatMap(r => r.results || []);
                            
                            // Create a combined report with all samples
                            const combinedReport = {
                              facility: firstReport.facility,
                              patient: firstReport.patient,
                              sample: {
                                ...firstReport.sample,
                                samplenumber: orderSamples.map((s: any) => s.samplenumber).join(', '),
                                sampletype: 'Multiple Specimens',
                              },
                              results: allResults,
                              generatedAt: new Date().toISOString(),
                            };
                            
                            const html = generateLabReportHTML(combinedReport);
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(html);
                              printWindow.document.close();
                            }
                          } catch (err) {
                            console.error('Print error:', err);
                          }
                        } else if (result.source === 'lims' && result.sampleid) {
                          // Single LIMS sample (fallback)
                          try {
                            const response = await fetch(`/api/d/${workspaceid}/lab-report/${result.sampleid}`);
                            if (!response.ok) throw new Error('Failed to fetch report');
                            const { report } = await response.json();
                            const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                            const html = generateLabReportHTML(report);
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(html);
                              printWindow.document.close();
                            }
                          } catch (err) {
                            console.error('Print error:', err);
                          }
                        } else {
                          // OpenEHR / dummy result: generate report from existing data
                          const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                          const reportData = {
                            facility: { name: currentResult.laboratory_name || 'Laboratory' },
                            patient: null,
                            sample: {
                              sampleid: currentResult.specimen_id || currentResult.composition_uid,
                              samplenumber: currentResult.protocol || currentResult.specimen_id || '-',
                              sampletype: currentResult.specimen_type || 'Blood',
                              containertype: '-',
                              collectiondate: currentResult.specimen_collection_time || currentResult.recorded_time,
                              currentstatus: currentResult.overall_test_status,
                              barcode: '-',
                            },
                            results: currentResult.test_results.map((a: LabTestAnalyte) => ({
                              resultid: '',
                              testcode: a.analyte_code || '',
                              testname: a.analyte_name,
                              resultvalue: String(a.result_value ?? '-'),
                              unit: a.result_unit || null,
                              referencemin: null,
                              referencemax: null,
                              referencerange: a.reference_range || null,
                              flag: a.result_flag || 'normal',
                              isabormal: a.result_status !== 'normal',
                              iscritical: a.result_status === 'critical',
                              status: currentResult.overall_test_status,
                              releasedbyname: currentResult.verified_by || null,
                              releaseddate: currentResult.report_date || null,
                            })),
                            generatedAt: new Date().toISOString(),
                          };
                          const html = generateLabReportHTML(reportData as any);
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(html);
                            printWindow.document.close();
                          }
                        }
                      }}
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      Print
                    </Button>
                    <button
                      onClick={() => {
                        setSelectedTest(currentResult);
                        setShowTestDetails(true);
                      }}
                      className="text-primary hover:underline"
                      aria-label="View detailed lab result information"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* History Section */}
                {hasMultipleResults && showHistory && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Previous Results</h4>
                    <div className="space-y-2">
                      {results.slice(1).map((historyResult, idx) => (
                        <div
                          key={historyResult.composition_uid}
                          className="border rounded p-3 bg-muted/20 hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            setCurrentIndexByTest(new Map(currentIndexByTest.set(orderKey, idx + 1)));
                            setShowHistoryByTest(new Map(showHistoryByTest.set(orderKey, false)));
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium">
                              {new Date(historyResult.report_date).toLocaleDateString()}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                historyResult.overall_test_status === "final"
                                  ? "bg-green-100 text-green-800"
                                  : historyResult.overall_test_status === "preliminary"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {historyResult.overall_test_status.charAt(0).toUpperCase() +
                                historyResult.overall_test_status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {historyResult.test_results.slice(0, 4).map((analyte: LabTestAnalyte, i: number) => (
                              <div key={i} className="flex justify-between">
                                <span className="text-muted-foreground">{analyte.analyte_name}:</span>
                                <span className="font-medium">
                                  {analyte.result_value} {analyte.result_unit}
                                </span>
                              </div>
                            ))}
                          </div>
                          {historyResult.test_results.length > 4 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              +{historyResult.test_results.length - 4} more results
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Test Details Dialog */}
    <Dialog open={showTestDetails} onOpenChange={setShowTestDetails}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lab Test Details</DialogTitle>
          <DialogDescription>
            Detailed information about the laboratory test
          </DialogDescription>
        </DialogHeader>
        {selectedTest && (
          <div className="space-y-4">
            {/* Laboratory Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Laboratory Name
                </div>
                <div className="text-base font-semibold">
                  {selectedTest.laboratory_name}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Test Date
                </div>
                <div className="text-base">{new Date(selectedTest.report_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Test Name */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Test Name
              </div>
              <div className="text-lg font-semibold">
                {selectedTest.test_name}
              </div>
            </div>

            {/* Results */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Test Results
              </div>
              <div className="space-y-2">
                {selectedTest.test_results?.map((analyte: LabTestAnalyte, index: number) => (
                  <div key={index} className="grid grid-cols-4 gap-2 text-sm border-b pb-2">
                    <div className="font-medium">{analyte.analyte_name}</div>
                    <div className="font-bold">{analyte.result_value} {analyte.result_unit}</div>
                    <div className="text-muted-foreground">{analyte.reference_range}</div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          analyte.result_status === "normal"
                            ? "bg-green-100 text-green-800"
                            : analyte.result_status === "abnormal"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {analyte.result_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Information */}
            {selectedTest.clinical_information_provided && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Clinical Information
                </div>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm">{selectedTest.clinical_information_provided}</p>
                </div>
              </div>
            )}

            {/* Conclusion */}
            {selectedTest.conclusion && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Conclusion
                </div>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm">{selectedTest.conclusion}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTestDetails(false)}
              >
                Close
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  if (!selectedTest) return;
                  const test = selectedTest as any;

                  if (test.source === 'lims' && test.sampleid) {
                    // LIMS: fetch full report from API
                    try {
                      const response = await fetch(`/api/d/${workspaceid}/lab-report/${test.sampleid}`);
                      if (!response.ok) throw new Error('Failed to fetch report');
                      const { report } = await response.json();
                      const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                      const html = generateLabReportHTML(report);
                      const pw = window.open('', '_blank');
                      if (pw) { pw.document.write(html); pw.document.close(); }
                    } catch (err) {
                      console.error('Print error:', err);
                    }
                  } else {
                    // OpenEHR / dummy: build report data from existing fields
                    const { generateLabReportHTML } = await import('@/lib/lims/lab-report-html');
                    const reportData = {
                      facility: { name: selectedTest.laboratory_name || 'Laboratory' },
                      patient: null,
                      sample: {
                        sampleid: selectedTest.specimen_id || selectedTest.composition_uid,
                        samplenumber: selectedTest.protocol || selectedTest.specimen_id || '-',
                        sampletype: selectedTest.specimen_type || 'Blood',
                        containertype: '-',
                        collectiondate: selectedTest.specimen_collection_time || selectedTest.recorded_time,
                        currentstatus: selectedTest.overall_test_status,
                        barcode: '-',
                      },
                      results: selectedTest.test_results.map((a: LabTestAnalyte) => ({
                        resultid: '',
                        testcode: a.analyte_code || '',
                        testname: a.analyte_name,
                        resultvalue: String(a.result_value ?? '-'),
                        unit: a.result_unit || null,
                        referencemin: null,
                        referencemax: null,
                        referencerange: a.reference_range || null,
                        flag: a.result_flag || 'normal',
                        isabormal: a.result_status !== 'normal',
                        iscritical: a.result_status === 'critical',
                        status: selectedTest.overall_test_status,
                        releasedbyname: selectedTest.verified_by || null,
                        releaseddate: selectedTest.report_date || null,
                      })),
                      generatedAt: new Date().toISOString(),
                    };
                    const html = generateLabReportHTML(reportData as any);
                    const pw = window.open('', '_blank');
                    if (pw) { pw.document.write(html); pw.document.close(); }
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

     

      {/* Lab Order Form Dialog */}
      <Dialog open={showLabOrderForm} onOpenChange={setShowLabOrderForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
            <DialogDescription>
              Create a new laboratory test request based on openEHR service request template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label htmlFor="service_name" className="text-sm font-medium">
                Test Name *
              </label>
              <input
                id="service_name"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50"
                placeholder="Select test type below"
                value={labOrderForm.service_name}
                readOnly
                aria-label="Test name (auto-populated)"
                title="Test name is automatically populated when you select a test type"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select a test type below to auto-populate the test name
              </p>
            </div>

            {/* Service Type */}
            <div>
              <label htmlFor="service_type" className="text-sm font-medium">
                Test Type *
              </label>
              <select
                id="service_type"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={labOrderForm.service_type_code}
                onChange={(e) => {
                  const selected = e.target.value;
                  const testTypes: Record<string, { code: string; value: string; name: string }> = {
                    "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)" },
                    "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel" },
                    "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test" },
                    "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test" },
                    "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test" },
                  };
                  
                  const selectedType = testTypes[selected];
                  if (selectedType) {
                    setLabOrderForm({
                      ...labOrderForm,
                      service_name: selectedType.name,
                      service_type_code: selectedType.code,
                      service_type_value: selectedType.value,
                    });
                  }
                }}
                aria-label="Test type"
                title="Select the type of laboratory test"
              >
                <option value="">Select test type</option>
                <option value="104177005">Complete Blood Count (CBC)</option>
                <option value="257051000">Comprehensive Metabolic Panel</option>
                <option value="116276005">Blood Glucose</option>
                <option value="271749007">Serum Cholesterol</option>
                <option value="271658002">Serum Triglycerides</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a test type will automatically fill the test name and SNOMED-CT codes
              </p>
            </div>

            {/* Clinical Indication */}
            <div>
              <label htmlFor="clinical_indication" className="text-sm font-medium">
                Clinical Indication *
              </label>
              <textarea
                id="clinical_indication"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia."
                value={labOrderForm.clinical_indication}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    clinical_indication: e.target.value,
                  })
                }
                aria-label="Clinical indication"
                title="Describe the clinical reason for ordering this test"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Additional details about the test request"
                value={labOrderForm.description}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    description: e.target.value,
                  })
                }
                aria-label="Test description"
                title="Additional description for the laboratory test"
              />
            </div>

            {/* Urgency and Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="urgency" className="text-sm font-medium">
                  Urgency
                </label>
                <select
                  id="urgency"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={labOrderForm.urgency}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      urgency: e.target.value,
                    })
                  }
                  aria-label="Urgency"
                  title="Select the urgency of the test request"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                  <option value="asap">ASAP</option>
                </select>
              </div>
              <div>
                <label htmlFor="timing" className="text-sm font-medium">
                  Scheduled Date/Time
                </label>
                <input
                  id="timing"
                  type="datetime-local"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={labOrderForm.timing}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      timing: e.target.value,
                    })
                  }
                  aria-label="Scheduled timing"
                  title="When the test should be performed"
                />
              </div>
            </div>

            
            {/* Provider Information */}
           {/*  

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="requesting_provider" className="text-sm font-medium">
                  Requesting Provider
                </label>
                <input
                  id="requesting_provider"
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Dr. John Doe, General Medicine"
                  value={labOrderForm.requesting_provider}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      requesting_provider: e.target.value,
                    })
                  }
                  aria-label="Requesting provider"
                  title="Name of the healthcare provider ordering the test"
                />
              </div>
              <div>
                <label htmlFor="receiving_provider" className="text-sm font-medium">
                  Receiving Laboratory
                </label>
                <input
                  id="receiving_provider"
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Hematology Laboratory"
                  value={labOrderForm.receiving_provider}
                  onChange={(e) =>
                    setLabOrderForm({
                      ...labOrderForm,
                      receiving_provider: e.target.value,
                    })
                  }
                  aria-label="Receiving provider"
                  title="Laboratory that will perform the test"
                />
              </div>
            </div> */}

            {/* Narrative */}
            <div>
              <label htmlFor="narrative" className="text-sm font-medium">
                Narrative Summary
              </label>
              <textarea
                id="narrative"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief summary of the lab order"
                value={labOrderForm.narrative}
                onChange={(e) =>
                  setLabOrderForm({
                    ...labOrderForm,
                    narrative: e.target.value,
                  })
                }
                aria-label="Narrative summary"
                title="Brief narrative summary of the lab order"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLabOrderForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={saveLabOrder}
              >
                Order Lab Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  </div>
  );
}

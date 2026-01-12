/**
 * Validation Tab Component - Clinical Validation Worklist
 * Production-ready LIMS validation module
 * 
 * Features:
 * - Server-side filtered worklist
 * - Critical/abnormal result highlighting
 * - Date range, analyzer, and test group filters
 * - Status-based filtering
 * - Click-through to detailed validation screen
 */
"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Filter, Loader2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ValidationWorklistItem {
  sample: {
    sampleid: string;
    samplenumber: string;
    patientid: string;
    orderid: string;
    sampletype: string;
    collectiondate: string;
    analyzer: string | null;
    testgroup: string | null;
    priority: string | null;
    // Patient demographics
    patientName?: string;
    patientage?: number;
    patientsex?: string;
  };
  validationState: {
    currentstate: string;
    validateddate: string | null;
  } | null;
  hasCritical: boolean;
  hasAbnormal: boolean;
  criticalCount: number;
  abnormalCount: number;
  results?: Array<{
    resultid: string;
    testcode: string;
    testname: string;
    resultvalue: string;
    unit: string;
    flag: string;
    isabormal: boolean;
    iscritical: boolean;
  }>;
}

export default function ValidationTab({ workspaceid }: { workspaceid: string }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<string>("all");
  const [selectedTestGroup, setSelectedTestGroup] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams({ workspaceid });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (selectedAnalyzer !== "all") params.append("analyzer", selectedAnalyzer);
    if (selectedTestGroup !== "all") params.append("testGroup", selectedTestGroup);
    if (selectedStatus !== "all") params.append("status", selectedStatus);
    if (abnormalOnly) params.append("abnormalOnly", "true");
    if (criticalOnly) params.append("criticalOnly", "true");
    return params.toString();
  };

  // Fetch worklist
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["validation-worklist", workspaceid, startDate, endDate, selectedAnalyzer, selectedTestGroup, selectedStatus, abnormalOnly, criticalOnly],
    queryFn: async () => {
      console.log("Fetching validation worklist with params:", buildQueryParams());
      const response = await fetch(`/api/lims/worklist?${buildQueryParams()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch worklist");
      const data = await response.json();
      console.log("Validation worklist data:", data);
      console.log("Number of samples in worklist:", data.samples?.length || 0);
      return data;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const samples: ValidationWorklistItem[] = data?.samples || [];

  const toggleRow = (sampleid: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sampleid)) {
        newSet.delete(sampleid);
      } else {
        newSet.add(sampleid);
      }
      return newSet;
    });
  };

  const getStatusBadge = (state: string | null) => {
    if (!state) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }

    switch (state) {
      case "ANALYZED":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Analyzed
          </Badge>
        );
      case "TECH_VALIDATED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-blue-600">
            <CheckCircle2 className="h-3 w-3" />
            Tech Validated
          </Badge>
        );
      case "CLINICALLY_VALIDATED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Validated
          </Badge>
        );
      case "RELEASED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Released
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "RERUN_REQUESTED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Rerun Requested
          </Badge>
        );
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "stat" || priority === "urgent") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {priority.toUpperCase()}
        </Badge>
      );
    } else if (priority === "asap") {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-orange-500">
          <Clock className="h-3 w-3" />
          {priority.toUpperCase()}
        </Badge>
      );
    } else {
      // Handle ROUTINE and other priorities
      return (
        <Badge variant="outline" className="text-xs">
          {priority.toUpperCase()}
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clinical Validation Worklist</CardTitle>
            <CardDescription>
              Review and validate laboratory test results before release
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {samples.length} sample{samples.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-sm">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-xs">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="analyzer" className="text-xs">Analyzer</Label>
              <Select value={selectedAnalyzer} onValueChange={setSelectedAnalyzer}>
                <SelectTrigger id="analyzer" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Analyzers</SelectItem>
                  <SelectItem value="cobas">Cobas</SelectItem>
                  <SelectItem value="sysmex">Sysmex</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="testGroup" className="text-xs">Test Group</Label>
              <Select value={selectedTestGroup} onValueChange={setSelectedTestGroup}>
                <SelectTrigger id="testGroup" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="hematology">Hematology</SelectItem>
                  <SelectItem value="biochemistry">Biochemistry</SelectItem>
                  <SelectItem value="immunology">Immunology</SelectItem>
                  <SelectItem value="microbiology">Microbiology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ANALYZED">Analyzed</SelectItem>
                  <SelectItem value="TECH_VALIDATED">Tech Validated</SelectItem>
                  <SelectItem value="CLINICALLY_VALIDATED">Validated</SelectItem>
                  <SelectItem value="RERUN_REQUESTED">Rerun Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={abnormalOnly}
                onChange={(e) => {
                  setAbnormalOnly(e.target.checked);
                  if (e.target.checked) setCriticalOnly(false);
                }}
                className="rounded"
              />
              <span>Abnormal only</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => {
                  setCriticalOnly(e.target.checked);
                  if (e.target.checked) setAbnormalOnly(false);
                }}
                className="rounded"
              />
              <span className="text-red-600 font-medium">Critical only</span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedAnalyzer("all");
                setSelectedTestGroup("all");
                setSelectedStatus("all");
                setAbnormalOnly(false);
                setCriticalOnly(false);
              }}
              className="ml-auto"
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-2"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-3" />
            <p>Failed to load validation worklist</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && samples.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No samples pending validation</p>
            <p className="text-sm mt-2">Samples requiring validation will appear here</p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch("/api/lims/seed", { method: "POST" });
                  if (response.ok) {
                    refetch();
                  } else {
                    alert("Failed to seed data. Check console for details.");
                  }
                } catch (error) {
                  console.error("Seed error:", error);
                  alert("Failed to seed data");
                }
              }}
              className="mt-4"
            >
              Generate Test Data
            </Button>
          </div>
        )}

        {/* Worklist Table */}
        {!isLoading && !error && samples.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold">Sample Number</TableHead>
                  <TableHead className="font-semibold">Patient Name</TableHead>
                  <TableHead className="font-semibold">Age</TableHead>
                  <TableHead className="font-semibold">Sex</TableHead>
                  <TableHead className="font-semibold">Collection Date</TableHead>
                  <TableHead className="font-semibold">Test Group</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Results</TableHead>
                  <TableHead className="font-semibold">Analyzer</TableHead>
                  <TableHead className="font-semibold">Flags</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map((item) => (
                  <React.Fragment key={item.sample.sampleid}>
                  <TableRow
                    className={`hover:bg-gray-50 ${
                      item.hasCritical ? "bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="font-medium text-blue-600">
                      {item.sample.samplenumber || item.sample.sampleid.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {item.sample.patientName || item.sample.patientid || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.sample.patientage ? `${item.sample.patientage} yrs` : '-'}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {item.sample.patientsex || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(item.sample.collectiondate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.sample.testgroup || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(item.sample.priority || 'ROUTINE')}
                    </TableCell>
                    <TableCell>
                      {item.results && item.results.length > 0 ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleRow(item.sample.sampleid)}
                          className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {expandedRows.has(item.sample.sampleid) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {item.results.length} test{item.results.length > 1 ? 's' : ''}
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">No results</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.sample.analyzer || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.hasCritical && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {item.criticalCount} Critical
                          </Badge>
                        )}
                        {item.hasAbnormal && !item.hasCritical && (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            {item.abnormalCount} Abnormal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.validationState?.currentstate || null)}
                    </TableCell>
                  </TableRow>
                  {/* Expanded row showing test results */}
                  {expandedRows.has(item.sample.sampleid) && item.results && item.results.length > 0 && (
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={10} className="p-0">
                        <div className="p-4">
                          <h4 className="font-semibold text-sm mb-3">Test Results ({item.results.length})</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium">Test Name</th>
                                  <th className="text-left py-2 px-3 font-medium">Result</th>
                                  <th className="text-left py-2 px-3 font-medium">Unit</th>
                                  <th className="text-left py-2 px-3 font-medium">Reference Range</th>
                                  <th className="text-left py-2 px-3 font-medium">Flag</th>
                                  <th className="text-left py-2 px-3 font-medium">Status</th>
                                  <th className="text-center py-2 px-3 font-medium">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.results.map((result: any) => (
                                  <tr key={result.resultid} className="border-b last:border-0">
                                    <td className="py-2 px-3 font-medium">{result.testname}</td>
                                    <td className="py-2 px-3">{result.resultvalue}</td>
                                    <td className="py-2 px-3 text-gray-600">{result.unit || '-'}</td>
                                    <td className="py-2 px-3 text-gray-600">
                                      {result.referencemin && result.referencemax 
                                        ? `${result.referencemin} - ${result.referencemax}`
                                        : result.referencerange || '-'}
                                    </td>
                                    <td className="py-2 px-3">
                                      {result.iscritical ? (
                                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                                      ) : result.isabormal ? (
                                        <Badge variant="default" className="text-xs bg-orange-500">Abnormal</Badge>
                                      ) : result.flag === 'normal' ? (
                                        <Badge variant="default" className="text-xs bg-green-600">Normal</Badge>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {result.status || 'entered'}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex gap-1 justify-center">
                                        <Button 
                                          variant="default" 
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              console.log('Releasing test result:', result.resultid);
                                              const response = await fetch(`/api/d/${workspaceid}/test-results/${result.resultid}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  status: 'released',
                                                }),
                                              });
                                              const data = await response.json();
                                              console.log('Release response:', data);
                                              if (response.ok) {
                                                await refetch();
                                                console.log('Data refetched successfully');
                                              } else {
                                                console.error('Failed to release:', data);
                                                alert('Failed to release result: ' + (data.error || 'Unknown error'));
                                              }
                                            } catch (error) {
                                              console.error('Release error:', error);
                                              alert('Failed to release result');
                                            }
                                          }}
                                          className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-auto"
                                        >
                                          Release
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          size="sm"
                                          onClick={async () => {
                                            if (!confirm('Are you sure you want to reject this test result?')) return;
                                            try {
                                              console.log('Rejecting test result:', result.resultid);
                                              const response = await fetch(`/api/d/${workspaceid}/test-results/${result.resultid}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  status: 'rejected',
                                                }),
                                              });
                                              const data = await response.json();
                                              console.log('Reject response:', data);
                                              if (response.ok) {
                                                await refetch();
                                                console.log('Data refetched successfully');
                                              } else {
                                                console.error('Failed to reject:', data);
                                                alert('Failed to reject result: ' + (data.error || 'Unknown error'));
                                              }
                                            } catch (error) {
                                              console.error('Reject error:', error);
                                              alert('Failed to reject result');
                                            }
                                          }}
                                          className="text-xs px-2 py-1 h-auto"
                                        >
                                          Reject
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              console.log('Requesting rerun for test result:', result.resultid);
                                              const response = await fetch(`/api/d/${workspaceid}/test-results/${result.resultid}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  status: 'rerun_requested',
                                                }),
                                              });
                                              const data = await response.json();
                                              console.log('Rerun response:', data);
                                              if (response.ok) {
                                                await refetch();
                                                console.log('Data refetched successfully');
                                              } else {
                                                console.error('Failed to request rerun:', data);
                                                alert('Failed to request rerun: ' + (data.error || 'Unknown error'));
                                              }
                                            } catch (error) {
                                              console.error('Rerun error:', error);
                                              alert('Failed to request rerun');
                                            }
                                          }}
                                          className="text-xs px-2 py-1 h-auto"
                                        >
                                          Rerun
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

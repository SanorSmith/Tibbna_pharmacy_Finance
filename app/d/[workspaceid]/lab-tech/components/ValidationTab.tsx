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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Filter, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

interface ValidationWorklistItem {
  sample: {
    sampleid: string;
    patientid: string;
    orderid: string;
    sampletype: string;
    collectiondate: string;
    analyzer: string | null;
    testgroup: string;
    priority: string;
  };
  validationState: {
    currentstate: string;
    validateddate: string | null;
  } | null;
  hasCritical: boolean;
  hasAbnormal: boolean;
  criticalCount: number;
  abnormalCount: number;
}

export default function ValidationTab({ workspaceid }: { workspaceid: string }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<string>("all");
  const [selectedTestGroup, setSelectedTestGroup] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

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
      const response = await fetch(`/api/lims/worklist?${buildQueryParams()}`);
      if (!response.ok) throw new Error("Failed to fetch worklist");
      return response.json();
    },
  });

  const samples: ValidationWorklistItem[] = data?.samples || [];

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
          <Badge variant="default" className="flex items-center gap-1 bg-blue-500">
            <CheckCircle2 className="h-3 w-3" />
            Tech Validated
          </Badge>
        );
      case "CLINICALLY_VALIDATED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Validated
          </Badge>
        );
      case "RERUN_REQUESTED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-orange-500">
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
      case "RELEASED":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Released
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
    }
    return null;
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
                  <TableHead className="font-semibold">Sample ID</TableHead>
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Collection Date</TableHead>
                  <TableHead className="font-semibold">Test Group</TableHead>
                  <TableHead className="font-semibold">Analyzer</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Flags</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map((item) => (
                  <TableRow
                    key={item.sample.sampleid}
                    className={`hover:bg-gray-50 ${
                      item.hasCritical ? "bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="font-medium text-blue-600">
                      {item.sample.sampleid.substring(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.sample.orderid}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(item.sample.collectiondate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.sample.testgroup}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {item.sample.analyzer || "N/A"}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(item.sample.priority)}
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
                    <TableCell className="text-center">
                      <Link href={`/d/${workspaceid}/lab-tech/validation/${item.sample.sampleid}`}>
                        <Button variant="default" size="sm">
                          Validate
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

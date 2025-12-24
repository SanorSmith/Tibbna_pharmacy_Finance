/**
 * Operations List Client Component
 * - Display operations in table format
 * - Filter by status
 * - Show details popup
 */
"use client";
import { useState } from "react";
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
import { Scissors, Calendar, User, AlertCircle, Home } from "lucide-react";
import Link from "next/link";

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  scheduleddate: string;
  estimatedduration: string | null;
  operationtype: "emergency" | "elective" | "urgent";
  status:
    | "scheduled"
    | "in_preparation"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "postponed";
  preoperativeassessment: string | null;
  operationname: string;
  operationdetails: string | null;
  anesthesiatype: string | null;
  theater: string | null;
  operationdiagnosis: string | null;
  actualstarttime: string | null;
  actualendtime: string | null;
  outcomes: string | null;
  complications: string | null;
  comment: string | null;
  source?: "openehr" | "database";
  patient?: {
    firstname: string;
    middlename?: string | null;
    lastname: string;
    nationalid?: string | null;
  };
};

type Props = {
  workspaceid: string;
  userid: string;
};

export default function OperationsList({ workspaceid, userid }: Props) {
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(
    null
  );
  const [filter, setFilter] = useState<
    "all" | "scheduled" | "in_progress" | "completed" | "cancelled"
  >("all");

  const { data: operations = [], isLoading: loading } = useQuery({
    queryKey: ["operations", workspaceid, userid],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/operations?surgeonid=${userid}`
      );
      if (res.ok) {
        const data = await res.json();
        return (data.operations as Operation[]) || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when clicking around
  });

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "Unknown", time: "Unknown" };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_preparation":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "postponed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "emergency":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "elective":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOperations = operations.filter((op) => {
    if (filter === "all") return true;
    return op.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Link href={`/d/${workspaceid}/doctor`}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Doctor Dashboard"
             className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-xl font-semibold"> Operations</h1>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground">
            {filteredOperations.length} operation
            {filteredOperations.length !== 1 ? "s" : ""}{" "}
            {filter !== "all" && `(${operations.length} total)`}
          </p>
        </div>
      </div>
  
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "all"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => setFilter("all")}
          variant="ghost"
        >
          All
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "scheduled"
              ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => setFilter("scheduled")}
          variant="ghost"
        >
          Scheduled
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "in_progress"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => setFilter("in_progress")}
          variant="ghost"
        >
          In Progress
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "completed"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => setFilter("completed")}
          variant="ghost"
        >
          Completed
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "cancelled"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => setFilter("cancelled")}
          variant="ghost"
        >
          Cancelled
        </Button>
      </div>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {/* Skeleton loader - shows table structure while loading */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Patient</th>
                      <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                      <th className="text-left py-3 px-4 font-medium">Operation</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Theater</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b animate-pulse">
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-28"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Loading operations from OpenEHR...
              </p>
            </div>
          ) : filteredOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operations found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 font-medium">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Operation
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Theater</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((op) => {
                    const { date, time } = formatDateTime(op.scheduleddate);
                    const patientName = op.patient
                      ? `${op.patient.firstname} ${
                          op.patient.middlename
                            ? op.patient.middlename + " "
                            : ""
                        }${op.patient.lastname}`
                      : "Unknown Patient";

                    return (
                      <tr
                        key={op.operationid}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{patientName}</div>
                          {op.patient?.nationalid && (
                            <div className="text-xs text-muted-foreground">
                              ID: {op.patient.nationalid}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>{date}</div>
                          <div className="text-muted-foreground">{time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{op.operationname}</div>
                            {op.source === "openehr" && (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                OpenEHR
                              </span>
                            )}
                          </div>
                          {op.estimatedduration && (
                            <div className="text-xs text-muted-foreground">
                              {op.estimatedduration} min
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                              op.operationtype
                            )}`}
                          >
                            {op.operationtype}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {op.theater || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              op.status
                            )}`}
                          >
                            {op.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOperation(op)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operation Details Dialog */}
      <Dialog
        open={!!selectedOperation}
        onOpenChange={() => setSelectedOperation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Operation Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the surgical procedure
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedOperation.patient
                      ? `${selectedOperation.patient.firstname} ${
                          selectedOperation.patient.middlename
                            ? selectedOperation.patient.middlename + " "
                            : ""
                        }${selectedOperation.patient.lastname}`
                      : "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span>{" "}
                    {selectedOperation.patient?.nationalid || "N/A"}
                  </div>
                </div>
              </div>

              {/* Operation Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Operation Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Operation Name:</span>{" "}
                    {selectedOperation.operationname}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                        selectedOperation.operationtype
                      )}`}
                    >
                      {selectedOperation.operationtype}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        selectedOperation.status
                      )}`}
                    >
                      {selectedOperation.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Theater:</span>{" "}
                    {selectedOperation.theater || "Not assigned"}
                  </div>
                  <div>
                    <span className="font-medium">Anesthesia Type:</span>{" "}
                    {selectedOperation.anesthesiatype || "Not specified"}
                  </div>
                  <div>
                    <span className="font-medium">Estimated Duration:</span>{" "}
                    {selectedOperation.estimatedduration
                      ? `${selectedOperation.estimatedduration} minutes`
                      : "Not specified"}
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Scheduled Date:</span>{" "}
                    {formatDateTime(selectedOperation.scheduleddate).date}
                  </div>
                  <div>
                    <span className="font-medium">Scheduled Time:</span>{" "}
                    {formatDateTime(selectedOperation.scheduleddate).time}
                  </div>
                  {selectedOperation.actualstarttime && (
                    <div>
                      <span className="font-medium">Actual Start:</span>{" "}
                      {formatDateTime(selectedOperation.actualstarttime).date}{" "}
                      {formatDateTime(selectedOperation.actualstarttime).time}
                    </div>
                  )}
                  {selectedOperation.actualendtime && (
                    <div>
                      <span className="font-medium">Actual End:</span>{" "}
                      {formatDateTime(selectedOperation.actualendtime).date}{" "}
                      {formatDateTime(selectedOperation.actualendtime).time}
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Medical Information
                </h3>
                <div className="space-y-3 text-sm">
                  {selectedOperation.operationdiagnosis && (
                    <div>
                      <span className="font-medium">Diagnosis:</span>
                      <p className="mt-1">
                        {selectedOperation.operationdiagnosis}
                      </p>
                    </div>
                  )}
                  {selectedOperation.preoperativeassessment && (
                    <div>
                      <span className="font-medium">
                        Pre-operative Assessment:
                      </span>
                      <p className="mt-1">
                        {selectedOperation.preoperativeassessment}
                      </p>
                    </div>
                  )}
                  {selectedOperation.operationdetails && (
                    <div>
                      <span className="font-medium">Operation Details:</span>
                      <p className="mt-1">
                        {selectedOperation.operationdetails}
                      </p>
                    </div>
                  )}
                  {selectedOperation.outcomes && (
                    <div>
                      <span className="font-medium">Outcomes:</span>
                      <p className="mt-1">{selectedOperation.outcomes}</p>
                    </div>
                  )}
                  {selectedOperation.complications && (
                    <div>
                      <span className="font-medium">Complications:</span>
                      <p className="mt-1">{selectedOperation.complications}</p>
                    </div>
                  )}
                  {selectedOperation.comment && (
                    <div>
                      <span className="font-medium">Comments:</span>
                      <p className="mt-1">{selectedOperation.comment}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedOperation.patient && (
                  <Link
                    href={`/d/${workspaceid}/patients/${selectedOperation.patientid}`}
                  >
                    <Button size="sm">View Patient</Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedOperation(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

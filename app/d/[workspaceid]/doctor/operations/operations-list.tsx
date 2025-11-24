/**
 * Operations List Client Component
 * - Display operations in table format
 * - Filter by status
 * - Show details popup
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, ArrowLeft, Calendar, User, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  scheduleddate: string;
  estimatedduration: string | null;
  operationtype: "emergency" | "elective" | "urgent";
  status: "scheduled" | "in_preparation" | "in_progress" | "completed" | "cancelled" | "postponed";
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
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [filter, setFilter] = useState<"all" | "scheduled" | "in_progress" | "completed" | "cancelled">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    patientid: "",
    operationname: "",
    scheduleddate: "",
    estimatedduration: "",
    operationtype: "elective" as "emergency" | "elective" | "urgent",
    theater: "",
    anesthesiatype: "",
    operationdiagnosis: "",
    preoperativeassessment: "",
    operationdetails: "",
  });

  const loadOperations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/d/${workspaceid}/operations?surgeonid=${userid}`);
      if (res.ok) {
        const data = await res.json();
        setOperations(data.operations || []);
      }
    } catch (error) {
      console.error("Failed to load operations:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, userid]);

  useEffect(() => {
    loadOperations();
  }, [workspaceid, userid, loadOperations]);

  const handleAddOperation = async () => {
    if (!formData.patientid || !formData.operationname || !formData.scheduleddate) {
      alert("Please fill in required fields: Patient ID, Operation Name, and Scheduled Date");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/d/${workspaceid}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          surgeonid: userid,
          workspaceid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create operation");
      }

      setShowAddDialog(false);
      setFormData({
        patientid: "",
        operationname: "",
        scheduleddate: "",
        estimatedduration: "",
        operationtype: "elective",
        theater: "",
        anesthesiatype: "",
        operationdiagnosis: "",
        preoperativeassessment: "",
        operationdetails: "",
      });
      
      loadOperations(); // Reload operations list
    } catch (error) {
      console.error("Error creating operation:", error);
      alert("Failed to create operation");
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    <div className="space-y-4 mr-4 ml-4">
      {/* Back Button */}
      <div>
        <Link href={`/d/${workspaceid}/doctor`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">My Operations</h1>
          <p className="text-muted-foreground">
            {filteredOperations.length} operation{filteredOperations.length !== 1 ? "s" : ""}{" "}
            {filter !== "all" && `(${operations.length} total)`}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Operation
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "scheduled" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("scheduled")}
        >
          Scheduled
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("in_progress")}
        >
          In Progress
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
        <Button
          variant={filter === "cancelled" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("cancelled")}
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
            <p className="text-sm text-muted-foreground">
              Loading operations...
            </p>
          ) : filteredOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No operations found
            </p>
          ) : (
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
                  {filteredOperations.map((op) => {
                    const { date, time } = formatDateTime(op.scheduleddate);
                    const patientName = op.patient
                      ? `${op.patient.firstname} ${op.patient.middlename ? op.patient.middlename + " " : ""}${op.patient.lastname}`
                      : "Unknown Patient";

                    return (
                      <tr key={op.operationid} className="border-b hover:bg-muted/50">
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
                          <div className="font-medium">{op.operationname}</div>
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
      <Dialog open={!!selectedOperation} onOpenChange={() => setSelectedOperation(null)}>
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
                      ? `${selectedOperation.patient.firstname} ${selectedOperation.patient.middlename ? selectedOperation.patient.middlename + " " : ""}${selectedOperation.patient.lastname}`
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
                      <p className="mt-1">{selectedOperation.operationdiagnosis}</p>
                    </div>
                  )}
                  {selectedOperation.preoperativeassessment && (
                    <div>
                      <span className="font-medium">Pre-operative Assessment:</span>
                      <p className="mt-1">{selectedOperation.preoperativeassessment}</p>
                    </div>
                  )}
                  {selectedOperation.operationdetails && (
                    <div>
                      <span className="font-medium">Operation Details:</span>
                      <p className="mt-1">{selectedOperation.operationdetails}</p>
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
                  <Link href={`/d/${workspaceid}/patients/${selectedOperation.patientid}`}>
                    <Button size="sm">View Patient</Button>
                  </Link>
                )}
                <Button variant="outline" onClick={() => setSelectedOperation(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Operation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Book New Operation
            </DialogTitle>
            <DialogDescription>
              Schedule a new surgical procedure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientid">Patient ID *</Label>
                <Input
                  id="patientid"
                  placeholder="Enter patient ID"
                  value={formData.patientid}
                  onChange={(e) => setFormData({ ...formData, patientid: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operationname">Operation Name *</Label>
                <Input
                  id="operationname"
                  placeholder="e.g., Appendectomy"
                  value={formData.operationname}
                  onChange={(e) => setFormData({ ...formData, operationname: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleddate">Scheduled Date & Time *</Label>
                <Input
                  id="scheduleddate"
                  type="datetime-local"
                  value={formData.scheduleddate}
                  onChange={(e) => setFormData({ ...formData, scheduleddate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedduration">Estimated Duration (minutes)</Label>
                <Input
                  id="estimatedduration"
                  type="number"
                  placeholder="e.g., 120"
                  value={formData.estimatedduration}
                  onChange={(e) => setFormData({ ...formData, estimatedduration: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operationtype">Operation Type</Label>
                <Select
                  value={formData.operationtype}
                  onValueChange={(value: "emergency" | "elective" | "urgent") =>
                    setFormData({ ...formData, operationtype: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theater">Theater</Label>
                <Input
                  id="theater"
                  placeholder="e.g., Theater 1"
                  value={formData.theater}
                  onChange={(e) => setFormData({ ...formData, theater: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anesthesiatype">Anesthesia Type</Label>
              <Input
                id="anesthesiatype"
                placeholder="e.g., General, Local, Spinal"
                value={formData.anesthesiatype}
                onChange={(e) => setFormData({ ...formData, anesthesiatype: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationdiagnosis">Diagnosis</Label>
              <Textarea
                id="operationdiagnosis"
                placeholder="Enter diagnosis..."
                rows={2}
                value={formData.operationdiagnosis}
                onChange={(e) => setFormData({ ...formData, operationdiagnosis: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preoperativeassessment">Pre-operative Assessment</Label>
              <Textarea
                id="preoperativeassessment"
                placeholder="Enter pre-operative assessment..."
                rows={3}
                value={formData.preoperativeassessment}
                onChange={(e) => setFormData({ ...formData, preoperativeassessment: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operationdetails">Operation Details</Label>
              <Textarea
                id="operationdetails"
                placeholder="Enter operation details..."
                rows={3}
                value={formData.operationdetails}
                onChange={(e) => setFormData({ ...formData, operationdetails: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddOperation} disabled={saving}>
              {saving ? "Booking..." : "Book Operation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

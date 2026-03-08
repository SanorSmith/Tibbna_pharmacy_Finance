/**
 * Operations List Component
 * - Display all operative procedures
 * - Book new operations
 * - Update operation status and details
 */
"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, Plus, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
};

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  in_preparation: { label: "In Preparation", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
  postponed: { label: "Postponed", color: "bg-gray-100 text-gray-800" },
};

const typeConfig = {
  emergency: { label: "Emergency", color: "bg-red-500 text-white" },
  elective: { label: "Elective", color: "bg-blue-500 text-white" },
  urgent: { label: "Urgent", color: "bg-orange-500 text-white" },
};

export default function OperationsList({
  workspaceid,
  userId,
}: {
  workspaceid: string;
  userId: string;
}) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const hasFetched = useRef(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [operationName, setOperationName] = useState("");
  const [operationType, setOperationType] = useState<"emergency" | "elective" | "urgent">("elective");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [theater, setTheater] = useState("");
  const [anesthesiaType, setAnesthesiaType] = useState("");
  const [preoperativeAssessment, setPreoperativeAssessment] = useState("");
  const [operationDetails, setOperationDetails] = useState("");
  const [operationDiagnosis, setOperationDiagnosis] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (hasFetched.current) return;

    async function fetchData() {
      try {
        hasFetched.current = true;

        const [opsRes, patientsRes] = await Promise.all([
          fetch(`/api/d/${workspaceid}/operations`, { cache: "no-store" }),
          fetch(`/api/d/${workspaceid}/patients`, { cache: "no-store" }),
        ]);

        if (opsRes.ok) {
          const opsData = await opsRes.json();
          setOperations(opsData.operations || []);
        }

        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.patients || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        hasFetched.current = false;
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceid]);

  const resetForm = () => {
    setSelectedPatient("");
    setScheduledDate("");
    setOperationName("");
    setOperationType("elective");
    setEstimatedDuration("");
    setTheater("");
    setAnesthesiaType("");
    setPreoperativeAssessment("");
    setOperationDetails("");
    setOperationDiagnosis("");
    setComment("");
  };

  const handleBookOperation = async () => {
    if (!selectedPatient || !scheduledDate || !operationName) {
      alert("Please fill in required fields: Patient, Date, and Operation Name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientid: selectedPatient,
          surgeonid: userId,
          scheduleddate: scheduledDate,
          operationname: operationName,
          operationtype: operationType,
          estimatedduration: estimatedDuration || null,
          theater: theater || null,
          anesthesiatype: anesthesiaType || null,
          preoperativeassessment: preoperativeAssessment || null,
          operationdetails: operationDetails || null,
          operationdiagnosis: operationDiagnosis || null,
          comment: comment || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to book operation");

      const data = await res.json();
      setOperations([data.operation, ...operations]);
      setBookingOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error booking operation:", error);
      alert("Failed to book operation");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading operations...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with Book Operation button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scheduled Operations</h2>
          <p className="text-sm text-muted-foreground">{operations.length} total operations</p>
        </div>
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Book Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book New Operation</DialogTitle>
              <DialogDescription>Schedule a new operative procedure for a patient</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.patientid} value={p.patientid}>
                        {p.firstname} {p.middlename || ""} {p.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduleddate">Scheduled Date & Time *</Label>
                <Input
                  id="scheduleddate"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              {/* Operation Name */}
              <div className="space-y-2">
                <Label htmlFor="operationname">Operation Name *</Label>
                <Input
                  id="operationname"
                  placeholder="e.g., Appendectomy, Knee Replacement"
                  value={operationName}
                  onChange={(e) => setOperationName(e.target.value)}
                />
              </div>

              {/* Operation Type */}
              <div className="space-y-2">
                <Label htmlFor="operationtype">Operation Type</Label>
                <Select value={operationType} onValueChange={(v) => setOperationType(v as "emergency" | "elective" | "urgent")}>
                  <SelectTrigger id="operationtype">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 2 hours, 90 minutes"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>

              {/* Theater */}
              <div className="space-y-2">
                <Label htmlFor="theater">Operating Theater</Label>
                <Input
                  id="theater"
                  placeholder="e.g., OT-1, Theater A"
                  value={theater}
                  onChange={(e) => setTheater(e.target.value)}
                />
              </div>

              {/* Anesthesia Type */}
              <div className="space-y-2">
                <Label htmlFor="anesthesia">Anesthesia Type</Label>
                <Select value={anesthesiaType} onValueChange={setAnesthesiaType}>
                  <SelectTrigger id="anesthesia">
                    <SelectValue placeholder="Select anesthesia type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="Spinal">Spinal</SelectItem>
                    <SelectItem value="Epidural">Epidural</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pre-operative Assessment */}
              <div className="space-y-2">
                <Label htmlFor="assessment">Pre-operative Assessment</Label>
                <Textarea
                  id="assessment"
                  placeholder="Patient assessment before surgery"
                  value={preoperativeAssessment}
                  onChange={(e) => setPreoperativeAssessment(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Operation Details */}
              <div className="space-y-2">
                <Label htmlFor="details">Operation Details</Label>
                <Textarea
                  id="details"
                  placeholder="Detailed description of the procedure"
                  value={operationDetails}
                  onChange={(e) => setOperationDetails(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Operation Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Operation Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  placeholder="Diagnosis related to the operation"
                  value={operationDiagnosis}
                  onChange={(e) => setOperationDiagnosis(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">Additional Comments</Label>
                <Textarea
                  id="comment"
                  placeholder="Any additional notes"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setBookingOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBookOperation} disabled={creating}>
                  {creating ? "Booking..." : "Book Operation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dummy Operative Procedures */}
      <div className="grid gap-4">
        {/* Dummy Procedure 1 - Emergency Appendectomy */}
        <Card className="border-l-4 border-l-red-500 bg-red-50/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Emergency Appendectomy
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Sarah Johnson (MRN-2024-001)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-red-500 text-white">Emergency</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">In Preparation</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(), "PPP")} - 14:00</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>60-90 minutes</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Theater:</span> OR-3
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Anesthesia:</span> General
              </div>
            </div>

            <div className="text-sm">
              <span className="font-medium">Diagnosis:</span> Acute appendicitis with peritonitis
            </div>

            <div className="text-sm">
              <span className="font-medium">Assessment:</span> Patient presented with RLQ pain, fever (38.5°C), elevated WBC (15,000). CT scan confirms inflamed appendix with fluid collection.
            </div>

            <div className="text-sm">
              <span className="font-medium">Details:</span> Laparoscopic appendectomy via 3-port technique. Prophylactic antibiotics administered.
            </div>

            <div className="mt-3 p-3 bg-white rounded border">
              <div className="text-xs font-semibold text-gray-700 mb-2">Pre-op Checklist:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Consent Signed</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ NPO 8hrs</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Labs Complete</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ IV Access</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">⏳ Pending: Anesthesia Review</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dummy Procedure 2 - Total Knee Replacement */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Total Knee Replacement
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Robert Martinez (MRN-2024-002)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-blue-500 text-white">Elective</Badge>
                <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(Date.now() + 86400000), "PPP")} - 08:00</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>120-150 minutes</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Theater:</span> OR-1 (Orthopedic Suite)
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Anesthesia:</span> Spinal + Sedation
              </div>
            </div>

            <div className="text-sm">
              <span className="font-medium">Diagnosis:</span> Severe osteoarthritis of right knee, Grade IV
            </div>

            <div className="text-sm">
              <span className="font-medium">Assessment:</span> Conservative management failed. Patient reports severe pain (8/10) limiting mobility and ADLs. X-ray shows complete joint space narrowing with bone-on-bone contact.
            </div>

            <div className="text-sm">
              <span className="font-medium">Details:</span> Right total knee arthroplasty using cemented prosthesis. Posterior stabilized design. Tourniquet control planned.
            </div>

            <div className="mt-3 p-3 bg-white rounded border">
              <div className="text-xs font-semibold text-gray-700 mb-2">Pre-op Checklist:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Consent Signed</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Pre-op Assessment</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Blood Typed & Crossmatched</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ ECG Normal</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ Implant Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations List */}
      {operations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Database Operations</h3>
          <div className="grid gap-4">
            {operations.map((op) => {
            const patient = patients.find((p) => p.patientid === op.patientid);
            const patientName = patient
              ? `${patient.firstname} ${patient.middlename || ""} ${patient.lastname}`.trim()
              : "Unknown Patient";

            return (
              <Card key={op.operationid}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Scissors className="h-5 w-5" />
                        {op.operationname}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {patientName}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={typeConfig[op.operationtype].color}>
                        {typeConfig[op.operationtype].label}
                      </Badge>
                      <Badge className={statusConfig[op.status].color}>
                        {statusConfig[op.status].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(op.scheduleddate), "PPP p")}</span>
                    </div>
                    {op.estimatedduration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{op.estimatedduration}</span>
                      </div>
                    )}
                    {op.theater && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Theater:</span> {op.theater}
                      </div>
                    )}
                    {op.anesthesiatype && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Anesthesia:</span> {op.anesthesiatype}
                      </div>
                    )}
                  </div>

                  {op.operationdiagnosis && (
                    <div className="text-sm">
                      <span className="font-medium">Diagnosis:</span> {op.operationdiagnosis}
                    </div>
                  )}

                  {op.preoperativeassessment && (
                    <div className="text-sm">
                      <span className="font-medium">Assessment:</span> {op.preoperativeassessment}
                    </div>
                  )}

                  {op.operationdetails && (
                    <div className="text-sm">
                      <span className="font-medium">Details:</span> {op.operationdetails}
                    </div>
                  )}

                  {op.outcomes && (
                    <div className="text-sm">
                      <span className="font-medium">Outcomes:</span> {op.outcomes}
                    </div>
                  )}

                  {op.complications && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Complications:</span> {op.complications}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

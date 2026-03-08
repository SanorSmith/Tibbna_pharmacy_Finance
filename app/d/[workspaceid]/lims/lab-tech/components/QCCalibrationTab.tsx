"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";

type EquipmentItem = {
  equipmentid: string;
  model: string;
  equipmentidcode: string;
  category: string;
  status: string;
};

type QcRun = {
  qcid: string;
  qctype: "QC" | "CALIBRATION";
  equipmentid: string | null;
  equipmentname: string | null;
  qclevel: string | null;
  lotnumber: string | null;
  analyte: string | null;
  resultvalue: string | null;
  unit: string | null;
  expectedmin: string | null;
  expectedmax: string | null;
  pass: boolean;
  notes: string | null;
  runat: string;
  performedbyname: string | null;
};

export default function QCCalibrationTab({ workspaceid }: { workspaceid: string }) {
  const queryClient = useQueryClient();
  const [alert, setAlert] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const [form, setForm] = useState({
    qctype: "QC" as "QC" | "CALIBRATION",
    equipmentid: "",
    qclevel: "L1",
    lotnumber: "",
    analyte: "",
    resultvalue: "",
    unit: "",
    expectedmin: "",
    expectedmax: "",
    notes: "",
  });

  const { data: equipmentData } = useQuery<{ equipment: EquipmentItem[] }>({
    queryKey: ["equipment", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/equipment?status=active`);
      if (!res.ok) throw new Error("Failed to fetch equipment");
      return res.json();
    },
  });

  const equipment = equipmentData?.equipment || [];

  const selectedEquipment = useMemo(() => {
    return equipment.find((e) => e.equipmentid === form.equipmentid) || null;
  }, [equipment, form.equipmentid]);

  const { data: qcRuns, isLoading: qcLoading } = useQuery<{ runs: QcRun[] }>({
    queryKey: ["qc-runs", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/lims/qc?workspaceid=${workspaceid}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch QC runs");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workspaceid,
        qctype: form.qctype,
        equipmentid: form.equipmentid || null,
        equipmentname: selectedEquipment
          ? `${selectedEquipment.model} (${selectedEquipment.equipmentidcode})`
          : null,
        qclevel: form.qctype === "QC" ? form.qclevel : null,
        lotnumber: form.qctype === "QC" ? (form.lotnumber || null) : null,
        analyte: form.analyte || null,
        resultvalue: form.resultvalue ? Number(form.resultvalue) : null,
        unit: form.unit || null,
        expectedmin: form.expectedmin ? Number(form.expectedmin) : null,
        expectedmax: form.expectedmax ? Number(form.expectedmax) : null,
        pass: (() => {
          if (!form.expectedmin || !form.expectedmax || !form.resultvalue) return true;
          const v = Number(form.resultvalue);
          const min = Number(form.expectedmin);
          const max = Number(form.expectedmax);
          return v >= min && v <= max;
        })(),
        notes: form.notes || null,
        runat: new Date().toISOString(),
      };

      const res = await fetch("/api/lims/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save QC run");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-runs", workspaceid] });
      setAlert({
        open: true,
        title: "Saved",
        message: "QC/Calibration entry saved successfully.",
      });
      setForm((prev) => ({
        ...prev,
        lotnumber: "",
        analyte: "",
        resultvalue: "",
        unit: "",
        expectedmin: "",
        expectedmax: "",
        notes: "",
      }));
    },
    onError: (e: Error) => {
      setAlert({
        open: true,
        title: "Error",
        message: e.message,
      });
    },
  });

  const passComputed = useMemo(() => {
    if (!form.expectedmin || !form.expectedmax || !form.resultvalue) return null;
    const v = Number(form.resultvalue);
    const min = Number(form.expectedmin);
    const max = Number(form.expectedmax);
    if (Number.isNaN(v) || Number.isNaN(min) || Number.isNaN(max)) return null;
    return v >= min && v <= max;
  }, [form.expectedmin, form.expectedmax, form.resultvalue]);

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">QC &amp; Calibration</h2>
          <p className="text-xs text-muted-foreground">
            Record analyzer QC checks and calibration events before daily routine.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            New Entry
          </CardTitle>
          <CardDescription>
            Select the instrument and enter QC/calibration results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={form.qctype}
                onValueChange={(v) => setForm((p) => ({ ...p, qctype: v as any }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="CALIBRATION">Calibration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Analyzer / Instrument</Label>
              <Select
                value={form.equipmentid}
                onValueChange={(v) => setForm((p) => ({ ...p, equipmentid: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    .filter((e) => e.status === "active")
                    .map((e) => (
                      <SelectItem key={e.equipmentid} value={e.equipmentid}>
                        {e.model} ({e.equipmentidcode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {form.qctype === "QC" && (
              <>
                <div>
                  <Label>QC Level</Label>
                  <Select
                    value={form.qclevel}
                    onValueChange={(v) => setForm((p) => ({ ...p, qclevel: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L1">L1</SelectItem>
                      <SelectItem value="L2">L2</SelectItem>
                      <SelectItem value="L3">L3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Lot Number</Label>
                  <Input
                    className="mt-1"
                    value={form.lotnumber}
                    onChange={(e) => setForm((p) => ({ ...p, lotnumber: e.target.value }))}
                    placeholder="e.g., LOT-2026-01"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Analyte / Control</Label>
              <Input
                className="mt-1"
                value={form.analyte}
                onChange={(e) => setForm((p) => ({ ...p, analyte: e.target.value }))}
                placeholder="e.g., Glucose"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Result</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.resultvalue}
                  onChange={(e) => setForm((p) => ({ ...p, resultvalue: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  className="mt-1"
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g., mmol/L"
                />
              </div>
              <div className="flex items-end">
                {passComputed === null ? (
                  <Badge variant="outline" className="w-full justify-center">
                    No range
                  </Badge>
                ) : passComputed ? (
                  <Badge className="bg-green-600 text-white w-full justify-center">
                    PASS
                  </Badge>
                ) : (
                  <Badge className="bg-red-600 text-white w-full justify-center">
                    FAIL
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Expected Min</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.expectedmin}
                  onChange={(e) => setForm((p) => ({ ...p, expectedmin: e.target.value }))}
                />
              </div>
              <div>
                <Label>Expected Max</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.expectedmax}
                  onChange={(e) => setForm((p) => ({ ...p, expectedmax: e.target.value }))}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Optional notes (e.g., corrective action taken)"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                className="bg-[#4E95D9] hover:bg-[#3d7ab8] text-white"
                onClick={() => createMutation.mutate()}
                disabled={!form.equipmentid || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Entry
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent QC/Calibration</CardTitle>
          <CardDescription>Latest 50 entries</CardDescription>
        </CardHeader>
        <CardContent>
          {qcLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Analyte</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(qcRuns?.runs || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        No QC runs logged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (qcRuns?.runs || []).map((r) => (
                      <TableRow key={r.qcid} className={r.pass ? "" : "bg-red-50"}>
                        <TableCell className="text-sm">
                          {new Date(r.runat).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.qctype}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.equipmentname || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{r.qclevel || "-"}</TableCell>
                        <TableCell className="text-sm">{r.analyte || "-"}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {r.resultvalue ? `${r.resultvalue}${r.unit ? ` ${r.unit}` : ""}` : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.expectedmin && r.expectedmax ? `${r.expectedmin} - ${r.expectedmax}` : "-"}
                        </TableCell>
                        <TableCell>
                          {r.pass ? (
                            <Badge className="bg-green-600 text-white">PASS</Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white">FAIL</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.performedbyname || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={alert.open} onOpenChange={(open) => setAlert((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={alert.title === "Error" ? "text-red-600" : ""}>
              {alert.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setAlert({ open: false, title: "", message: "" })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  workspaceid: string;
}

export default function ShiftsReportPage({ workspaceid }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId: workspaceid,
        startDate,
        endDate,
      });
      const res = await fetch(`/api/pos/reports/shift-summary?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data?.shifts) return;
    const ws = XLSX.utils.json_to_sheet(
      data.shifts.map((s: any) => ({
        "Shift #": s.shiftNumber,
        Cashier: s.cashier,
        Status: s.status,
        "Opening Time": new Date(s.openingTime).toLocaleString(),
        "Closing Time": s.closingTime
          ? new Date(s.closingTime).toLocaleString()
          : "—",
        "Opening Cash": s.openingCash,
        "Expected Cash": s.expectedCash,
        "Actual Cash": s.actualCash,
        Variance: s.variance,
        Transactions: s.transactions,
        "Revenue (IQD)": s.revenue,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shifts");
    XLSX.writeFile(wb, `shifts-report-${startDate}-${endDate}.xlsx`);
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/d/${workspaceid}/pos/reports`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Shift Reports
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading...
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Shifts
                </p>
                <p className="text-2xl font-bold">{data.summary.totalShifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Closed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {data.summary.closedShifts}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Open
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.summary.openShifts}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Variance
                </p>
                <p
                  className={`text-2xl font-bold ${
                    data.summary.totalVariance < 0
                      ? "text-red-600"
                      : data.summary.totalVariance > 0
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  {data.summary.totalVariance.toLocaleString()} IQD
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                Shift History ({data.shifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift #</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.shifts.map((s: any) => (
                    <TableRow key={s.shiftId}>
                      <TableCell className="font-mono text-sm">
                        {s.shiftNumber}
                      </TableCell>
                      <TableCell>{s.cashier}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "CLOSED" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(s.openingTime).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.closingTime
                          ? new Date(s.closingTime).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {s.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.transactions}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          s.variance < 0
                            ? "text-red-600"
                            : s.variance > 0
                            ? "text-amber-600"
                            : ""
                        }`}
                      >
                        {s.variance !== 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {s.variance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />0
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

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
import { ArrowLeft, RotateCcw, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  workspaceid: string;
}

export default function ReturnsReportPage({ workspaceid }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
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
      const res = await fetch(`/api/pos/reports/returns?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data?.returns) return;
    const ws = XLSX.utils.json_to_sheet(
      data.returns.map((r: any) => ({
        "Return #": r.returnNumber,
        "Original Sale": r.originalSaleNumber,
        Date: new Date(r.returnDate).toLocaleDateString(),
        Customer: r.customer,
        Reason: r.reason,
        "Return Amount": r.totalReturnAmount,
        "Restocking Fee": r.restockingFee,
        "Refund Amount": r.refundAmount,
        "Refund Method": r.refundMethod,
        Status: r.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Returns");
    XLSX.writeFile(wb, `returns-report-${startDate}-${endDate}.xlsx`);
  };

  const reasonChartData = data?.byReason
    ? {
        labels: Object.keys(data.byReason),
        datasets: [
          {
            data: Object.values(data.byReason).map((v: any) => v.count),
            backgroundColor: [
              "#ef4444",
              "#f97316",
              "#eab308",
              "#22c55e",
              "#3b82f6",
              "#8b5cf6",
              "#ec4899",
              "#6b7280",
            ],
          },
        ],
      }
    : null;

  const dailyChartData = data?.dailyTrend
    ? {
        labels: data.dailyTrend.map((d: any) => d.date),
        datasets: [
          {
            label: "Refund Amount (IQD)",
            data: data.dailyTrend.map((d: any) => d.amount),
            backgroundColor: "rgba(239, 68, 68, 0.5)",
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 1,
          },
        ],
      }
    : null;

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
            <RotateCcw className="h-6 w-6" />
            Returns Analysis
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
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-red-600">
                  Total Returns
                </p>
                <p className="text-2xl font-bold text-red-700">
                  {data.summary.totalReturns}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-orange-600">
                  Total Refunds
                </p>
                <p className="text-2xl font-bold text-orange-700">
                  {Math.round(data.summary.totalRefundAmount).toLocaleString()}{" "}
                  IQD
                </p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-yellow-600">
                  Restocking Fees
                </p>
                <p className="text-2xl font-bold text-yellow-700">
                  {Math.round(
                    data.summary.totalRestockingFees
                  ).toLocaleString()}{" "}
                  IQD
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-green-600">
                  Net Refunds
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {Math.round(data.summary.netRefunds).toLocaleString()} IQD
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reasonChartData && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Returns by Reason</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-64 flex items-center justify-center">
                    <Doughnut
                      data={reasonChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "right" } },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {dailyChartData && dailyChartData.labels.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Daily Refund Trend</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-64">
                    <Bar
                      data={dailyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                All Returns ({data.returns.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Original Sale</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.returns.map((r: any) => (
                    <TableRow key={r.returnNumber}>
                      <TableCell className="font-mono text-sm">
                        {r.returnNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.originalSaleNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.returnDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.round(r.refundAmount).toLocaleString()} IQD
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.refundMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "COMPLETED"
                              ? "default"
                              : r.status === "PENDING_APPROVAL"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
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

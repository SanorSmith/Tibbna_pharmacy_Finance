"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  workspaceid: string;
}

export default function CashiersReportPage({ workspaceid }: Props) {
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
      const res = await fetch(`/api/pos/reports/cashier-performance?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data?.cashiers) return;
    const ws = XLSX.utils.json_to_sheet(
      data.cashiers.map((c: any) => ({
        Cashier: c.cashierName,
        Transactions: c.totalTransactions,
        "Revenue (IQD)": Math.round(c.totalRevenue),
        "Avg Transaction (IQD)": Math.round(c.avgTransaction),
        Shifts: c.totalShifts,
        "Total Variance (IQD)": Math.round(c.totalVariance),
        "Avg Variance (IQD)": Math.round(c.avgVariance),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashiers");
    XLSX.writeFile(wb, `cashier-performance-${startDate}-${endDate}.xlsx`);
  };

  const chartData = data?.cashiers
    ? {
        labels: data.cashiers.map((c: any) => c.cashierName),
        datasets: [
          {
            label: "Revenue (IQD)",
            data: data.cashiers.map((c: any) => c.totalRevenue),
            backgroundColor: "rgba(245, 158, 11, 0.5)",
            borderColor: "rgb(245, 158, 11)",
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
            <Users className="h-6 w-6" />
            Cashier Performance
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
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-amber-600">Cashiers</p>
                <p className="text-2xl font-bold text-amber-700">
                  {data.summary.totalCashiers}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-blue-600">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.summary.totalTransactions}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-green-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {Math.round(data.summary.totalRevenue).toLocaleString()} IQD
                </p>
              </CardContent>
            </Card>
          </div>

          {chartData && chartData.labels.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Revenue by Cashier</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-64">
                  <Bar
                    data={chartData}
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

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                Performance Table ({data.cashiers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Txn</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cashiers.map((c: any) => (
                    <TableRow key={c.cashierId}>
                      <TableCell className="font-medium">
                        {c.cashierName}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.totalTransactions}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.round(c.totalRevenue).toLocaleString()} IQD
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.round(c.avgTransaction).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.totalShifts}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          c.totalVariance < 0
                            ? "text-red-600"
                            : c.totalVariance > 0
                            ? "text-amber-600"
                            : ""
                        }`}
                      >
                        {Math.round(c.totalVariance).toLocaleString()}
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

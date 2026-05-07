"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, DollarSign, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  workspaceid: string;
}

export default function FinancialReportPage({ workspaceid }: Props) {
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
      const res = await fetch(`/api/pos/reports/financial-overview?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data) return;
    const summaryData = [
      { Metric: "Gross Revenue", Value: data.sales.grossRevenue },
      { Metric: "Total Tax", Value: data.sales.totalTax },
      { Metric: "Total Discount", Value: data.sales.totalDiscount },
      { Metric: "Net Sales Revenue", Value: data.sales.netSalesRevenue },
      { Metric: "Total Refunds", Value: data.returns.totalRefunds },
      { Metric: "Restocking Fees", Value: data.returns.totalRestockingFees },
      { Metric: "Net Revenue", Value: data.financial.netRevenue },
      { Metric: "Return Rate %", Value: data.returns.returnRate.toFixed(2) },
      { Metric: "Profit Margin %", Value: data.financial.profitMargin.toFixed(2) },
    ];
    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Overview");

    if (data.dailyTrend?.length > 0) {
      const trendWs = XLSX.utils.json_to_sheet(
        data.dailyTrend.map((d: any) => ({
          Date: d.date,
          "Revenue (IQD)": Math.round(d.revenue),
          Transactions: d.transactions,
        }))
      );
      XLSX.utils.book_append_sheet(wb, trendWs, "Daily Trend");
    }

    XLSX.writeFile(wb, `financial-overview-${startDate}-${endDate}.xlsx`);
  };

  const trendChartData = data?.dailyTrend
    ? {
        labels: data.dailyTrend.map((d: any) => d.date),
        datasets: [
          {
            label: "Revenue (IQD)",
            data: data.dailyTrend.map((d: any) => d.revenue),
            borderColor: "rgb(20, 184, 166)",
            backgroundColor: "rgba(20, 184, 166, 0.1)",
            tension: 0.3,
            fill: true,
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
            <DollarSign className="h-6 w-6" />
            Financial Overview
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
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-teal-600">
                  Gross Revenue
                </p>
                <p className="text-xl font-bold text-teal-700">
                  {Math.round(data.sales.grossRevenue).toLocaleString()}
                </p>
                <p className="text-[10px] text-teal-500">IQD</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-green-600">
                  Net Revenue
                </p>
                <p className="text-xl font-bold text-green-700">
                  {Math.round(data.financial.netRevenue).toLocaleString()}
                </p>
                <p className="text-[10px] text-green-500">IQD</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-red-600">
                  Total Refunds
                </p>
                <p className="text-xl font-bold text-red-700">
                  {Math.round(data.returns.totalRefunds).toLocaleString()}
                </p>
                <p className="text-[10px] text-red-500">IQD</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-purple-600">
                  Profit Margin
                </p>
                <p className="text-xl font-bold text-purple-700">
                  {data.financial.profitMargin.toFixed(1)}%
                </p>
                <p className="text-[10px] text-purple-500">of gross</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend */}
          {trendChartData && trendChartData.labels.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">
                  Daily Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-72">
                  <Line
                    data={trendChartData}
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

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sales */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm text-blue-600">
                  Sales Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Transactions
                  </span>
                  <span className="font-medium">
                    {data.sales.totalTransactions}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Gross Revenue
                  </span>
                  <span className="font-medium">
                    {Math.round(data.sales.grossRevenue).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <span className="font-medium text-amber-600">
                    -{Math.round(data.sales.totalTax).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Discount
                  </span>
                  <span className="font-medium text-amber-600">
                    -{Math.round(data.sales.totalDiscount).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Net Sales</span>
                  <span className="font-bold">
                    {Math.round(data.sales.netSalesRevenue).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Avg Transaction
                  </span>
                  <span className="font-medium">
                    {Math.round(data.sales.avgTransactionValue).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Returns */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm text-red-600">
                  Returns & Refunds
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Returns
                  </span>
                  <span className="font-medium">
                    {data.returns.totalReturns}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Return Rate
                  </span>
                  <span className="font-medium">
                    {data.returns.returnRate.toFixed(1)}%
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Refunds
                  </span>
                  <span className="font-medium text-red-600">
                    {Math.round(data.returns.totalRefunds).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Restocking Fees
                  </span>
                  <span className="font-medium text-green-600">
                    +
                    {Math.round(
                      data.returns.totalRestockingFees
                    ).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Shifts */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm text-purple-600">
                  Shift Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Shifts
                  </span>
                  <span className="font-medium">
                    {data.shifts.totalShifts}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Cash Variance
                  </span>
                  <span
                    className={`font-medium ${
                      data.shifts.totalVariance < 0
                        ? "text-red-600"
                        : data.shifts.totalVariance > 0
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {Math.round(data.shifts.totalVariance).toLocaleString()} IQD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Avg Variance / Shift
                  </span>
                  <span
                    className={`font-medium ${
                      data.shifts.avgVariance < 0
                        ? "text-red-600"
                        : data.shifts.avgVariance > 0
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {Math.round(data.shifts.avgVariance).toLocaleString()} IQD
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

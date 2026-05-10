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
import { ArrowLeft, Package, Download, Loader2 } from "lucide-react";
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

export default function ProductsReportPage({ workspaceid }: Props) {
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
      const res = await fetch(`/api/pos/reports/product-sales?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data?.products) return;
    const ws = XLSX.utils.json_to_sheet(
      data.products.map((p: any, i: number) => ({
        "#": i + 1,
        Product: p.drugName,
        "Qty Sold": p.quantitySold,
        "Revenue (IQD)": Math.round(p.revenue),
        Transactions: p.transactionCount,
        "Avg Price (IQD)": Math.round(p.avgUnitPrice),
        "Revenue Share %": p.revenueShare.toFixed(1),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `product-sales-${startDate}-${endDate}.xlsx`);
  };

  const chartData = data?.products
    ? {
        labels: data.products.slice(0, 10).map((p: any) => p.drugName),
        datasets: [
          {
            label: "Revenue (IQD)",
            data: data.products.slice(0, 10).map((p: any) => p.revenue),
            backgroundColor: "rgba(34, 197, 94, 0.5)",
            borderColor: "rgb(34, 197, 94)",
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
            <Package className="h-6 w-6" />
            Product Performance
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
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-green-600">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {data.summary.totalProducts}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-blue-600">
                  Total Qty Sold
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.summary.totalQuantitySold.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
              <CardContent className="py-4 text-center">
                <p className="text-xs font-medium text-purple-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  {Math.round(data.summary.totalRevenue).toLocaleString()} IQD
                </p>
              </CardContent>
            </Card>
          </div>

          {chartData && chartData.labels.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">
                  Top 10 Products by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-72">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true } },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                All Products ({data.products.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p: any, i: number) => (
                    <TableRow key={p.drugId || i}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.drugName}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.quantitySold}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.round(p.revenue).toLocaleString()} IQD
                      </TableCell>
                      <TableCell className="text-right">
                        {p.transactionCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.round(p.avgUnitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.revenueShare.toFixed(1)}%
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

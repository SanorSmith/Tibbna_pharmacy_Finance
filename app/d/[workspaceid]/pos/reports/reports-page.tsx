"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Calendar,
  Loader2,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  Shield,
  Wallet,
  RotateCcw,
  Users,
  Clock,
  FileSpreadsheet,
  Package,
} from "lucide-react";
import { PharmacyNav } from "../components/PharmacyNav";

type DailyReport = {
  date: string;
  summary: {
    totalSales: number;
    totalSubtotal: number;
    totalTax: number;
    totalDiscount: number;
    transactionCount: number;
  };
  salesByType: { saleType: string; total: number; count: number }[];
  paymentBreakdown: {
    paymentMethod: string;
    total: number;
    count: number;
  }[];
  topDrugs: {
    drugName: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }[];
  hourlyDistribution: { hour: number; total: number; count: number }[];
};

const SALE_TYPE_LABELS: Record<string, string> = {
  DISPENSED_ORDER: "Dispensed Orders",
  NEW_PRESCRIPTION: "New Prescriptions",
  OTC_WALKIN: "OTC / Walk-in",
};

const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  INSURANCE: Shield,
  CREDIT_ACCOUNT: Wallet,
};

export default function ReportsClientPage({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"dashboard" | "daily">("dashboard");

  useEffect(() => {
    if (view === "daily") {
      fetchReport();
    }
  }, [date, view]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pos/reports/daily?date=${date}&workspaceId=${workspaceid}`
      );
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    {
      title: "Daily Sales",
      description: "Transaction details, hourly distribution & top drugs",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      action: () => setView("daily"),
    },
    {
      title: "Shift Reports",
      description: "Cash reconciliation, variance & shift history",
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      action: () => router.push(`/d/${workspaceid}/pos/reports/shifts`),
    },
    {
      title: "Returns Analysis",
      description: "Refunds, reasons & restocking data",
      icon: RotateCcw,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      action: () => router.push(`/d/${workspaceid}/pos/reports/returns`),
    },
    {
      title: "Product Performance",
      description: "Top sellers, revenue per product",
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      action: () => router.push(`/d/${workspaceid}/pos/reports/products`),
    },
    {
      title: "Cashier Performance",
      description: "Sales per cashier, shift accuracy",
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      action: () => router.push(`/d/${workspaceid}/pos/reports/cashiers`),
    },
    {
      title: "Financial Overview",
      description: "Revenue, refunds, net profit, margins",
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
      action: () => router.push(`/d/${workspaceid}/pos/reports/financial`),
    },
  ];

  if (view === "dashboard") {
    return (
      <div className="flex flex-1 flex-col h-full overflow-auto">
        <PharmacyNav workspaceid={workspaceid} activeTab="pos" />
        <div className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  (window.location.href = `/d/${workspaceid}/pos`)
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  POS Reports & Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive sales, returns, and performance reporting
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((report) => (
              <Card
                key={report.title}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={report.action}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${report.bgColor}`}>
                      <report.icon className={`h-5 w-5 ${report.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{report.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto">
      <PharmacyNav workspaceid={workspaceid} activeTab="pos" />
      <div className="p-4 pt-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setView("dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Daily Sales Report
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading report...</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : report ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="shadow-sm bg-purple-100 border-purple-200">
                <CardContent className="py-4 px-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-purple-700 mb-1" />
                  <p className="text-xs font-semibold text-purple-700">
                    Total Sales
                  </p>
                  <p className="text-xl font-bold text-purple-900">
                    {report.summary.totalSales.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-green-100 border-green-200">
                <CardContent className="py-4 px-4 text-center">
                  <ShoppingCart className="h-5 w-5 mx-auto text-green-700 mb-1" />
                  <p className="text-xs font-semibold text-green-700">
                    Transactions
                  </p>
                  <p className="text-xl font-bold text-green-900">
                    {report.summary.transactionCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-blue-100 border-blue-200">
                <CardContent className="py-4 px-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-blue-700 mb-1" />
                  <p className="text-xs font-semibold text-blue-700">
                    Avg. Sale
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {report.summary.transactionCount > 0
                      ? (
                          report.summary.totalSales /
                          report.summary.transactionCount
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm bg-yellow-100 border-yellow-200">
                <CardContent className="py-4 px-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-yellow-700 mb-1" />
                  <p className="text-xs font-semibold text-yellow-700">
                    Discount
                  </p>
                  <p className="text-xl font-bold text-yellow-900">
                    {report.summary.totalDiscount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales by Type */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Sales by Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {report.salesByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sales
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {report.salesByType.map((s) => (
                        <div
                          key={s.saleType}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {SALE_TYPE_LABELS[s.saleType] || s.saleType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.count} transactions
                            </p>
                          </div>
                          <span className="font-semibold text-sm">
                            {s.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Breakdown */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {report.paymentBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payments
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {report.paymentBreakdown.map((p) => {
                        const Icon =
                          PAYMENT_ICONS[p.paymentMethod] || DollarSign;
                        return (
                          <div
                            key={p.paymentMethod}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {p.paymentMethod}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {p.count} payments
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold text-sm">
                              {p.total.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Selling Drugs */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">
                  Top Selling Drugs
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {report.topDrugs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No drug sales
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted/50 text-xs">
                          #
                        </TableHead>
                        <TableHead className="bg-muted/50 text-xs">
                          Drug
                        </TableHead>
                        <TableHead className="bg-muted/50 text-xs text-center">
                          Qty Sold
                        </TableHead>
                        <TableHead className="bg-muted/50 text-xs text-center">
                          Transactions
                        </TableHead>
                        <TableHead className="bg-muted/50 text-xs text-right">
                          Revenue
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topDrugs.map((d, i) => (
                        <TableRow key={d.drugName}>
                          <TableCell className="text-sm font-medium text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {d.drugName}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            {d.totalQuantity}
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            {d.transactionCount}
                          </TableCell>
                          <TableCell className="text-sm text-right font-medium">
                            {d.totalRevenue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Hourly Distribution */}
            {report.hourlyDistribution.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Hourly Sales Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-end gap-1 h-32">
                    {Array.from({ length: 24 }, (_, h) => {
                      const entry = report.hourlyDistribution.find(
                        (e) => e.hour === h
                      );
                      const maxTotal = Math.max(
                        ...report.hourlyDistribution.map((e) => e.total),
                        1
                      );
                      const height = entry
                        ? (entry.total / maxTotal) * 100
                        : 0;
                      return (
                        <div
                          key={h}
                          className="flex-1 flex flex-col items-center"
                          title={`${h}:00 — ${entry?.total.toFixed(2) || "0"} (${entry?.count || 0} sales)`}
                        >
                          <div
                            className="w-full bg-[#618FF5] rounded-t transition-all"
                            style={{
                              height: `${Math.max(height, 2)}%`,
                              minHeight: entry ? "4px" : "1px",
                              opacity: entry ? 1 : 0.15,
                            }}
                          />
                          {h % 4 === 0 && (
                            <span className="text-[9px] text-muted-foreground mt-1">
                              {h}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  CreditCard,
  Package,
  AlertTriangle,
} from "lucide-react";

interface DashboardKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
  apBalance: number;
  arBalance: number;
  inventoryValue: number;
  currentRatio: number;
  profitMargin: number;
}

interface Props {
  workspaceid: string;
}

export default function FinanceOverview({ workspaceid }: Props) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/d/${workspaceid}/finance/reports/dashboard`
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load dashboard");
        }
        const data = await res.json();
        setKpis(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [workspaceid]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  // Defensive checks for undefined/null KPI values
  const safeNum = (n?: number | null) => n ?? 0;
  const safePct = (n?: number | null) => n != null ? pct(n) : "0.0%";

  const cards = [
    {
      title: "Total Revenue",
      value: fmt(safeNum(kpis.totalRevenue)),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Expenses",
      value: fmt(safeNum(kpis.totalExpenses)),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Net Income",
      value: fmt(safeNum(kpis.netIncome)),
      icon: DollarSign,
      color: safeNum(kpis.netIncome) >= 0 ? "text-green-600" : "text-red-600",
      bg: safeNum(kpis.netIncome) >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "Cash Balance",
      value: fmt(safeNum(kpis.cashBalance)),
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Accounts Payable",
      value: fmt(safeNum(kpis.apBalance)),
      icon: Receipt,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Accounts Receivable",
      value: fmt(safeNum(kpis.arBalance)),
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Inventory Value",
      value: fmt(safeNum(kpis.inventoryValue)),
      icon: Package,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Profit Margin",
      value: safePct(kpis.profitMargin),
      icon: TrendingUp,
      color: safeNum(kpis.profitMargin) >= 0 ? "text-green-600" : "text-red-600",
      bg: safeNum(kpis.profitMargin) >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance Sheet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Assets</span>
              <span className="font-medium">{fmt(safeNum(kpis.totalAssets))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Liabilities</span>
              <span className="font-medium">{fmt(safeNum(kpis.totalLiabilities))}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-sm font-medium">Total Equity</span>
              <span className="font-bold">{fmt(safeNum(kpis.totalEquity))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liquidity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current Ratio</span>
              <Badge
                variant={safeNum(kpis.currentRatio) >= 1 ? "default" : "destructive"}
              >
                {safeNum(kpis.currentRatio).toFixed(2)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Working Capital</span>
              <span className="font-medium">
                {fmt(safeNum(kpis.totalAssets) - safeNum(kpis.totalLiabilities))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-500">
              Navigate to the tabs above to manage Chart of Accounts, Journal
              Entries, AP/AR, and financial reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

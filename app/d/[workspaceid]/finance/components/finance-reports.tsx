"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download, AlertTriangle } from "lucide-react";

interface Period {
  periodid: string;
  periodcode: string;
  periodname: string;
  status: string;
}

interface TrialBalanceRow {
  accountcode: string;
  accountname: string;
  accounttype: string;
  debit: number;
  credit: number;
}

interface IncomeStatementSection {
  label: string;
  accounts: { accountcode: string; accountname: string; amount: number }[];
  total: number;
}

interface BalanceSheetSection {
  label: string;
  accounts: { accountcode: string; accountname: string; amount: number }[];
  total: number;
}

interface Props {
  workspaceid: string;
}

export default function FinanceReports({ workspaceid }: Props) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [reportTab, setReportTab] = useState("trial-balance");
  const [loading, setLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report data
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);

  useEffect(() => {
    fetchPeriods();
  }, [workspaceid]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchReport();
    }
  }, [selectedPeriod, reportTab]);

  async function fetchPeriods() {
    try {
      setPeriodsLoading(true);
      const res = await fetch(`/api/d/${workspaceid}/finance/periods`);
      if (!res.ok) throw new Error("Failed to load periods");
      const data = await res.json();
      const periodsArr = data.periods || [];
      setPeriods(periodsArr);
      // Select current month by default
      const now = new Date();
      const currentCode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const current = periodsArr.find((p: Period) => p.periodcode === currentCode);
      if (current) setSelectedPeriod(current.periodid);
      else if (periodsArr.length > 0) setSelectedPeriod(periodsArr[0].periodid);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPeriodsLoading(false);
    }
  }

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "";
      switch (reportTab) {
        case "trial-balance":
          endpoint = `/api/d/${workspaceid}/finance/reports/trial-balance?periodid=${selectedPeriod}`;
          break;
        case "income-statement":
          endpoint = `/api/d/${workspaceid}/finance/reports/income-statement?periodid=${selectedPeriod}`;
          break;
        case "balance-sheet":
          endpoint = `/api/d/${workspaceid}/finance/reports/balance-sheet?periodid=${selectedPeriod}`;
          break;
      }

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to load ${reportTab}`);
      const data = await res.json();

      switch (reportTab) {
        case "trial-balance":
          setTrialBalance(data.rows || []);
          break;
        case "income-statement":
          setIncomeStatement(data);
          break;
        case "balance-sheet":
          setBalanceSheet(data);
          break;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const selectedPeriodName =
    periods.find((p) => p.periodid === selectedPeriod)?.periodname || "";

  if (periodsLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Card>
        <CardContent className="pt-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">Period:</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.periodid} value={p.periodid}>
                  {p.periodname}
                  {p.status === "CLOSED" && " (Closed)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPeriod && (
            <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Tabs */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Trial Balance — {selectedPeriodName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[130px] text-right">Debit</TableHead>
                        <TableHead className="w-[130px] text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.map((row) => (
                        <TableRow key={row.accountcode}>
                          <TableCell className="font-mono text-sm">
                            {row.accountcode}
                          </TableCell>
                          <TableCell className="text-sm">{row.accountname}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.accounttype}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.debit > 0 ? fmt(row.debit) : ""}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {row.credit > 0 ? fmt(row.credit) : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                      {trialBalance.length > 0 && (
                        <TableRow className="font-bold bg-gray-50">
                          <TableCell colSpan={3} className="text-right">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(trialBalance.reduce((s, r) => s + r.debit, 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(trialBalance.reduce((s, r) => s + r.credit, 0))}
                          </TableCell>
                        </TableRow>
                      )}
                      {trialBalance.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No data for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Income Statement (P&amp;L) — {selectedPeriodName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : incomeStatement ? (
                <div className="space-y-6">
                  {/* Revenue */}
                  <div>
                    <h3 className="font-semibold text-green-700 mb-2">Revenue</h3>
                    {incomeStatement.revenue?.accounts?.map((a: any) => (
                      <div key={a.accountcode} className="flex justify-between py-1 px-4 text-sm">
                        <span>{a.accountcode} — {a.accountname}</span>
                        <span className="font-mono">{fmt(a.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 px-4 font-medium border-t">
                      <span>Total Revenue</span>
                      <span className="font-mono text-green-700">
                        {fmt(incomeStatement.revenue?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="font-semibold text-red-700 mb-2">Expenses</h3>
                    {incomeStatement.expenses?.accounts?.map((a: any) => (
                      <div key={a.accountcode} className="flex justify-between py-1 px-4 text-sm">
                        <span>{a.accountcode} — {a.accountname}</span>
                        <span className="font-mono">{fmt(a.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 px-4 font-medium border-t">
                      <span>Total Expenses</span>
                      <span className="font-mono text-red-700">
                        {fmt(incomeStatement.expenses?.total || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="border-t-2 pt-3">
                    <div className="flex justify-between px-4 text-lg font-bold">
                      <span>Net Income</span>
                      <span className={`font-mono ${(incomeStatement.netIncome || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {fmt(incomeStatement.netIncome || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No data for this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Balance Sheet — {selectedPeriodName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : balanceSheet ? (
                <div className="space-y-6">
                  {["assets", "liabilities", "equity"].map((section) => {
                    const data = balanceSheet[section];
                    if (!data) return null;
                    const colors: Record<string, string> = {
                      assets: "text-blue-700",
                      liabilities: "text-orange-700",
                      equity: "text-purple-700",
                    };
                    return (
                      <div key={section}>
                        <h3 className={`font-semibold capitalize mb-2 ${colors[section]}`}>
                          {section}
                        </h3>
                        {data.accounts?.map((a: any) => (
                          <div
                            key={a.accountcode}
                            className="flex justify-between py-1 px-4 text-sm"
                          >
                            <span>{a.accountcode} — {a.accountname}</span>
                            <span className="font-mono">{fmt(a.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1 px-4 font-medium border-t">
                          <span>Total {section}</span>
                          <span className={`font-mono ${colors[section]}`}>
                            {fmt(data.total || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No data for this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ArTransaction {
  artransactionid: string;
  customertype: string;
  customerid: string;
  sourcetype: string;
  sourceid: string;
  transactiondate: string;
  debitamount: string;
  creditamount: string;
  description: string | null;
}

interface AgingBucket {
  customerid: string;
  customertype: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

interface Props {
  workspaceid: string;
}

export default function AccountsReceivable({ workspaceid }: Props) {
  const [transactions, setTransactions] = useState<ArTransaction[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState("transactions");

  useEffect(() => {
    fetchData();
  }, [workspaceid]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [txRes, agingRes] = await Promise.allSettled([
        fetch(`/api/d/${workspaceid}/finance/ar`),
        fetch(`/api/d/${workspaceid}/finance/ar/aging`),
      ]);

      if (txRes.status === "fulfilled" && txRes.value.ok) {
        const data = await txRes.value.json();
        setTransactions(data.transactions || []);
      }
      if (agingRes.status === "fulfilled" && agingRes.value.ok) {
        const data = await agingRes.value.json();
        setAging(data.aging || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: string | number) =>
    parseFloat(String(n)).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalAR = transactions.reduce(
    (sum, tx) => sum + parseFloat(tx.debitamount) - parseFloat(tx.creditamount),
    0
  );

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Net AR Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${fmt(Math.max(0, totalAR))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Customers with Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aging.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">AR Transactions</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.artransactionid}>
                        <TableCell className="text-sm">
                          {new Date(tx.transactiondate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tx.customertype}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[120px]">
                          {tx.customerid.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {tx.sourcetype}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(tx.debitamount) > 0 ? fmt(tx.debitamount) : ""}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(tx.creditamount) > 0 ? fmt(tx.creditamount) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No AR transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AR Aging Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">31-60</TableHead>
                      <TableHead className="text-right">61-90</TableHead>
                      <TableHead className="text-right">91-120</TableHead>
                      <TableHead className="text-right">120+</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aging.map((bucket) => (
                      <TableRow key={`${bucket.customertype}-${bucket.customerid}`}>
                        <TableCell className="text-sm">
                          {bucket.customerid.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {bucket.customertype}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {bucket.current > 0 ? fmt(bucket.current) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {bucket.days30 > 0 ? fmt(bucket.days30) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {bucket.days60 > 0 ? fmt(bucket.days60) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {bucket.days90 > 0 ? fmt(bucket.days90) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-600">
                          {bucket.over90 > 0 ? fmt(bucket.over90) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">
                          {fmt(bucket.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {aging.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No aging data — all balances settled
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

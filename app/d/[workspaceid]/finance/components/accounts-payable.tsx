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

interface ApInvoice {
  apinvoiceid: string;
  vendorid: string;
  invoicenumber: string;
  supplierinvoicenumber: string | null;
  invoicedate: string;
  duedate: string;
  totalamount: string;
  paidamount: string;
  balancedue: string;
  status: string;
}

interface ApAgingBucket {
  vendorid: string;
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

export default function AccountsPayable({ workspaceid }: Props) {
  const [invoices, setInvoices] = useState<ApInvoice[]>([]);
  const [aging, setAging] = useState<ApAgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState("invoices");

  useEffect(() => {
    fetchData();
  }, [workspaceid]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [invRes, agingRes] = await Promise.allSettled([
        fetch(`/api/d/${workspaceid}/finance/ap/invoices`),
        fetch(`/api/d/${workspaceid}/finance/ap/invoices?status=POSTED`),
      ]);

      if (invRes.status === "fulfilled" && invRes.value.ok) {
        const data = await invRes.value.json();
        setInvoices(data.invoices || []);
      }
      // AP aging not yet wired via dedicated endpoint — show invoices for now
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

  const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    POSTED: "bg-green-100 text-green-800",
    PARTIAL: "bg-orange-100 text-orange-800",
    PAID: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };

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

  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.balancedue),
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${fmt(totalOutstanding)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Fully Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter((i) => i.status === "PAID").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">AP Invoices</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.apinvoiceid}>
                    <TableCell className="font-mono text-sm">
                      {inv.invoicenumber}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">
                      {inv.vendorid.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(inv.invoicedate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(inv.duedate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(inv.totalamount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(inv.paidamount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {fmt(inv.balancedue)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[inv.status] || ""}`}
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No AP invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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

interface TaxCode {
  taxcodeid: string;
  code: string;
  name: string;
  rate: string;
  taxtype: string;
  isinclusive: boolean;
  effectivefrom: string;
  effectiveto: string | null;
  isactive: boolean;
}

interface BankAccount {
  bankaccountid: string;
  accountname: string;
  bankname: string | null;
  accountnumber: string | null;
  accounttype: string;
  currencycode: string;
  isactive: boolean;
}

interface FiscalPeriod {
  periodid: string;
  periodcode: string;
  periodname: string;
  periodtype: string;
  startdate: string;
  enddate: string;
  fiscalyear: number;
  status: string;
}

interface Props {
  workspaceid: string;
}

export default function FinanceSettings({ workspaceid }: Props) {
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState("periods");

  useEffect(() => {
    fetchAll();
  }, [workspaceid]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const [taxRes, bankRes, periodRes] = await Promise.allSettled([
        fetch(`/api/d/${workspaceid}/finance/tax-codes`),
        fetch(`/api/d/${workspaceid}/finance/bank-accounts`),
        fetch(`/api/d/${workspaceid}/finance/periods`),
      ]);

      if (taxRes.status === "fulfilled" && taxRes.value.ok) {
        const data = await taxRes.value.json();
        setTaxCodes(data.taxCodes || []);
      }
      if (bankRes.status === "fulfilled" && bankRes.value.ok) {
        const data = await bankRes.value.json();
        setBankAccounts(data.accounts || []);
      }
      if (periodRes.status === "fulfilled" && periodRes.value.ok) {
        const data = await periodRes.value.json();
        setPeriods(data.periods || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
    LOCKED: "bg-red-100 text-red-800",
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
          <Button variant="outline" size="sm" onClick={fetchAll} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList>
        <TabsTrigger value="periods">Fiscal Periods</TabsTrigger>
        <TabsTrigger value="tax">Tax Codes</TabsTrigger>
        <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
      </TabsList>

      {/* Fiscal Periods */}
      <TabsContent value="periods">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Fiscal Periods
              <Badge variant="secondary" className="ml-2">{periods.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.periodid}>
                      <TableCell className="font-mono text-sm">{p.periodcode}</TableCell>
                      <TableCell className="text-sm">{p.periodname}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{p.periodtype}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(p.startdate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(p.enddate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{p.fiscalyear}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusColors[p.status] || ""}`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {periods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No fiscal periods. Run the seed script to generate them.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tax Codes */}
      <TabsContent value="tax">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Tax Codes
              <Badge variant="secondary" className="ml-2">{taxCodes.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Inclusive</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxCodes.map((tc) => (
                    <TableRow key={tc.taxcodeid}>
                      <TableCell className="font-mono text-sm">{tc.code}</TableCell>
                      <TableCell className="text-sm">{tc.name}</TableCell>
                      <TableCell className="font-mono text-sm">{tc.rate}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{tc.taxtype}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tc.isinclusive ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(tc.effectivefrom).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${tc.isactive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {tc.isactive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {taxCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No tax codes configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Bank Accounts */}
      <TabsContent value="bank">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Bank &amp; Cash Accounts
              <Badge variant="secondary" className="ml-2">{bankAccounts.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((ba) => (
                    <TableRow key={ba.bankaccountid}>
                      <TableCell className="text-sm font-medium">{ba.accountname}</TableCell>
                      <TableCell className="text-sm">{ba.bankname || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {ba.accountnumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{ba.accounttype}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{ba.currencycode}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${ba.isactive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {ba.isactive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bankAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No bank accounts configured
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
  );
}

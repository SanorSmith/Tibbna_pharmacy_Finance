"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Pill,
  Loader2,
  ArrowLeft,
  User,
  ScanBarcode,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Shield,
  ArrowRightLeft,
} from "lucide-react";

type OrderDetail = {
  order: any;
  patient: any;
  items: any[];
  invoice: any;
};

export default function PharmacyOrderDetailPage({
  workspaceid,
  orderid,
}: {
  workspaceid: string;
  orderid: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [insuranceList, setInsuranceList] = useState<any[]>([]);
  const [applyingInsurance, setApplyingInsurance] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderid}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, orderid]);

  const fetchInsurance = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderid}/insurance-list`);
      if (res.ok) {
        const json = await res.json();
        setInsuranceList(json.companies || []);
      }
    } catch {
      // Non-critical
    }
  }, [workspaceid, orderid]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleDispense = async () => {
    setDispensing(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/dispense`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchOrder();
    } catch (err: any) {
      console.error(err);
    } finally {
      setDispensing(false);
    }
  };

  const handleApplyInsurance = async (insuranceid: string) => {
    setApplyingInsurance(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/insurance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insuranceid }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchOrder();
    } catch (err: any) {
      console.error(err);
    } finally {
      setApplyingInsurance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading order...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const { order, patient, items, invoice } = data;
  const pendingCount = items.filter((i: any) => i.status === "PENDING").length;
  const scannedCount = items.filter(
    (i: any) => i.status === "SCANNED" || i.status === "DISPENSED" || i.status === "SUBSTITUTED"
  ).length;

  const statusColor: Record<string, string> = {
    PENDING: "bg-orange-100 text-orange-700",
    SCANNED: "bg-blue-100 text-blue-700",
    DISPENSED: "bg-green-100 text-green-700",
    SUBSTITUTED: "bg-purple-100 text-purple-700",
    OUT_OF_STOCK: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/d/${workspaceid}/pharmacy/orders`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Order {orderid.slice(0, 8)}…
          </h1>
          <p className="text-xs text-muted-foreground">
            Created {new Date(order.createdat).toLocaleString()} &bull;{" "}
            {order.source === "openehr" ? "OpenEHR" : "Manual"} &bull; Priority:{" "}
            <span className="font-medium">{order.priority.toUpperCase()}</span>
          </p>
        </div>
        <Badge
          variant={order.status === "DISPENSED" ? "outline" : "default"}
          className="text-sm px-3 py-1"
        >
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left Column: Patient + Items */}
        <div className="col-span-2 space-y-4">
          {/* Patient Card */}
          {patient && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm grid grid-cols-3 gap-2">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">
                    {patient.firstname} {patient.lastname}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">DOB:</span>{" "}
                  {patient.dateofbirth || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>{" "}
                  {patient.gender || "—"}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items ({items.length})
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {scannedCount}/{items.length} verified
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Barcode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.itemid}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.drugname}</div>
                        {item.drugstrength && (
                          <div className="text-xs text-muted-foreground">
                            {item.drugform} &bull; {item.drugstrength}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.dosage || "—"}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center text-sm">
                        {item.unitprice ? `$${parseFloat(item.unitprice).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            statusColor[item.status] || statusColor.PENDING
                          }`}
                        >
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.scannedbarcode || (item.drugbarcode || "—")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {order.status !== "DISPENSED" && order.status !== "CANCELLED" && (
            <div className="flex gap-3">
              <Link href={`/d/${workspaceid}/pharmacy/orders/${orderid}/dispense`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Open Scanner
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDispense}
                disabled={dispensing || pendingCount > 0}
              >
                {dispensing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {pendingCount > 0
                  ? `${pendingCount} item${pendingCount > 1 ? "s" : ""} not scanned`
                  : "Complete Dispensing"}
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Billing Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Billing Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Invoice #{invoice.invoicenumber}
                  </div>

                  <div className="space-y-1 text-sm">
                    {invoice.lines?.map((line: any) => (
                      <div key={line.lineid} className="flex justify-between">
                        <span className="truncate max-w-[160px]">{line.description}</span>
                        <span className="font-mono">${parseFloat(line.linetotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <hr />

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">${parseFloat(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {parseFloat(invoice.insurancecovered) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Insurance
                        </span>
                        <span className="font-mono">
                          -${parseFloat(invoice.insurancecovered).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-1 border-t">
                      <span>Patient Pays</span>
                      <span className="font-mono">
                        ${parseFloat(invoice.patientcopay || invoice.total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={invoice.status === "PAID" ? "outline" : "secondary"} className="w-full justify-center">
                    {invoice.status}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Invoice will be generated after dispensing
                </div>
              )}
            </CardContent>
          </Card>

          {/* Apply Insurance Card */}
          {invoice && parseFloat(invoice.insurancecovered) === 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Apply Insurance
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a plan to apply coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InsurancePicker
                  workspaceid={workspaceid}
                  onSelect={handleApplyInsurance}
                  loading={applyingInsurance}
                />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {order.notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Insurance picker sub-component ──────────────────────────────────
function InsurancePicker({
  workspaceid,
  onSelect,
  loading,
}: {
  workspaceid: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/d/${workspaceid}/insurance-companies`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
        }
      } catch {
        // ignore
      } finally {
        setFetching(false);
      }
    })();
  }, [workspaceid]);

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading plans...
      </div>
    );
  }

  if (companies.length === 0) {
    return <p className="text-xs text-muted-foreground">No insurance plans configured</p>;
  }

  return (
    <div className="space-y-2">
      {companies.map((c: any) => (
        <Button
          key={c.insuranceid}
          variant="outline"
          size="sm"
          className="w-full justify-between text-xs"
          disabled={loading}
          onClick={() => onSelect(c.insuranceid)}
        >
          <span>{c.name}</span>
          <span className="text-muted-foreground">{c.coveragepercent}%</span>
        </Button>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pill,
  Loader2,
  ArrowLeft,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
} from "lucide-react";

type ScanResult = {
  success: boolean;
  message: string;
  barcode: string;
  alreadyScanned?: boolean;
};

export default function PharmacyDispensePage({
  workspaceid,
  orderid,
}: {
  workspaceid: string;
  orderid: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [completing, setCompleting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderid}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setOrder(json.order);
      setItems(json.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, orderid]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Auto-focus the barcode input
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    setScanning(true);

    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: barcode.trim() }),
        }
      );
      const json = await res.json();

      setScanHistory((prev) => [
        {
          success: res.ok,
          message: json.message || json.error || "Unknown",
          barcode: barcode.trim(),
          alreadyScanned: json.alreadyScanned,
        },
        ...prev,
      ]);

      if (res.ok) {
        await fetchOrder();
      }
    } catch (err) {
      setScanHistory((prev) => [
        { success: false, message: "Network error", barcode: barcode.trim() },
        ...prev,
      ]);
    } finally {
      setBarcodeInput("");
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      handleScan(barcodeInput);
    }
  };

  const handleCompleteDispensing = async () => {
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/dispense`,
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok && json.allScanned) {
        router.push(`/d/${workspaceid}/pharmacy/orders/${orderid}`);
      } else if (!res.ok) {
        setScanHistory((prev) => [
          { success: false, message: json.error || "Cannot complete yet", barcode: "" },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const pendingItems = items.filter((i: any) => i.status === "PENDING");
  const scannedItems = items.filter(
    (i: any) => i.status === "SCANNED" || i.status === "DISPENSED" || i.status === "SUBSTITUTED"
  );
  const allScanned = pendingItems.length === 0 && items.length > 0;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-orange-100 text-orange-700",
    SCANNED: "bg-blue-100 text-blue-700",
    DISPENSED: "bg-green-100 text-green-700",
    SUBSTITUTED: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/d/${workspaceid}/pharmacy/orders/${orderid}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Order
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Dispense — Barcode Scanning
          </h1>
          <p className="text-xs text-muted-foreground">
            Scan each medication barcode to verify and complete dispensing
          </p>
        </div>
        <Badge variant={allScanned ? "outline" : "default"} className="text-sm px-3 py-1">
          {scannedItems.length}/{items.length} Verified
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Scanner Area */}
        <div className="space-y-4">
          {/* Scan Input */}
          <Card className={`border-2 ${allScanned ? "border-green-400" : "border-blue-400"}`}>
            <CardContent className="p-6">
              {allScanned ? (
                <div className="text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-lg font-semibold text-green-700">
                    All Items Verified
                  </p>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full"
                    onClick={handleCompleteDispensing}
                    disabled={completing}
                  >
                    {completing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Complete Dispensing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ScanBarcode className="h-5 w-5 text-blue-500" />
                    Scan Barcode
                  </div>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Scan or type barcode here..."
                      className="text-lg h-12 font-mono pr-20"
                      disabled={scanning}
                      autoFocus
                    />
                    <Button
                      className="absolute right-1 top-1 h-10"
                      onClick={() => handleScan(barcodeInput)}
                      disabled={scanning || !barcodeInput.trim()}
                      size="sm"
                    >
                      {scanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Scan"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter after scanning or type manually. {pendingItems.length} item
                    {pendingItems.length !== 1 ? "s" : ""} remaining.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scan History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto divide-y">
                  {scanHistory.map((s, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${
                        s.success
                          ? s.alreadyScanned
                            ? "bg-yellow-50"
                            : "bg-green-50"
                          : "bg-red-50"
                      }`}
                    >
                      {s.success ? (
                        s.alreadyScanned ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-mono text-xs">{s.barcode || "—"}</span>
                      <span className="flex-1 text-xs text-muted-foreground truncate">
                        {s.message}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Items List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items to Verify
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Expected Barcode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow
                    key={item.itemid}
                    className={
                      item.status === "SCANNED" || item.status === "DISPENSED"
                        ? "opacity-60"
                        : ""
                    }
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{item.drugname}</div>
                      {item.dosage && (
                        <div className="text-xs text-muted-foreground">{item.dosage}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          statusColor[item.status] || statusColor.PENDING
                        }`}
                      >
                        {item.status === "SCANNED" || item.status === "DISPENSED"
                          ? "✓ Verified"
                          : item.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.drugbarcode || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

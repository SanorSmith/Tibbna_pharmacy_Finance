"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  workspaceid: string;
  userName: string;
  userId: string;
}

interface SaleItem {
  itemid: string;
  drugname: string;
  drugid: string | null;
  batchid: string | null;
  lotnumber: string | null;
  quantity: number;
  unitprice: string;
  totalamount: string;
}

interface ReturnItem extends SaleItem {
  returnQuantity: number;
  itemCondition: string;
  notes: string;
}

export default function ProcessReturnClientPage({
  workspaceid,
  userName,
  userId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [sale, setSale] = useState<any>(null);
  const [existingReturns, setExistingReturns] = useState<any[]>([]);
  const [returnedQuantities, setReturnedQuantities] = useState<Record<string, number>>({});
  const [returnItems, setReturnItems] = useState<Map<string, ReturnItem>>(
    new Map()
  );
  const [returnReasons, setReturnReasons] = useState<any[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<string>("");
  const [returnNotes, setReturnNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState("");

  const saleId = searchParams.get("saleId");

  useEffect(() => {
    if (saleId) {
      fetchSaleDetails();
      fetchReturnReasons();
    }
  }, [saleId]);

  const fetchSaleDetails = async () => {
    try {
      const params = new URLSearchParams({
        workspaceId: workspaceid,
        saleId: saleId!,
      });
      const response = await fetch(`/api/pos/returns/lookup?${params}`);
      const data = await response.json();
      if (data.sales && data.sales.length > 0) {
        const saleData = data.sales[0];
        setSale(saleData);

        // Fetch existing returns for this sale to calculate available quantities
        const returnsResponse = await fetch(`/api/pos/returns?workspaceId=${workspaceid}`);
        const returnsData = await returnsResponse.json();
        const saleReturns = (returnsData.returns || []).filter(
          (r: any) => r.return.originalsaleid === saleId && r.return.status === "COMPLETED"
        );
        setExistingReturns(saleReturns);

        // Calculate returned quantities per sale item
        const returnedQty: Record<string, number> = {};
        for (const ret of saleReturns) {
          // Fetch return items for this return
          const detailResponse = await fetch(`/api/pos/returns/${ret.return.returnid}`);
          const detailData = await detailResponse.json();
          if (detailData.items) {
            for (const item of detailData.items) {
              if (item.originalsaleitemid) {
                returnedQty[item.originalsaleitemid] =
                  (returnedQty[item.originalsaleitemid] || 0) + item.quantityreturned;
              }
            }
          }
        }
        setReturnedQuantities(returnedQty);
      }
    } catch (err) {
      console.error("Failed to fetch sale:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnReasons = async () => {
    try {
      const params = new URLSearchParams({ workspaceId: workspaceid });
      const response = await fetch(`/api/pos/return-reasons?${params}`);
      const data = await response.json();
      setReturnReasons(data.reasons || []);
    } catch (err) {
      console.error("Failed to fetch return reasons:", err);
    }
  };

  const toggleItem = (item: SaleItem, checked: boolean) => {
    const alreadyReturned = returnedQuantities[item.itemid] || 0;
    const availableToReturn = item.quantity - alreadyReturned;

    if (checked && availableToReturn <= 0) {
      setError("This item has already been fully returned");
      return;
    }

    const newMap = new Map(returnItems);
    if (checked) {
      newMap.set(item.itemid, {
        ...item,
        returnQuantity: Math.min(item.quantity, availableToReturn),
        itemCondition: "OPENED",
        notes: "",
      });
    } else {
      newMap.delete(item.itemid);
    }
    setReturnItems(newMap);
  };

  const updateQuantity = (itemId: string, change: number) => {
    const newMap = new Map(returnItems);
    const item = newMap.get(itemId);
    if (item) {
      const alreadyReturned = returnedQuantities[itemId] || 0;
      const availableToReturn = item.quantity - alreadyReturned;
      const newQty = Math.max(
        1,
        Math.min(availableToReturn, item.returnQuantity + change)
      );
      item.returnQuantity = newQty;
      newMap.set(itemId, { ...item });
      setReturnItems(newMap);
    }
  };

  const updateCondition = (itemId: string, condition: string) => {
    const newMap = new Map(returnItems);
    const item = newMap.get(itemId);
    if (item) {
      item.itemCondition = condition;
      newMap.set(itemId, { ...item });
      setReturnItems(newMap);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    returnItems.forEach((item) => {
      subtotal += parseFloat(item.unitprice) * item.returnQuantity;
    });

    const reason = returnReasons.find((r) => r.reasonid === selectedReason);
    const restockingFee =
      reason?.applyrestockingfee
        ? subtotal * (parseFloat(reason.restockingfeepercentage || "0") / 100)
        : 0;

    return {
      subtotal,
      restockingFee,
      refund: subtotal - restockingFee,
    };
  };

  const processReturn = async () => {
    if (returnItems.size === 0) {
      setError("Please select at least one item to return");
      return;
    }
    if (!selectedReason) {
      setError("Please select a return reason");
      return;
    }
    if (!refundMethod) {
      setError("Please select a refund method");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const items = Array.from(returnItems.values()).map((item) => ({
        saleItemId: item.itemid,
        drugId: item.drugid,
        drugName: item.drugname,
        batchId: item.batchid,
        lotNumber: item.lotnumber,
        quantityReturned: item.returnQuantity,
        originalQuantity: item.quantity,
        unitPrice: parseFloat(item.unitprice),
        itemCondition: item.itemCondition,
        notes: item.notes || undefined,
      }));

      const allItems = sale?.items || [];
      const returnType =
        returnItems.size === allItems.length &&
        Array.from(returnItems.values()).every(
          (ri) => ri.returnQuantity === ri.quantity
        )
          ? "FULL_RETURN"
          : "PARTIAL_RETURN";

      const response = await fetch("/api/pos/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceid,
          originalSaleId: saleId,
          returnType,
          returnReasonId: selectedReason || null,
          returnNotes: returnNotes || undefined,
          items,
          refundMethod,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result);
      } else {
        setError(result.error || "Failed to process return");
      }
    } catch (err) {
      setError("An error occurred while processing the return");
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReturnReceipt = () => {
    if (!receiptRef.current) return;

    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return Receipt - ${success?.returnNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: 14px; margin: 0 0 5px 0; }
          .header p { margin: 2px 0; font-size: 11px; }
          .info { margin-bottom: 10px; font-size: 11px; }
          .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
          .items { margin: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
          .totals { margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const totals = calculateTotals();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sale not found
  if (!sale) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-muted-foreground">Sale not found</p>
        <Button
          className="mt-4"
          onClick={() => router.push(`/d/${workspaceid}/pos/returns`)}
        >
          Back to Returns
        </Button>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-bold">Return Processed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {success.returnNumber}
              </p>
            </div>
            {success.requiresApproval ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Pending Manager Approval
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                  Refund will be processed after approval
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-6 py-4">
                <p className="text-sm text-muted-foreground">Refund Amount</p>
                <p className="text-3xl font-bold text-green-600">
                  {success.refundAmount?.toLocaleString()} IQD
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {success.message}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handlePrintReturnReceipt}
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                onClick={() =>
                  router.push(`/d/${workspaceid}/pos/returns`)
                }
                className="bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
              >
                Done
              </Button>
            </div>

            {/* Hidden receipt for printing */}
            <div ref={receiptRef} className="hidden">
              <div className="header">
                <h1>RETURN RECEIPT</h1>
                <p>Tibbna Pharmacy</p>
                <p>Tel: +964 780 000 0000</p>
              </div>
              <div className="info">
                <div className="info-row">
                  <span>Return #:</span>
                  <span>{success.returnNumber}</span>
                </div>
                <div className="info-row">
                  <span>Date:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span>Original Sale:</span>
                  <span>{sale.salenumber}</span>
                </div>
                {sale.customername && (
                  <div className="info-row">
                    <span>Customer:</span>
                    <span>{sale.customername}</span>
                  </div>
                )}
              </div>
              <div className="items">
                {Array.from(returnItems.values()).map((item, idx) => (
                  <div key={idx} className="item">
                    <span>{item.drugname} x{item.returnQuantity}</span>
                    <span>
                      {(
                        parseFloat(item.unitprice) * item.returnQuantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="totals">
                <div className="total-row grand">
                  <span>REFUND:</span>
                  <span>{totals.refund.toFixed(2)} IQD</span>
                </div>
                <div className="total-row">
                  <span>Method:</span>
                  <span>{refundMethod}</span>
                </div>
              </div>
              <div className="footer">
                <p>Thank you - Tibbna Pharmacy</p>
                <p>*** End of Return Receipt ***</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main return form
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/d/${workspaceid}/pos/returns`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Process Return</h1>
          <p className="text-sm text-muted-foreground">
            Sale: {sale.salenumber} • {sale.customername || "Walk-in"} •{" "}
            {new Date(sale.saledate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items Selection (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Items to Return</CardTitle>
              <CardDescription>
                Check items and set return quantities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sale.items.map((item: SaleItem) => {
                const isSelected = returnItems.has(item.itemid);
                const returnItem = returnItems.get(item.itemid);
                const alreadyReturned = returnedQuantities[item.itemid] || 0;
                const availableToReturn = item.quantity - alreadyReturned;
                const isFullyReturned = availableToReturn <= 0;

                return (
                  <div
                    key={item.itemid}
                    className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                      isSelected
                        ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                        : isFullyReturned
                        ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                        : ""
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        toggleItem(item, checked as boolean)
                      }
                      className="mt-1"
                      disabled={isFullyReturned}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium truncate">{item.drugname}</p>
                        {isFullyReturned && (
                          <Badge variant="destructive" className="text-xs">
                            Fully Returned
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          Original Qty: {item.quantity} ×{" "}
                          {parseFloat(item.unitprice).toLocaleString()} IQD
                        </span>
                        <span>
                          Total:{" "}
                          {parseFloat(item.totalamount).toLocaleString()} IQD
                        </span>
                        {item.lotnumber && <span>Lot: {item.lotnumber}</span>}
                      </div>
                      {/* Return counter */}
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">Already returned: </span>
                        <span className="font-medium text-orange-600">
                          {returnedQuantities[item.itemid] || 0}
                        </span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-muted-foreground">Available to return: </span>
                        <span className="font-medium text-green-600">
                          {availableToReturn}
                        </span>
                      </div>
                    </div>

                    {isSelected && returnItem && (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Quantity control */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.itemid, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {returnItem.returnQuantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.itemid, 1)}
                            disabled={
                              returnItem.returnQuantity >=
                              (item.quantity - (returnedQuantities[item.itemid] || 0))
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Condition selector */}
                        <Select
                          value={returnItem.itemCondition}
                          onValueChange={(val) =>
                            updateCondition(item.itemid, val)
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">Sealed</SelectItem>
                            <SelectItem value="OPENED">Opened</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Return Details Sidebar (1/3 width) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Return Reason *</Label>
                <Select
                  value={selectedReason}
                  onValueChange={setSelectedReason}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {returnReasons.map((reason) => (
                      <SelectItem key={reason.reasonid} value={reason.reasonid}>
                        {reason.reasonname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card Reversal</SelectItem>
                    <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                    <SelectItem value="ORIGINAL_METHOD">
                      Original Method
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Additional notes..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Return Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items selected:</span>
                <span className="font-medium">{returnItems.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{totals.subtotal.toLocaleString()} IQD</span>
              </div>
              {totals.restockingFee > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Restocking Fee:</span>
                  <span>-{totals.restockingFee.toLocaleString()} IQD</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Refund:</span>
                <span className="text-green-600">
                  {totals.refund.toLocaleString()} IQD
                </span>
              </div>

              {returnReasons.find((r) => r.reasonid === selectedReason)
                ?.requiresapproval && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-700 dark:text-yellow-400">
                    This return requires manager approval before refund is
                    processed.
                  </p>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                onClick={processReturn}
                disabled={
                  processing || returnItems.size === 0 || !selectedReason || !refundMethod
                }
                className="w-full gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
                size="lg"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Process Return
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

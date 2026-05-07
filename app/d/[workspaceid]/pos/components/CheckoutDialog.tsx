"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Banknote,
  CreditCard,
  Shield,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
} from "lucide-react";
import type { CartItem } from "../pos-page";

type Payment = {
  method: "CASH" | "CARD" | "INSURANCE" | "CREDIT_ACCOUNT";
  amount: number;
  cardType?: string;
  cardLast4?: string;
  transactionId?: string;
  insuranceCompanyId?: string;
  insuranceCoverage?: number;
  patientCopay?: number;
  creditAccountId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  patient: any;
  dispensedOrder: any;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  saleType: string;
  shiftId: string | null;
  workspaceId: string;
  onSuccess: () => void;
};

export function CheckoutDialog({
  open,
  onClose,
  cart,
  patient,
  dispensedOrder,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  saleType,
  shiftId,
  workspaceId,
  onSuccess,
}: Props) {
  const [payments, setPayments] = useState<Payment[]>([
    { method: "CASH", amount: total },
  ]);
  const [cashReceived, setCashReceived] = useState(total.toString());
  const [cardLast4, setCardLast4] = useState("");
  const [cardTransactionId, setCardTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    saleNumber: string;
    change: number;
    saleData?: any;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - paymentsTotal;
  const change = Math.max(0, paymentsTotal - total);

  const updatePaymentMethod = (method: Payment["method"]) => {
    setPayments([{ method, amount: total }]);
    setCashReceived(total.toString());
    setError(null);
  };

  const handleComplete = async () => {
    if (paymentsTotal < total - 0.01) {
      setError("Payment amount is less than total");
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/pos/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          items: cart.map((item) => ({
            drugId: item.drugId,
            drugName: item.drugName,
            batchId: item.batchId,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            totalAmount: item.quantity * item.unitPrice,
            pharmacyOrderItemId: item.pharmacyOrderItemId,
          })),
          payments: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            cardType: p.cardType,
            cardLast4: p.method === "CARD" ? cardLast4 : undefined,
            transactionId:
              p.method === "CARD" ? cardTransactionId : undefined,
            insuranceCompanyId: p.insuranceCompanyId,
            insuranceCoverage: p.insuranceCoverage,
            patientCopay: p.patientCopay,
            creditAccountId: p.creditAccountId,
          })),
          patientId: patient?.patient?.patientid || null,
          pharmacyOrderId: dispensedOrder?.order?.orderid || null,
          saleType,
          shiftId,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount: total,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Checkout failed");
      }

      const data = await res.json();
      setSuccess({
        saleNumber: data.saleNumber,
        change: parseFloat(data.sale.changeamount),
        saleData: data.sale,
      });
    } catch (err: any) {
      setError(err.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (success) {
      onSuccess();
    }
    setSuccess(null);
    setError(null);
    setPayments([{ method: "CASH", amount: total }]);
    setCashReceived(total.toString());
    onClose();
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${success?.saleNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 16px;
            margin: 0 0 5px 0;
          }
          .header p {
            margin: 2px 0;
            font-size: 11px;
          }
          .info {
            margin-bottom: 10px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .items {
            margin: 10px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 11px;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            text-align: center;
            width: 40px;
          }
          .item-price {
            text-align: right;
            width: 70px;
          }
          .totals {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-row.grand {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .payment {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {success ? "Sale Complete" : "Complete Payment"}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          /* Success screen */
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold">Sale Completed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {success.saleNumber}
              </p>
            </div>
            {success.change > 0 && (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg px-6 py-4">
                <p className="text-sm text-muted-foreground">Change Due</p>
                <p className="text-3xl font-bold text-green-600">
                  {success.change.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handlePrintReceipt}
                variant="outline"
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                onClick={handleClose}
                className="bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
              >
                New Sale
              </Button>
            </div>
            
            {/* Hidden receipt template for printing */}
            <div ref={receiptRef} className="hidden">
              <div className="header">
                <h1>PHARMACY RECEIPT</h1>
                <p>Tibbna Pharmacy</p>
                <p>License: PH-2024-001</p>
                <p>Address: Baghdad, Iraq</p>
                <p>Tel: +964 780 000 0000</p>
              </div>
              
              <div className="info">
                <div className="info-row">
                  <span>Receipt #:</span>
                  <span>{success.saleNumber}</span>
                </div>
                <div className="info-row">
                  <span>Date:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span>Cashier:</span>
                  <span>POS-{workspaceId.slice(0, 8)}</span>
                </div>
                {patient?.patient && (
                  <>
                    <div className="info-row">
                      <span>Patient:</span>
                      <span>{patient.patient.firstname} {patient.patient.lastname}</span>
                    </div>
                    <div className="info-row">
                      <span>Patient ID:</span>
                      <span>{patient.patient.patientid?.slice(0, 8)}...</span>
                    </div>
                  </>
                )}
                {dispensedOrder?.order?.orderid && (
                  <div className="info-row">
                    <span>Order #:</span>
                    <span>{dispensedOrder.order.orderid?.slice(0, 8)}...</span>
                  </div>
                )}
              </div>

              <div className="items">
                <div className="item" style={{fontWeight: 'bold'}}>
                  <span className="item-name">Item</span>
                  <span className="item-qty">Qty</span>
                  <span className="item-price">Price</span>
                </div>
                {cart.map((item, idx) => (
                  <div key={idx} className="item">
                    <span className="item-name">{item.drugName}</span>
                    <span className="item-qty">{item.quantity}</span>
                    <span className="item-price">{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} IQD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="total-row">
                    <span>Discount:</span>
                    <span>-{discountAmount.toFixed(2)} IQD</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="total-row">
                    <span>Tax:</span>
                    <span>{taxAmount.toFixed(2)} IQD</span>
                  </div>
                )}
                <div className="total-row grand">
                  <span>TOTAL:</span>
                  <span>{total.toFixed(2)} IQD</span>
                </div>
              </div>

              <div className="payment">
                <div className="info-row">
                  <span>Payment Method:</span>
                  <span>{payments[0].method}</span>
                </div>
                {payments[0].method === "CASH" && (
                  <div className="info-row">
                    <span>Cash Received:</span>
                    <span>{parseFloat(cashReceived).toFixed(2)} IQD</span>
                  </div>
                )}
                {success.change > 0 && (
                  <div className="info-row">
                    <span>Change:</span>
                    <span>{success.change.toFixed(2)} IQD</span>
                  </div>
                )}
              </div>

              <div className="footer">
                <p>Thank you for choosing Tibbna Pharmacy</p>
                <p>Please keep this receipt for warranty</p>
                <p>For inquiries: support@tibbna.com</p>
                <p style={{marginTop: '10px'}}>*** End of Receipt ***</p>
              </div>
            </div>
          </div>
        ) : (
          /* Payment form */
          <>
            {/* Order summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{total.toFixed(2)}</span>
              </div>
              {patient?.patient && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Patient</span>
                  <span>
                    {patient.patient.firstname} {patient.patient.lastname}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment method tabs */}
            <Tabs
              defaultValue="CASH"
              onValueChange={(v) => updatePaymentMethod(v as Payment["method"])}
            >
              <TabsList className="w-full">
                <TabsTrigger value="CASH" className="flex-1 gap-1 text-xs">
                  <Banknote className="h-3.5 w-3.5" /> Cash
                </TabsTrigger>
                <TabsTrigger value="CARD" className="flex-1 gap-1 text-xs">
                  <CreditCard className="h-3.5 w-3.5" /> Card
                </TabsTrigger>
                <TabsTrigger value="INSURANCE" className="flex-1 gap-1 text-xs">
                  <Shield className="h-3.5 w-3.5" /> Insurance
                </TabsTrigger>
                <TabsTrigger
                  value="CREDIT_ACCOUNT"
                  className="flex-1 gap-1 text-xs"
                >
                  <Wallet className="h-3.5 w-3.5" /> Credit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="CASH" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs">Cash Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={cashReceived}
                    onChange={(e) => {
                      setCashReceived(e.target.value);
                      const val = parseFloat(e.target.value) || 0;
                      setPayments([{ method: "CASH", amount: val }]);
                    }}
                    className="mt-1"
                  />
                </div>
                {parseFloat(cashReceived) > total && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded px-3 py-2 text-center">
                    <span className="text-xs text-muted-foreground">
                      Change:
                    </span>{" "}
                    <span className="font-bold text-green-600">
                      {(parseFloat(cashReceived) - total).toFixed(2)}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="CARD" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs">Card Last 4 Digits</Label>
                  <Input
                    maxLength={4}
                    placeholder="1234"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Transaction ID</Label>
                  <Input
                    placeholder="Terminal transaction ID"
                    value={cardTransactionId}
                    onChange={(e) => setCardTransactionId(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="text-sm font-medium text-center">
                  Charge: {total.toFixed(2)}
                </div>
              </TabsContent>

              <TabsContent value="INSURANCE" className="space-y-3 mt-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded px-3 py-3 text-center text-sm">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="font-medium">Insurance Payment</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Insurance coverage will be calculated from patient&apos;s
                    plan. Amount: {total.toFixed(2)}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="CREDIT_ACCOUNT" className="space-y-3 mt-3">
                {patient?.creditAccount ? (
                  <div className="border rounded px-3 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-medium text-green-600">
                        {parseFloat(
                          patient.creditAccount.availablecredit
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charge</span>
                      <span className="font-medium">{total.toFixed(2)}</span>
                    </div>
                    {total >
                      parseFloat(patient.creditAccount.availablecredit) && (
                      <div className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Insufficient credit
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No credit account for this patient
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Payment Status */}
            {paymentsTotal < total - 0.01 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Payment required: {(total - paymentsTotal).toFixed(2)} IQD remaining
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={processing || paymentsTotal < total - 0.01}
                className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {paymentsTotal < total - 0.01 ? "Payment Required" : "Complete Sale"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

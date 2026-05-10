"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaleReceiptProps {
  data: any;
  isReprint?: boolean;
  printFormat?: "THERMAL" | "PDF" | "BROWSER";
}

export default function SaleReceiptTemplate({
  data,
  isReprint = false,
  printFormat = "THERMAL",
}: SaleReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Browser print
  const handleBrowserPrint = useReactToPrint({
    contentRef: receiptRef,
  });

  // PDF download
  const handlePDFDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text(data.workspace?.name || "Pharmacy", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(data.workspace?.address || "", pageWidth / 2, 28, { align: "center" });
    doc.text(`Tel: ${data.workspace?.phone || ""}`, pageWidth / 2, 34, { align: "center" });

    // Receipt number and date
    doc.setFontSize(12);
    doc.text(`Receipt: ${data.sale.salenumber}`, 15, 50);
    doc.text(`Date: ${new Date(data.sale.saledate).toLocaleString()}`, pageWidth - 15, 50, { align: "right" });

    if (isReprint) {
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(14);
      doc.text("*** REPRINT ***", pageWidth / 2, 60, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // Customer info
    doc.setFontSize(10);
    let y = 75;
    doc.text(`Customer: ${data.sale.customername || "Walk-in"}`, 15, y);
    y += 6;
    if (data.sale.customerphone) {
      doc.text(`Phone: ${data.sale.customerphone}`, 15, y);
      y += 6;
    }
    doc.text(`Cashier: ${data.cashier?.name || "Unknown"}`, 15, y);
    y += 6;
    if (data.shift?.shiftnumber) {
      doc.text(`Shift: ${data.shift.shiftnumber}`, 15, y);
      y += 6;
    }

    y += 10;

    // Items table
    const tableData = data.items.map((item: any) => [
      item.drugname,
      item.quantity,
      item.unitPrice.toLocaleString(),
      item.totalAmount.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Price (IQD)", "Total (IQD)"]],
      body: tableData,
      theme: "plain",
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal: ${parseFloat(data.sale.subtotal).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    y += 6;
    if (parseFloat(data.sale.taxamount) > 0) {
      doc.text(`Tax: ${parseFloat(data.sale.taxamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
      y += 6;
    }
    if (parseFloat(data.sale.discountamount) > 0) {
      doc.text(`Discount: -${parseFloat(data.sale.discountamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
      y += 6;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${parseFloat(data.sale.totalamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Paid: ${parseFloat(data.sale.paidamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    y += 6;
    if (parseFloat(data.sale.changeamount) > 0) {
      doc.text(`Change: ${parseFloat(data.sale.changeamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    }

    // Payment breakdown
    y += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Method:", 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.payments.forEach((payment: any) => {
      const methodLabel = payment.paymentmethod === "CASH" ? "Cash" :
                         payment.paymentmethod === "CARD" ? `Card (${payment.cardtype || ""} ****${payment.cardlast4 || ""})` :
                         payment.paymentmethod === "INSURANCE" ? `Insurance (${payment.insuranceclaimnumber || ""})` :
                         payment.paymentmethod === "CREDIT_ACCOUNT" ? "Credit Account" : payment.paymentmethod;
      doc.text(`${methodLabel}: ${payment.amount.toLocaleString()} IQD`, 15, y);
      y += 6;
    });

    // Footer
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your purchase!", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(data.workspace?.website || "", pageWidth / 2, y, { align: "center" });

    doc.save(`receipt-${data.sale.salenumber}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Print controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleBrowserPrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handlePDFDownload}>
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>

      {/* Receipt preview */}
      <div
        ref={receiptRef}
        className={`bg-white p-4 mx-auto ${
          printFormat === "THERMAL" ? "max-w-[58mm]" : "max-w-[210mm]"
        }`}
      >
        {isReprint && (
          <div className="text-center text-red-600 font-bold text-sm mb-2">
            *** REPRINT ***
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">{data.workspace?.name || "Pharmacy"}</h2>
          <p className="text-xs text-gray-600">{data.workspace?.address || ""}</p>
          <p className="text-xs text-gray-600">Tel: {data.workspace?.phone || ""}</p>
        </div>

        {/* Receipt info */}
        <div className="flex justify-between text-xs mb-4 border-b pb-2">
          <span>Receipt: {data.sale.salenumber}</span>
          <span>{new Date(data.sale.saledate).toLocaleString()}</span>
        </div>

        {/* Customer info */}
        <div className="text-xs space-y-1 mb-4">
          <p>Customer: {data.sale.customername || "Walk-in"}</p>
          {data.sale.customerphone && <p>Phone: {data.sale.customerphone}</p>}
          <p>Cashier: {data.cashier?.name || "Unknown"}</p>
          {data.shift?.shiftnumber && <p>Shift: {data.shift.shiftnumber}</p>}
        </div>

        {/* Items */}
        <div className="border-t border-b py-2 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Item</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1">{item.drugname}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                  <td className="text-right">{item.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="text-xs space-y-1 text-right">
          <p>Subtotal: {parseFloat(data.sale.subtotal).toLocaleString()} IQD</p>
          {parseFloat(data.sale.taxamount) > 0 && (
            <p>Tax: {parseFloat(data.sale.taxamount).toLocaleString()} IQD</p>
          )}
          {parseFloat(data.sale.discountamount) > 0 && (
            <p className="text-red-600">
              Discount: -{parseFloat(data.sale.discountamount).toLocaleString()} IQD
            </p>
          )}
          <p className="font-bold text-sm">
            Total: {parseFloat(data.sale.totalamount).toLocaleString()} IQD
          </p>
          <p>Paid: {parseFloat(data.sale.paidamount).toLocaleString()} IQD</p>
          {parseFloat(data.sale.changeamount) > 0 && (
            <p className="text-green-600">
              Change: {parseFloat(data.sale.changeamount).toLocaleString()} IQD
            </p>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="border-t pt-2 mt-2 text-xs">
          <p className="font-bold mb-1">Payment Method:</p>
          {data.payments.map((payment: any, i: number) => {
            const methodLabel =
              payment.paymentmethod === "CASH"
                ? "Cash"
                : payment.paymentmethod === "CARD"
                ? `Card (${payment.cardtype || ""} ****${payment.cardlast4 || ""})`
                : payment.paymentmethod === "INSURANCE"
                ? `Insurance (${payment.insuranceclaimnumber || ""})`
                : payment.paymentmethod === "CREDIT_ACCOUNT"
                ? "Credit Account"
                : payment.paymentmethod;
            return (
              <p key={i}>
                {methodLabel}: {payment.amount.toLocaleString()} IQD
              </p>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-4 pt-2 border-t">
          <p>Thank you for your purchase!</p>
          {data.workspace?.website && <p>{data.workspace.website}</p>}
        </div>
      </div>
    </div>
  );
}

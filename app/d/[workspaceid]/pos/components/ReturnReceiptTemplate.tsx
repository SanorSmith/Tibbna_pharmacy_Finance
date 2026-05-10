"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReturnReceiptProps {
  data: any;
  isReprint?: boolean;
  printFormat?: "THERMAL" | "PDF" | "BROWSER";
}

export default function ReturnReceiptTemplate({
  data,
  isReprint = false,
  printFormat = "THERMAL",
}: ReturnReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleBrowserPrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handlePDFDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text(data.workspace?.name || "Pharmacy", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(data.workspace?.address || "", pageWidth / 2, 28, { align: "center" });
    doc.text(`Tel: ${data.workspace?.phone || ""}`, pageWidth / 2, 34, { align: "center" });

    // Return number and date
    doc.setFontSize(12);
    doc.text(`Return: ${data.return.returnnumber}`, 15, 50);
    doc.text(`Date: ${new Date(data.return.returndate).toLocaleString()}`, pageWidth - 15, 50, { align: "right" });

    if (isReprint) {
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(14);
      doc.text("*** REPRINT ***", pageWidth / 2, 60, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // Customer info
    doc.setFontSize(10);
    let y = 75;
    doc.text(`Customer: ${data.return.customername || "Walk-in"}`, 15, y);
    y += 6;
    if (data.return.customerphone) {
      doc.text(`Phone: ${data.return.customerphone}`, 15, y);
      y += 6;
    }
    if (data.originalSale?.salenumber) {
      doc.text(`Original Sale: ${data.originalSale.salenumber}`, 15, y);
      y += 6;
    }
    if (data.reason?.reasonname) {
      doc.text(`Reason: ${data.reason.reasonname}`, 15, y);
      y += 6;
    }

    y += 10;

    // Items table
    const tableData = data.items.map((item: any) => [
      item.drugname,
      item.quantityreturned,
      item.itemcondition,
      item.totalprice.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Condition", "Total (IQD)"]],
      body: tableData,
      theme: "plain",
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text(`Total Return: ${parseFloat(data.return.totalreturnamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    y += 6;
    if (parseFloat(data.return.restockingfee) > 0) {
      doc.text(`Restocking Fee: ${parseFloat(data.return.restockingfee).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
      y += 6;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Refund Amount: ${parseFloat(data.return.refundamount).toLocaleString()} IQD`, pageWidth - 15, y, { align: "right" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Refund Method: ${data.return.refundmethod}`, pageWidth - 15, y, { align: "right" });

    // Refund transactions
    y += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Refund Transactions:", 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.refunds.forEach((refund: any) => {
      doc.text(`${new Date(refund.createdat).toLocaleString()} - ${refund.cashier}`, 15, y);
      y += 6;
      doc.text(`Amount: ${refund.refundAmount.toLocaleString()} IQD (${refund.refundmethod})`, 15, y);
      y += 6;
    });

    // Footer
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Return processed successfully", pageWidth / 2, y, { align: "center" });

    doc.save(`return-${data.return.returnnumber}.pdf`);
  };

  return (
    <div className="space-y-4">
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

        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">{data.workspace?.name || "Pharmacy"}</h2>
          <p className="text-xs text-gray-600">{data.workspace?.address || ""}</p>
          <p className="text-xs text-gray-600">Tel: {data.workspace?.phone || ""}</p>
        </div>

        <div className="flex justify-between text-xs mb-4 border-b pb-2">
          <span>Return: {data.return.returnnumber}</span>
          <span>{new Date(data.return.returndate).toLocaleString()}</span>
        </div>

        <div className="text-xs space-y-1 mb-4">
          <p>Customer: {data.return.customername || "Walk-in"}</p>
          {data.return.customerphone && <p>Phone: {data.return.customerphone}</p>}
          {data.originalSale?.salenumber && <p>Original Sale: {data.originalSale.salenumber}</p>}
          {data.reason?.reasonname && <p>Reason: {data.reason.reasonname}</p>}
        </div>

        <div className="border-t border-b py-2 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Item</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Condition</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1">{item.drugname}</td>
                  <td className="text-right">{item.quantityreturned}</td>
                  <td className="text-right">{item.itemcondition}</td>
                  <td className="text-right">{parseFloat(item.totalprice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs space-y-1 text-right">
          <p>Total Return: {parseFloat(data.return.totalreturnamount).toLocaleString()} IQD</p>
          {parseFloat(data.return.restockingfee) > 0 && (
            <p>Restocking Fee: {parseFloat(data.return.restockingfee).toLocaleString()} IQD</p>
          )}
          <p className="font-bold text-sm">
            Refund Amount: {parseFloat(data.return.refundamount).toLocaleString()} IQD
          </p>
          <p>Refund Method: {data.return.refundmethod}</p>
        </div>

        <div className="border-t pt-2 mt-2 text-xs">
          <p className="font-bold mb-1">Refund Transactions:</p>
          {data.refunds.map((refund: any, i: number) => (
            <div key={i} className="mb-2">
              <p>{new Date(refund.createdat).toLocaleString()} - {refund.cashier}</p>
              <p>Amount: {refund.refundAmount.toLocaleString()} IQD ({refund.refundmethod})</p>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-gray-500 mt-4 pt-2 border-t">
          <p>Return processed successfully</p>
        </div>
      </div>
    </div>
  );
}

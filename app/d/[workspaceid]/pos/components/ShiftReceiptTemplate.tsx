"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShiftReceiptProps {
  data: any;
  isReprint?: boolean;
  printFormat?: "THERMAL" | "PDF" | "BROWSER";
}

export default function ShiftReceiptTemplate({
  data,
  isReprint = false,
  printFormat = "THERMAL",
}: ShiftReceiptProps) {
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

    // Shift number and date
    doc.setFontSize(12);
    doc.text(`Shift Report: ${data.shift.shiftnumber}`, 15, 50);
    doc.text(`Date: ${new Date(data.shift.openingtime).toLocaleString()}`, pageWidth - 15, 50, { align: "right" });

    if (isReprint) {
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(14);
      doc.text("*** REPRINT ***", pageWidth / 2, 60, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // Cashier info
    doc.setFontSize(10);
    let y = 75;
    doc.text(`Cashier: ${data.cashier?.name || "Unknown"}`, 15, y);
    y += 6;
    doc.text(`Status: ${data.shift.status}`, 15, y);
    y += 6;
    if (data.shift.closingtime) {
      doc.text(`Closed: ${new Date(data.shift.closingtime).toLocaleString()}`, 15, y);
      y += 6;
    }

    y += 10;

    // Cash reconciliation
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Cash Reconciliation:", 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Opening Cash: ${parseFloat(data.shift.openingcash).toLocaleString()} IQD`, 15, y);
    y += 6;
    doc.text(`Expected Cash: ${parseFloat(data.shift.expectedcash || "0").toLocaleString()} IQD`, 15, y);
    y += 6;
    doc.text(`Actual Cash: ${parseFloat(data.shift.actualcash || "0").toLocaleString()} IQD`, 15, y);
    y += 6;
    const variance = parseFloat(data.shift.variance || "0");
    doc.text(`Variance: ${variance.toLocaleString()} IQD`, 15, y);
    if (variance !== 0) {
      doc.setTextColor(variance < 0 ? 200 : 200, variance < 0 ? 0 : 150, 0);
    }
    y += 6;
    doc.setTextColor(0, 0, 0);

    y += 10;

    // Payment summary
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Summary:", 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const tableData = data.paymentSummary.map((p: any) => [
      p.paymentmethod,
      p.count,
      p.totalAmount.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Method", "Count", "Total (IQD)"]],
      body: tableData,
      theme: "plain",
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Transactions: ${data.transactionCount}`, 15, y);
    y += 6;
    doc.text(`Total Revenue: ${data.totalRevenue.toLocaleString()} IQD`, 15, y);

    // Footer
    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Shift Report Generated", pageWidth / 2, y, { align: "center" });

    doc.save(`shift-${data.shift.shiftnumber}.pdf`);
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
          <span>Shift: {data.shift.shiftnumber}</span>
          <span>{new Date(data.shift.openingtime).toLocaleString()}</span>
        </div>

        <div className="text-xs space-y-1 mb-4">
          <p>Cashier: {data.cashier?.name || "Unknown"}</p>
          <p>Status: {data.shift.status}</p>
          {data.shift.closingtime && <p>Closed: {new Date(data.shift.closingtime).toLocaleString()}</p>}
        </div>

        <div className="border-t border-b py-2 mb-4">
          <p className="font-bold text-xs mb-2">Cash Reconciliation:</p>
          <div className="text-xs space-y-1">
            <p>Opening Cash: {parseFloat(data.shift.openingcash).toLocaleString()} IQD</p>
            <p>Expected Cash: {parseFloat(data.shift.expectedcash || "0").toLocaleString()} IQD</p>
            <p>Actual Cash: {parseFloat(data.shift.actualcash || "0").toLocaleString()} IQD</p>
            <p className={parseFloat(data.shift.variance || "0") !== 0 ? "font-bold" : ""}>
              Variance: {parseFloat(data.shift.variance || "0").toLocaleString()} IQD
            </p>
          </div>
        </div>

        <div className="border-t border-b py-2 mb-4">
          <p className="font-bold text-xs mb-2">Payment Summary:</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Method</th>
                <th className="text-right py-1">Count</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentSummary.map((p: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1">{p.paymentmethod}</td>
                  <td className="text-right">{p.count}</td>
                  <td className="text-right">{p.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs space-y-1">
          <p className="font-bold">Total Transactions: {data.transactionCount}</p>
          <p className="font-bold">Total Revenue: {data.totalRevenue.toLocaleString()} IQD</p>
        </div>

        <div className="text-center text-xs text-gray-500 mt-4 pt-2 border-t">
          <p>Shift Report Generated</p>
        </div>
      </div>
    </div>
  );
}

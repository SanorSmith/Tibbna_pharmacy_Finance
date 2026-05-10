"use client";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodePrintProps {
  barcode: string;
  sampleNumber: string;
  patientName: string;
  collectionDate: string;
  sampleType: string;
}

export default function BarcodePrint({
  barcode,
  sampleNumber,
  patientName,
  collectionDate,
  sampleType,
}: BarcodePrintProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && barcode) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [barcode]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sample Barcode - ${sampleNumber}</title>
          <style>
            @media print {
              @page {
                size: 4in 2in;
                margin: 0.2in;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .label-container {
              border: 2px solid #000;
              padding: 10px;
              width: 3.5in;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px solid #333;
              padding-bottom: 5px;
            }
            .sample-number {
              font-size: 16px;
              font-weight: bold;
              margin: 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 11px;
            }
            .label {
              font-weight: bold;
              color: #333;
            }
            .value {
              color: #000;
            }
            .barcode-container {
              text-align: center;
              margin: 10px 0;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #666;
              margin-top: 5px;
              border-top: 1px solid #ccc;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">
              <p class="sample-number">${sampleNumber}</p>
            </div>
            <div class="info-row">
              <span class="label">Patient:</span>
              <span class="value">${patientName}</span>
            </div>
            <div class="info-row">
              <span class="label">Sample Type:</span>
              <span class="value">${sampleType}</span>
            </div>
            <div class="info-row">
              <span class="label">Collection Date:</span>
              <span class="value">${new Date(collectionDate).toLocaleDateString()}</span>
            </div>
            <div class="barcode-container">
              ${barcodeRef.current?.outerHTML || ""}
            </div>
            <div class="footer">
              Tibbna-LIMs
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        <div className="text-center border-b pb-2 mb-3">
          <p className="font-bold text-lg">{sampleNumber}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Patient:</span>
            <span className="font-medium">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Sample Type:</span>
            <span className="font-medium">{sampleType}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Collection Date:</span>
            <span className="font-medium">
              {new Date(collectionDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex justify-center my-4">
          <svg ref={barcodeRef}></svg>
        </div>
        <div className="text-center text-xs text-gray-500 border-t pt-2">
         Tibbna-LIMs
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Print Barcode Label
      </button>
    </div>
  );
}

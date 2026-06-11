"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Download } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MedicationCardPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  workspaceid: string;
  orderid: string;
  items: any[];
}

export default function MedicationCardPrintPreview({
  open,
  onClose,
  workspaceid,
  orderid,
  items,
}: MedicationCardPrintPreviewProps) {
  const [printing, setPrinting] = useState(false);

  // Parse dosage string — handles labeled pipe-separated format:
  // "Dose: 500mg | Route: Oral | Timing: Twice daily | Instructions: Take with food"
  const parseDosageDetails = (dosageStr: string) => {
    if (!dosageStr) return {} as Record<string, string>;
    const details: Record<string, string> = {};
    const parts = dosageStr.split('|').map(p => p.trim());
    parts.forEach(part => {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) return;
      const key = part.slice(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '');
      const val = part.slice(colonIdx + 1).trim();
      if (!val) return;
      if (key === 'dose') details.dose = val;
      else if (key === 'route') details.route = val;
      else if (key === 'timing') details.timing = val;
      else if (key === 'instructions') details.instructions = val;
      else if (key === 'duration') details.duration = val;
      else if (key === 'usage') details.usage = val;
      else if (key === 'pharmacistnotes') details.pharmacistNotes = val;
    });
    return details;
  };

  const handlePrintAll = async () => {
    // Create a temporary container for all medication cards
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '15cm';
    tempContainer.style.height = 'auto !important';
    tempContainer.style.minHeight = 'unset !important';
    tempContainer.style.maxHeight = 'unset !important';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '8px';
    tempContainer.style.padding = '3mm';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.display = 'flex';
    tempContainer.style.flexDirection = 'column';
    tempContainer.id = 'prescription-print-all';
    
    // Generate HTML content for all medication cards
    items.forEach((item: any, index: number) => {
      const doseInfo = parseDosageDetails(item.dosage || '');
      
      const card = document.createElement('div');
      card.style.cssText = `
        width: 15cm;
        height: auto !important;
        min-height: unset !important;
        max-height: unset !important;
        border: 1px solid #ccc;
        box-sizing: border-box;
        padding: 3mm;
        display: flex;
        flex-direction: column;
        margin-bottom: ${index < items.length - 1 ? '10px' : '0'};
      `;
      
      card.innerHTML = `
        <div style="font-size: 8px; color: #666; line-height: 1.3; margin-bottom: 1mm;">
          <strong>Order:</strong> ${orderid.slice(0, 8)}... | ${new Date().toLocaleDateString()}
        </div>
        <div style="font-size: 10px; font-weight: bold; color: #000; margin: 1mm 0 0.5mm; line-height: 1.3;">
          ${item.drugname}
        </div>
        ${doseInfo.dose ? `<div style="font-size: 9px; font-weight: bold; color: #1a56db; margin-bottom: 1mm;">${doseInfo.dose}</div>` : ''}
        <div style="font-size: 7.5px; line-height: 1.5;">
          ${item.quantity ? `<div><strong>Qty:</strong> ${(item.quantity || 0) - (item.quantitydispensed || 0)}</div>` : ''}
          ${doseInfo.route ? `<div><strong>Route:</strong> ${doseInfo.route}</div>` : ''}
          ${doseInfo.timing ? `<div><strong>Timing:</strong> ${doseInfo.timing}</div>` : ''}
          ${doseInfo.duration ? `<div><strong>Duration:</strong> ${doseInfo.duration}</div>` : ''}
          ${doseInfo.instructions ? `<div style="font-weight:bold;color:#d97706;"><strong>Instructions:</strong> ${doseInfo.instructions}</div>` : ''}
          ${doseInfo.pharmacistNotes ? `<div><strong>Notes:</strong> ${doseInfo.pharmacistNotes}</div>` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 7px; color: #666; border-top: 0.5px solid #ccc; padding-top: 1mm; margin-top: 3mm; line-height: 1.4;">
          <span>Pharmacy Management System</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
      `;
      
      tempContainer.appendChild(card);
    });
    
    document.body.appendChild(tempContainer);
    
    try {
      // Create PDF for each medication card
      for (let i = 0; i < items.length; i++) {
        const card = tempContainer.children[i] as HTMLElement;
        
        // Force card to shrink to content size
        card.style.height = 'auto';
        
        const cardCanvas = await html2canvas(card, {
          scale: 3,
          useCORS: true,
          logging: false,
          height: card.scrollHeight,
          windowHeight: card.scrollHeight,
        });

        const imgData = cardCanvas.toDataURL('image/png');
        
        // Convert pixels to cm
        const pxToCm = 0.0264583333;
        const contentHeightCm = card.scrollHeight * pxToCm;
        
        // Create PDF with exact content dimensions
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'cm',
          format: [15, contentHeightCm], // exact content height!
        });

        pdf.addImage(imgData, 'PNG', 0, 0, 15, contentHeightCm);
        
        const medicationName = items[i].drugname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const filename = `medication-card-${medicationName}-${orderid.slice(0, 8)}-${Date.now()}.pdf`;
        pdf.save(filename);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  };

  const handlePrintIndividual = async (item: any) => {
    const doseInfo = parseDosageDetails(item.dosage || '');
    
    // Create a temporary container for the medication card
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '15cm';
    tempContainer.style.height = 'auto !important';
    tempContainer.style.minHeight = 'unset !important';
    tempContainer.style.maxHeight = 'unset !important';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '8px';
    tempContainer.style.padding = '3mm';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.display = 'flex';
    tempContainer.style.flexDirection = 'column';
    tempContainer.id = 'prescription-print-individual';
    
    // Create the medication card
    const card = document.createElement('div');
    card.style.cssText = `
      width: 15cm;
      height: auto !important;
      min-height: unset !important;
      max-height: unset !important;
      border: 1px solid #ccc;
      box-sizing: border-box;
      padding: 3mm;
      display: flex;
      flex-direction: column;
    `;
    
    card.innerHTML = `
      <div style="font-size: 8px; color: #666; line-height: 1.3; margin-bottom: 1mm;">
        <strong>Order:</strong> ${orderid.slice(0, 8)}... | ${new Date().toLocaleDateString()}
      </div>
      <div style="font-size: 10px; font-weight: bold; color: #000; margin: 1mm 0 0.5mm; line-height: 1.3;">
        ${item.drugname}
      </div>
      ${doseInfo.dose ? `<div style="font-size: 9px; font-weight: bold; color: #1a56db; margin-bottom: 1mm;">${doseInfo.dose}</div>` : ''}
      <div style="font-size: 7.5px; line-height: 1.5;">
        ${item.quantity ? `<div><strong>Qty:</strong> ${(item.quantity || 0) - (item.quantitydispensed || 0)}</div>` : ''}
        ${doseInfo.route ? `<div><strong>Route:</strong> ${doseInfo.route}</div>` : ''}
        ${doseInfo.timing ? `<div><strong>Timing:</strong> ${doseInfo.timing}</div>` : ''}
        ${doseInfo.duration ? `<div><strong>Duration:</strong> ${doseInfo.duration}</div>` : ''}
        ${doseInfo.instructions ? `<div style="font-weight:bold;color:#d97706;"><strong>Instructions:</strong> ${doseInfo.instructions}</div>` : ''}
        ${doseInfo.pharmacistNotes ? `<div><strong>Notes:</strong> ${doseInfo.pharmacistNotes}</div>` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 7px; color: #666; border-top: 0.5px solid #ccc; padding-top: 1mm; margin-top: 3mm; line-height: 1.4;">
        <span>Pharmacy Management System</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    `;
    
    tempContainer.appendChild(card);
    document.body.appendChild(tempContainer);
    
    try {
      // Force card to shrink to content size
      card.style.height = 'auto';
      
      // Generate canvas from the card with actual content height
      const canvas = await html2canvas(card, {
        scale: 3,
        useCORS: true,
        logging: false,
        height: card.scrollHeight,
        windowHeight: card.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Convert pixels to cm
      const pxToCm = 0.0264583333;
      const contentHeightCm = card.scrollHeight * pxToCm;
      
      // Create PDF with exact content dimensions
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'cm',
        format: [15, contentHeightCm], // exact content height!
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 15, contentHeightCm);
      
      const medicationName = item.drugname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const filename = `medication-card-${medicationName}-${orderid.slice(0, 8)}-${Date.now()}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Medication Card Print Preview</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download All PDFs Button */}
          <div className="flex justify-center">
            <Button
              onClick={handlePrintAll}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All PDFs
            </Button>
          </div>

          {/* Preview Cards */}
          <div className="space-y-4">
            {items.map((item: any, index: number) => {
              const doseInfo = parseDosageDetails(item.dosage || '');
              
              return (
                <div key={item.itemid} className="border rounded-lg p-4 bg-gray-50">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm text-gray-600">
                      Card {index + 1} of {items.length}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintIndividual(item)}
                      className="h-7 px-2 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download PDF
                    </Button>
                  </div>

                  {/* Card Preview */}
                  <div
                    className="bg-white border-2 border-gray-300 rounded p-3"
                    style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
                  >
                    {/* Order Info */}
                    <div className="text-xs text-gray-500 mb-1">
                      <span className="font-medium">Order:</span> {orderid.slice(0, 8)}... | {new Date().toLocaleDateString()}
                    </div>

                    {/* Medication Name */}
                    <div className="text-base font-bold text-black mb-0.5">
                      {item.drugname}
                    </div>

                    {/* Dose — prominent */}
                    {doseInfo.dose && (
                      <div className="text-sm font-bold text-blue-700 mb-1">{doseInfo.dose}</div>
                    )}

                    {/* Details */}
                    <div className="text-xs space-y-0.5 text-gray-700">
                      {item.quantity && (
                        <div><span className="font-medium">Qty:</span> {item.quantity}</div>
                      )}
                      {doseInfo.route && (
                        <div><span className="font-medium">Route:</span> {doseInfo.route}</div>
                      )}
                      {doseInfo.timing && (
                        <div><span className="font-medium">Timing:</span> {doseInfo.timing}</div>
                      )}
                      {doseInfo.duration && (
                        <div><span className="font-medium">Duration:</span> {doseInfo.duration}</div>
                      )}
                      {doseInfo.instructions && (
                        <div className="font-semibold text-amber-600">
                          <span className="font-bold">Instructions:</span> {doseInfo.instructions}
                        </div>
                      )}
                      {doseInfo.pharmacistNotes && (
                        <div><span className="font-medium">Notes:</span> {doseInfo.pharmacistNotes}</div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t">
                      <span>Pharmacy Management System</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    15cm × 4cm • Perfect for medication packages
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-blue-900 mb-2">PDF Download Instructions:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Each PDF is exactly 15cm × 8cm - perfect for medication packages</li>
              <li>• Click "Download All PDFs" to get separate PDFs for each medication</li>
              <li>• Click individual "Download PDF" buttons for specific medications</li>
              <li>• PDFs are generated with exact dimensions - no browser print dialog needed</li>
              <li>• Each medication gets its own PDF file for easy printing</li>
              <li>• Print the downloaded PDFs and stick on medication packages</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

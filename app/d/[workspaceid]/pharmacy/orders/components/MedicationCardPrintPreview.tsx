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

  // Parse dosage string to extract structured information
  const parseDosageDetails = (dosageStr: string) => {
    if (!dosageStr) return {};
    
    const details: any = {};
    
    // Handle both pipe-separated and comma-separated dosage strings
    const parts = dosageStr.includes('|') 
      ? dosageStr.split('|').map(p => p.trim())
      : dosageStr.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      // Dose amount and unit (e.g., "500 mg", "1 tablet")
      const doseMatch = part.match(/^(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|tablet|capsule|puff|U|TU|MU|mmol)/i);
      if (doseMatch) {
        details.doseamount = doseMatch[1];
        details.doseunit = doseMatch[2];
      }
      
      // Route (Oral, Parenteral, etc.)
      if (/^(Oral|Parenteral|Nasal|Rectal|Vaginal|Implant|Inhalation|Instillation|Sublingual|Transdermal)$/i.test(part)) {
        details.route = part;
      }
      
      // Timing directions
      if (/^(Once|Twice|Three times|Four times|Five times|Every|As needed|When needed|PRN|At bedtime|With meals|Before meals|After meals|daily|hourly|weekly|monthly)/i.test(part)) {
        details.timingdirections = part;
      }
      
      // Duration
      if (/^(for\s+\d+\s*(day|week|month)s?|until finished|\d+\s*(day|week|month)s?)$/i.test(part)) {
        details.duration = part.replace(/^for\s+/i, '');
      }
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
          <strong>Patient:</strong> May May (198511273322)
        </div>
        <div style="font-size: 8px; color: #666; line-height: 1.3; margin-bottom: 1mm;">
          <strong>Order:</strong> ${orderid.slice(0, 8)}... | ${new Date().toLocaleDateString()}
        </div>
        <div style="font-size: 9px; font-weight: bold; color: #000; margin: 1mm 0; line-height: 1.3;">
          ${item.drugname}
        </div>
        <div style="font-size: 7.5px; line-height: 1.3;">
          ${item.quantity ? `<div style="margin-bottom: 0.5mm;"><strong>Qty:</strong> ${(item.quantity || 0) - (item.quantitydispensed || 0)}</div>` : ''}
          ${doseInfo.doseamount && doseInfo.doseunit ? `<div style="margin-bottom: 0.5mm;"><strong>Dose:</strong> ${doseInfo.doseamount} ${doseInfo.doseunit}</div>` : ''}
          ${doseInfo.route ? `<div style="margin-bottom: 0.5mm;"><strong>Route:</strong> ${doseInfo.route}</div>` : ''}
          ${doseInfo.timingdirections ? `<div style="margin-bottom: 0.5mm;"><strong>Timing:</strong> ${doseInfo.timingdirections}</div>` : ''}
          ${doseInfo.duration ? `<div style="margin-bottom: 0.5mm;"><strong>Duration:</strong> ${doseInfo.duration}</div>` : ''}
          ${item.dosage && item.dosage.trim() ? `<div style="margin-bottom: 0.5mm;"><strong>Instructions:</strong> ${item.dosage}</div>` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 7px; color: #666; border-top: 0.5px solid #ccc; padding-top: 1mm; margin-top: 4mm; line-height: 1.4;">
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
        <strong>Patient:</strong> May May (198511273322)
      </div>
      <div style="font-size: 8px; color: #666; line-height: 1.3; margin-bottom: 1mm;">
        <strong>Order:</strong> ${orderid.slice(0, 8)}... | ${new Date().toLocaleDateString()}
      </div>
      <div style="font-size: 9px; font-weight: bold; color: #000; margin: 1mm 0; line-height: 1.3;">
        ${item.drugname}
      </div>
      <div style="font-size: 7.5px; line-height: 1.3;">
        ${item.quantity ? `<div style="margin-bottom: 0.5mm;"><strong>Qty:</strong> ${(item.quantity || 0) - (item.quantitydispensed || 0)}</div>` : ''}
        ${doseInfo.doseamount && doseInfo.doseunit ? `<div style="margin-bottom: 0.5mm;"><strong>Dose:</strong> ${doseInfo.doseamount} ${doseInfo.doseunit}</div>` : ''}
        ${doseInfo.route ? `<div style="margin-bottom: 0.5mm;"><strong>Route:</strong> ${doseInfo.route}</div>` : ''}
        ${doseInfo.timingdirections ? `<div style="margin-bottom: 0.5mm;"><strong>Timing:</strong> ${doseInfo.timingdirections}</div>` : ''}
        ${doseInfo.duration ? `<div style="margin-bottom: 0.5mm;"><strong>Duration:</strong> ${doseInfo.duration}</div>` : ''}
        ${item.dosage && item.dosage.trim() ? `<div style="margin-bottom: 0.5mm;"><strong>Instructions:</strong> ${item.dosage}</div>` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 7px; color: #666; border-top: 0.5px solid #ccc; padding-top: 1mm; margin-top: 4mm; line-height: 1.4;">
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

                  {/* Card Preview - 15cm x 4cm ratio */}
                  <div 
                    className="bg-white border-2 border-gray-300 rounded p-3"
                    style={{
                      aspectRatio: '15/4', // 15cm x 4cm ratio
                      width: '100%',
                      maxWidth: '600px',
                      margin: '0 auto'
                    }}
                  >
                    {/* Patient Info */}
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">Patient:</span> May May (198511273322)
                    </div>
                    
                    {/* Order Info */}
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">Order:</span> {orderid.slice(0, 8)}... | {new Date().toLocaleDateString()}
                    </div>

                    {/* Medication Name */}
                    <div className="text-sm font-bold text-black mb-2">
                      {item.drugname}
                    </div>

                    {/* Medication Details */}
                    <div className="text-xs space-y-1">
                      {item.quantity && (
                        <div><span className="font-medium">Qty:</span> {item.quantity}</div>
                      )}
                      {doseInfo.doseamount && doseInfo.doseunit && (
                        <div><span className="font-medium">Dose:</span> {doseInfo.doseamount} {doseInfo.doseunit}</div>
                      )}
                      {doseInfo.route && (
                        <div><span className="font-medium">Route:</span> {doseInfo.route}</div>
                      )}
                      {doseInfo.timingdirections && (
                        <div><span className="font-medium">Timing:</span> {doseInfo.timingdirections}</div>
                      )}
                      {doseInfo.duration && (
                        <div><span className="font-medium">Duration:</span> {doseInfo.duration}</div>
                      )}
                      {item.dosage && item.dosage.trim() && (
                        <div><span className="font-medium">Instructions:</span> {item.dosage}</div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t">
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

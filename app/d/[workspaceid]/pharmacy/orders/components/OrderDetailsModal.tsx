"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  User,
  ScanBarcode,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Shield,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Printer,
  Calendar,
  Phone,
  MapPin,
  Download,
} from "lucide-react";
import { Toast } from "@/components/ui/toast";
import MedicationCardPrintPreview from "./MedicationCardPrintPreview";

type OrderDetail = {
  order: any;
  patient: any;
  items: any[];
  invoice: any;
};

interface OrderDetailsModalProps {
  workspaceid: string;
  orderid: string;
  open: boolean;
  onClose: () => void;
}

export default function OrderDetailsModal({
  workspaceid,
  orderid,
  open,
  onClose,
}: OrderDetailsModalProps) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [insuranceList, setInsuranceList] = useState<any[]>([]);
  const [applyingInsurance, setApplyingInsurance] = useState(false);
  const [scanningMode, setScanningMode] = useState(false);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<any>(null);
  const [showDrugDetails, setShowDrugDetails] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };
  const [error, setError] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Print medication card
  const handlePrintMedicationCard = async (item: any) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/pharmacy/medication-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderid,
          itemName: item.drugname,
          dosage: item.dosage,
          quantity: item.quantity,
          doseAmount: item.doseamount,
          doseUnit: item.doseunit,
          route: item.route,
          timingDirections: item.timingdirections,
          directionDuration: item.duration,
        }),
      });

      const result = await response.json();

      if (result.success && result.pdfData) {
        // Create download link
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${result.pdfData}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Failed to generate medication card:', result.error);
      }
    } catch (error) {
      console.error('Error generating medication card:', error);
    }
  };

  // Print all medication cards - generates separate PDFs for each medication
  const handlePrintAllMedicationCards = async () => {
    try {
      // Generate individual PDF for each medication
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        const response = await fetch(`/api/d/${workspaceid}/pharmacy/medication-card`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderid,
            itemName: item.drugname,
            dosage: item.dosage,
            quantity: item.quantity,
            doseAmount: item.doseamount,
            doseUnit: item.doseunit,
            route: item.route,
            timingDirections: item.timingdirections,
            directionDuration: item.duration,
          }),
        });

        const result = await response.json();

        if (result.success && result.pdfData) {
          // Create download link for this medication
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${result.pdfData}`;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads to avoid browser issues
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.error(`Failed to generate medication card for ${item.drugname}:`, result.error);
        }
      }
    } catch (error) {
      console.error('Error generating all medication cards:', error);
    }
  };

  // Download individual medication card PDF using jsPDF
  const handleDownloadIndividualPDF = async (item: any) => {
    try {
      // Parse dosage details
      const parseDosageDetails = (dosageStr: string) => {
        if (!dosageStr) return {};
        
        const details: any = {};
        
        // Handle both pipe-separated and comma-separated dosage strings
        const parts = dosageStr.includes('|') 
          ? dosageStr.split('|').map(p => p.trim())
          : dosageStr.split(',').map(p => p.trim());
        
        parts.forEach(part => {
          const lower = part.toLowerCase();
          
          // Dose amount and unit - check for number followed by unit
          const trimmed = part.trim();
          let numberMatch = '';
          let i = 0;
          while (i < trimmed.length && (trimmed[i] === '.' || (trimmed[i] >= '0' && trimmed[i] <= '9'))) {
            numberMatch += trimmed[i];
            i++;
          }
          if (numberMatch && (numberMatch !== '.')) {
            const unitPart = trimmed.substring(numberMatch.length).trim().toLowerCase();
            const units = ['mg', 'g', 'ml', 'mcg', 'tablet', 'capsule', 'puff', 'u', 'tu', 'mu', 'mmol'];
            if (units.some(u => unitPart === u || unitPart.startsWith(u))) {
              details.doseamount = numberMatch;
              details.doseunit = unitPart;
            }
          }
          
          // Route - check for route keywords
          const routes = ['oral', 'parenteral', 'nasal', 'rectal', 'vaginal', 'implant', 'inhalation', 'instillation', 'sublingual', 'transdermal'];
          if (routes.some(r => lower === r)) {
            details.route = part;
          }
          
          // Timing directions - check for timing keywords
          const timings = ['once', 'twice', 'three times', 'four times', 'five times', 'every', 'as needed', 'when needed', 'prn', 'at bedtime', 'with meals', 'before meals', 'after meals', 'daily', 'hourly', 'weekly', 'monthly'];
          if (timings.some(t => lower === t)) {
            details.timingdirections = part;
          }
          
          // Duration - check for duration patterns
          if (lower.startsWith('for ') || lower === 'until finished') {
            details.duration = part.substring(4).trim();
          } else {
            const lowerPart = part.toLowerCase();
            const hasDay = lowerPart.includes('day');
            const hasWeek = lowerPart.includes('week');
            const hasMonth = lowerPart.includes('month');
            const trimmed = part.trim();
            const startsWithNumber = trimmed.length > 0 && trimmed[0] >= '0' && trimmed[0] <= '9';
            if (startsWithNumber && (hasDay || hasWeek || hasMonth)) {
              details.duration = part;
            }
          }
        });
        
        return details;
      };

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
      
      const patientName = data?.patient ? `${data.patient.firstname} ${data.patient.lastname}` : 'Unknown Patient';
      const patientId = data?.patient?.patientid || 'Unknown ID';
      
      card.innerHTML = `
        <div style="font-size: 8px; color: #666; line-height: 1.3; margin-bottom: 1mm;">
          <strong>Patient:</strong> ${patientName} (${patientId})
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
      
      // Import jsPDF and html2canvas dynamically
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
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
        
        const medicationName = item.drugname.split('').map((c: string) => {
          const code = c.charCodeAt(0);
          return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) ? c : '_';
        }).join('').substring(0, 20);
        const filename = `medication-card-${medicationName}-${orderid.slice(0, 8)}-${Date.now()}.pdf`;
        pdf.save(filename);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
      } finally {
        // Clean up
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('Error in handleDownloadIndividualPDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handlePrintInvoice = async () => {
    if (!invoice || !data) {
      alert('No invoice available to print');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice #: ${invoice.invoicenumber}`, 20, yPos);
      pdf.text(`Date: ${new Date(invoice.createdat).toLocaleDateString()}`, pageWidth - 20, yPos, { align: 'right' });
      
      yPos += 10;
      pdf.text(`Status: ${invoice.status}`, 20, yPos);
      
      // Patient Info
      yPos += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Patient Information:', 20, yPos);
      yPos += 7;
      pdf.setFont('helvetica', 'normal');
      const patientName = patient ? `${patient.firstname} ${patient.lastname}` : 'N/A';
      pdf.text(`Name: ${patientName}`, 20, yPos);
      yPos += 6;
      if (patient?.nationalid) {
        pdf.text(`National ID: ${patient.nationalid}`, 20, yPos);
        yPos += 6;
      }
      if (patient?.phone) {
        pdf.text(`Phone: ${patient.phone}`, 20, yPos);
        yPos += 6;
      }

      // Items Table
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items:', 20, yPos);
      yPos += 7;
      
      // Table headers
      pdf.setFontSize(9);
      pdf.text('Description', 20, yPos);
      pdf.text('Qty', 110, yPos, { align: 'center' });
      pdf.text('Unit Price', 135, yPos, { align: 'center' });
      pdf.text('Total', 180, yPos, { align: 'right' });
      yPos += 5;
      pdf.line(20, yPos, 190, yPos);
      yPos += 5;
      
      // Table rows
      pdf.setFont('helvetica', 'normal');
      items.forEach((item: any) => {
        const price = parseFloat(item.bestBatchPrice || item.unitprice || item.nameBasedPrice || '0');
        const total = price * (item.quantity || 1);
        
        pdf.text(item.drugname.substring(0, 35), 20, yPos);
        pdf.text(String(item.quantity || 1), 110, yPos, { align: 'center' });
        pdf.text(`${price.toFixed(2)}`, 135, yPos, { align: 'center' });
        pdf.text(`${total.toFixed(2)}`, 180, yPos, { align: 'right' });
        yPos += 6;
      });
      
      // Totals
      yPos += 5;
      pdf.line(20, yPos, 190, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Subtotal:', 120, yPos);
      pdf.text(`${parseFloat(invoice.subtotal || '0').toFixed(2)} IQD`, 170, yPos, { align: 'right' });
      yPos += 6;
      
      if (parseFloat(invoice.insurancecovered || '0') > 0) {
        pdf.text('Insurance Covered:', 120, yPos);
        pdf.text(`${parseFloat(invoice.insurancecovered).toFixed(2)} IQD`, 170, yPos, { align: 'right' });
        yPos += 6;
      }
      
      pdf.text('Patient Copay:', 120, yPos);
      pdf.text(`${parseFloat(invoice.patientcopay || '0').toFixed(2)} IQD`, 170, yPos, { align: 'right' });
      yPos += 6;
      
      pdf.setFontSize(11);
      pdf.text('Total:', 120, yPos);
      pdf.text(`${parseFloat(invoice.total).toFixed(2)} IQD`, 170, yPos, { align: 'right' });
      
      // Footer
      yPos += 20;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
      
      // Save PDF
      pdf.save(`invoice-${invoice.invoicenumber}.pdf`);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      alert('Error generating invoice. Please try again.');
    }
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderid}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);

      // Initialize scannedItems with items that are already scanned
      const alreadyScanned = new Set<string>(
        (json.items || [])
          .filter((item: any) => item.status === "SCANNED" || item.status === "DISPENSED")
          .map((item: any) => item.itemid as string)
      );
      setScannedItems(alreadyScanned);
    } catch (err) {
      console.error("Failed to fetch order:", err);
      // Set empty data structure to prevent blank display
      setData({
        order: { orderid, status: "ERROR", notes: "Failed to load order data" },
        patient: { firstname: "Unknown", lastname: "Patient" },
        items: [],
        invoice: null,
      });
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
    if (open) {
      setError(null); // Clear any previous errors
      setScanningMode(false); // Reset scanning mode
      setScannedItems(new Set()); // Clear scanned items
      setBarcodeInput(""); // Clear barcode input
      setScanMessage(""); // Clear scan message
      fetchOrder();
      fetchInsurance();
    }
  }, [open, orderid, fetchOrder, fetchInsurance]);

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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/cancel`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchOrder();
    } catch (err: any) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleScan = async (barcode: string) => {
    setScanMessage("");
    
    if (!barcode || barcode.trim().length === 0) {
      setScanMessage("❌ Please enter a barcode");
      return;
    }

    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            barcode: barcode.trim()
          }),
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setScanMessage(`✅ ${data.message}`);
        setBarcodeInput("");
        
        // Refresh order data
        await fetchOrder();
      } else {
        setScanMessage("❌ Scan failed. Please try again.");
      }
    } catch (err) {
      setScanMessage("❌ Network error. Please try again.");
    }
  };

  const handleCompleteDispensing = async () => {
    setDispensing(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/dispense`,
        { method: "POST" }
      );
      const json = await res.json();
      console.log('Dispense response:', { ok: res.ok, status: res.status, json });
      if (!res.ok) {
        const errorMsg = json.error || json.message || "Failed to dispense";
        console.log('Setting error:', errorMsg);
        setError(errorMsg);
        return;
      }
      await fetchOrder();
      setScanningMode(false);
      setScannedItems(new Set());
    } catch (err: any) {
      console.error('Dispense error:', err);
      setError(err.message || "Failed to dispense order");
    } finally {
      setDispensing(false);
    }
  };

  const handleDrugClick = async (item: any) => {
    try {
      // Use itemid if drugid is not available
      const identifier = item.drugid && item.drugid !== 'null' ? item.drugid : item.itemid;
      const endpoint = item.drugid && item.drugid !== 'null' 
        ? `/api/d/${workspaceid}/pharmacy-drugs/${item.drugid}/storage`
        : `/api/d/${workspaceid}/items/${item.itemid}/storage`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const drugDetails = await res.json();
        setSelectedDrug(drugDetails);
        setShowDrugDetails(true);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Item not found or no storage information available", "info");
        // Show modal with no storage info
        setSelectedDrug({
          drugname: item.drugname,
          drugid: item.drugid,
          batches: []
        });
        setShowDrugDetails(true);
      }
    } catch (error) {
      showToast("Error fetching drug details. Please try again.", "error");
      // Show modal with error state
      setSelectedDrug({
        drugname: item.drugname,
        drugid: item.drugid,
        batches: []
      });
      setShowDrugDetails(true);
    }
  };

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Loading Order</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            <span className="ml-2">Loading order...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Order Not Found</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Function to parse dosage string and extract unique dose and route
  const parseDosageInfo = (dosageString: string) => {
    if (!dosageString) return { dose: "", route: "" };
    
    // Split by comma and get unique parts
    const parts = dosageString.split(',').map(part => part.trim());
    const uniqueParts = [...new Set(parts)];
    
    let dose = "";
    let route = "";
    
    // Extract dose (look for mg, g, ml, etc.) using string methods
    const dosePart = uniqueParts.find(part => {
      const lower = part.toLowerCase();
      return lower.includes('mg') || lower.includes('g ') || lower.includes('ml') || lower.includes('mcg') || lower.includes('tablet') || lower.includes('capsule');
    });
    if (dosePart) dose = dosePart;
    
    // Extract route (look for route keywords) using string methods
    const routePart = uniqueParts.find(part => {
      const lower = part.toLowerCase();
      return lower.includes('oral') || lower.includes('intravenous') || lower.includes('iv') || lower.includes('topical') || lower.includes('inhalation') || lower.includes('injection') || lower.includes('subcutaneous') || lower.includes('im');
    });
    if (routePart) route = routePart;
    
    return { dose, route };
  };

  const { order, patient, items, invoice } = data || {
    order: { orderid, status: "LOADING", notes: "" },
    patient: { firstname: "", lastname: "", nationalid: "", patientid: "", dateofbirth: "", gender: "" },
    items: [],
    invoice: null,
  };
  
  // Debug: Log invoice data
  if (order.status === "DISPENSED") {
    console.log('Order is DISPENSED. Invoice data:', invoice);
  }
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div>
              <DialogTitle className="text-base font-semibold">Order ID {order.orderid || orderid.slice(0, 8)}</DialogTitle>
              <p className="text-xs text-muted-foreground">Prescribed {order.prescribeddate ? new Date(order.prescribeddate).toLocaleDateString() : new Date(order.createdat).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-orange-500 text-white hover:bg-orange-600">
                {order.status}
              </Button>
              {order.status === "DISPENSED" && (
                invoice ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`${
                      invoice.status === 'PAID' ? 'bg-green-500 text-white hover:bg-green-600' : 
                      invoice.status === 'PARTIALLY_PAID' ? 'bg-orange-500 text-white hover:bg-orange-600' : 
                      invoice.status === 'ISSUED' ? 'bg-red-500 text-white hover:bg-red-600' :
                      'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    {invoice.status === 'PAID' ? 'PAID' : 
                     invoice.status === 'PARTIALLY_PAID' ? 'PARTIALLY PAID' : 
                     invoice.status === 'ISSUED' ? 'UNPAID' :
                     invoice.status || 'NO STATUS'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-yellow-500 text-white hover:bg-yellow-600"
                    title="No invoice found - Complete payment in POS"
                  >
                    NO INVOICE
                  </Button>
                )
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Compact Patient Info */}
          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="font-medium">{patient?.firstname} {patient?.lastname}</span>
                <span className="text-muted-foreground ml-2">#{patient?.nationalid || patient?.patientid || "N/A"}</span>
              </div>
              <div className="text-muted-foreground">
                {patient?.dateofbirth ? 
                  `${Math.floor((new Date().getTime() - new Date(patient.dateofbirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}y` : 
                  "N/A"} | {patient?.gender || "N/A"}
              </div>
              <div className="text-muted-foreground">Prescriber: {order.prescribername || order.doctorname || order.prescribingdoctor || order.orderedby || order.createdby || "N/A"}</div>
              <div className="text-muted-foreground">Priority: <Badge variant={order.priority === "HIGH" ? "destructive" : "secondary"} className="text-xs">{order.priority}</Badge></div>
            </div>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '16px 0',
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: '#991b1b', fontSize: '14px', margin: 0 }}>Error</p>
              <p style={{ color: '#991b1b', fontSize: '14px', margin: '4px 0 0 0' }}>{error}</p>
            </div>
            <button onClick={() => setError(null)} style={{
              width: '24px',
              height: '24px',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#dc2626'
            }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4">
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Medications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Medications</h3>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px]">
              {items.map((item: any) => {
                    return (
                <Card key={item.itemid} className="p-3 min-w-[320px] flex-shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => handleDrugClick(item)}
                        >
                          {item.drugname}
                        </h4>
                        {(() => {
                          // Extract dose from dosage string using string methods
                          const doseIndex = item.dosage?.toLowerCase().indexOf('dose:');
                          if (doseIndex !== undefined && doseIndex !== -1) {
                            const afterDose = item.dosage.substring(doseIndex + 5);
                            const pipeIndex = afterDose.indexOf('|');
                            const doseValue = pipeIndex !== -1 
                              ? afterDose.substring(0, pipeIndex).trim()
                              : afterDose.trim();
                            if (doseValue) {
                              return (
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  {doseValue}
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{item.quantity ? String('x' + ((item.quantity || 0) - (item.quantitydispensed || 0))) : ""}</p>
                        {(() => {
                          const price = parseFloat(item.bestBatchPrice || '0') > 0
                            ? parseFloat(item.bestBatchPrice)
                            : parseFloat(item.unitprice || '0') > 0
                              ? parseFloat(item.unitprice)
                              : parseFloat(item.nameBasedPrice || '0') > 0
                                ? parseFloat(item.nameBasedPrice)
                                : 0;
                          return price > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-green-600">
                                {(price * (item.quantity || 1)).toLocaleString()} IQD
                              </span>
                              <span className="text-xs text-muted-foreground">
                                @ {price.toLocaleString()} each
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintMedicationCard(item)}
                        className="h-7 px-2 text-xs"
                        title="Print medication card"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          statusColor[item.status] || statusColor.PENDING
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Dosage Instructions */}
                  {item.dosage && (() => {
                    // Remove "Dose: X mg" from the dosage string using string methods
                    const doseIndex = item.dosage.toLowerCase().indexOf('dose:');
                    let dosageWithoutDose = item.dosage.trim();
                    if (doseIndex !== -1) {
                      const afterDose = item.dosage.substring(doseIndex + 5);
                      const pipeIndex = afterDose.indexOf('|');
                      if (pipeIndex !== -1) {
                        dosageWithoutDose = afterDose.substring(pipeIndex + 1).trim();
                      } else {
                        dosageWithoutDose = afterDose.trim();
                      }
                    }
                    if (!dosageWithoutDose) return null;
                    
                    // Split into parts and group into 3 rows
                    const parts = dosageWithoutDose.split('|').map((p: string) => p.trim()).filter((p: string) => p);
                    const itemsPerRow = Math.ceil(parts.length / 3);
                    const rows = [
                      parts.slice(0, itemsPerRow),
                      parts.slice(itemsPerRow, itemsPerRow * 2),
                      parts.slice(itemsPerRow * 2)
                    ].filter(row => row.length > 0);
                    
                    return (
                      <div className="space-y-1 text-sm mb-2 bg-blue-50 p-2 rounded">
                        <div className="text-xs font-medium text-blue-900 mb-1">📋 Instructions:</div>
                        {rows.map((row, idx) => (
                          <div key={idx} className="text-xs text-gray-700">
                            {row.join(' | ')}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {item.notes && <div className="text-sm text-muted-foreground"><strong>Notes:</strong> {item.notes}</div>}
                  {item.alternativemedicine && <div className="text-sm text-muted-foreground"><strong>Alternative:</strong> {item.alternativemedicine}</div>}
                  {item.interaction && item.interaction !== "None" && <div className="text-sm text-red-600"><strong>Interaction:</strong> {item.interaction}</div>}
                </Card>
              );
            })}
            </div>
            </div>

            {/* Right Column - Other Info */}
            <div className="space-y-4">
              {/* Combined Pricing Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Pricing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const calculateTotalFromItems = () => {
                      return items.reduce((total: number, item: any) => {
                        const price = parseFloat(item.bestBatchPrice || '0') > 0
                          ? parseFloat(item.bestBatchPrice)
                          : parseFloat(item.unitprice || '0') > 0
                            ? parseFloat(item.unitprice)
                            : parseFloat(item.nameBasedPrice || '0') > 0
                              ? parseFloat(item.nameBasedPrice)
                              : 0;
                        return total + (price * (item.quantity || 1));
                      }, 0);
                    };

                    const totalFromInvoice = invoice?.total ? parseFloat(invoice.total) : 0;
                    const totalFromItems = calculateTotalFromItems();
                    const finalTotal = totalFromInvoice || totalFromItems;

                    const patientFromInvoice = invoice?.patientcopay ? parseFloat(invoice.patientcopay) : 0;
                    const insuranceFromInvoice = invoice?.insurancecovered ? parseFloat(invoice.insurancecovered) : 0;
                    
                    const patientPay = patientFromInvoice || finalTotal;
                    const insurancePay = insuranceFromInvoice || 0;
                    const doctorShare = finalTotal - patientPay - insurancePay;
                    const insurancePercentage = invoice?.insurancecovered ? String(Math.round((parseFloat(invoice.insurancecovered) / parseFloat(invoice.total || "1")) * 100)) + "%" : "0%";

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Insurance Coverage</span>
                          <span className="font-semibold text-blue-600">{insurancePercentage}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Patient pays</span>
                          <span className="font-semibold text-green-600">{patientPay.toFixed(2)} IQD</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Insurance</span>
                          <span className="font-semibold text-blue-600">{insurancePay.toFixed(2)} IQD</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Doctor Share</span>
                          <span className="font-semibold text-purple-600">{doctorShare.toFixed(2)} IQD</span>
                        </div>
                        <div className="border-t pt-3 flex justify-between items-center">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-lg text-green-600">{finalTotal.toFixed(2)} IQD</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Pharmacist Notes - Only show if there are notes */}
              {(() => {
                const hasPharmacistNotes = items.some((item: any) => item.pharmacistnotes && item.pharmacistnotes.trim());
                if (!hasPharmacistNotes) return null;
                
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Pharmacist notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {items.map((item: any) => {
                          if (!item.pharmacistnotes || !item.pharmacistnotes.trim()) return null;
                          return (
                            <div key={item.itemid} className="text-sm">
                              <p className="font-medium text-gray-700">{item.drugname}:</p>
                              <p className="text-muted-foreground pl-3">{item.pharmacistnotes}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Indication - Only show if there is an indication */}
              {(() => {
                const indicationIndex = order.notes?.toLowerCase().indexOf('indication:');
                let indication = "";
                
                if (indicationIndex !== undefined && indicationIndex !== -1) {
                  const afterIndication = order.notes.substring(indicationIndex + 11);
                  const pipeIndex = afterIndication.indexOf('|');
                  indication = pipeIndex !== -1 
                    ? afterIndication.substring(0, pipeIndex).trim()
                    : afterIndication.trim();
                }
                
                if (!indication) return null;
                
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Indication</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{indication}</p>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Dispensing Information Card */}
              {order.status === "DISPENSED" && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Dispensing Information
                      </CardTitle>
                      {invoice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintInvoice}
                          className="gap-2"
                        >
                          <Printer className="h-4 w-4" />
                          Print Invoice
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div>
                        <span className="font-medium text-gray-700">Dispensed:</span>{' '}
                        <span className="text-muted-foreground">{order.dispensedat ? new Date(order.dispensedat).toLocaleString() : "N/A"}</span>
                      </div>
                      <div className="border-l pl-4">
                        <span className="font-medium text-gray-700">By:</span>{' '}
                        <span className="text-muted-foreground">{(order as any).dispensedbyname || order.dispensedby || "N/A"}</span>
                      </div>
                      <div className="border-l pl-4">
                        <span className="font-medium text-gray-700">Received By:</span>{' '}
                        <span className="text-muted-foreground">{patient?.firstname && patient?.lastname ? String(patient.firstname + ' ' + patient.lastname) : "N/A"}</span>
                      </div>
                      <div className="border-l pl-4">
                        <span className="font-medium text-gray-700">Payment:</span>{' '}
                        <span className={`font-semibold ${
                          invoice?.status === 'PAID' ? 'text-green-600' : 
                          invoice?.status === 'PARTIALLY_PAID' ? 'text-orange-600' : 
                          'text-red-600'
                        }`}>
                          {invoice?.status === 'PAID' ? '✓ Paid' : 
                           invoice?.status === 'PARTIALLY_PAID' ? 'Partially Paid' : 
                           invoice?.status === 'ISSUED' ? 'Unpaid' :
                           invoice?.status || 'No Invoice'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {(() => {
            console.log('Action buttons check:', { status: order.status, scanningMode, showButtons: order.status !== "DISPENSED" && order.status !== "CANCELLED" });
            return order.status !== "DISPENSED" && order.status !== "CANCELLED";
          })() && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="gap-2"
              >
                Close
              </Button>
              {!scanningMode ? (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={() => {
                    // Open POS page with order pre-loaded
                    const patientId = patient?.patientid;
                    const url = patientId 
                      ? `/d/${workspaceid}/pos?orderId=${orderid}&patientId=${patientId}`
                      : `/d/${workspaceid}/pos?orderId=${orderid}`;
                    window.location.href = url;
                  }}
                >
                  <ScanBarcode className="h-4 w-4" />
                  Go to Checkout
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setScanningMode(false)}
                  className="gap-2"
                >
                  Back to Review
                </Button>
              )}
            </div>
          )}

          {/* Inline Scanning Interface */}
          {scanningMode && order.status !== "DISPENSED" && order.status !== "CANCELLED" && (
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Scan Medications for Dispensing
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scan each medication barcode from the inventory.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    Progress: {scannedItems.size} / {items.length}
                  </span>
                  <div className="flex gap-1">
                    {items.map((item: any) => (
                      <div
                        key={item.itemid}
                        className={`w-2 h-2 rounded-full ${
                          scannedItems.has(item.itemid) || item.status === "SCANNED" || item.status === "DISPENSED" ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Barcode Input */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Enter Barcode:</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Scan or enter item barcode"
                      value={barcodeInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          handleScan(barcodeInput);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleScan(barcodeInput)}
                      disabled={!barcodeInput}
                      className="gap-2"
                    >
                      <ScanBarcode className="h-4 w-4" />
                      Scan
                    </Button>
                  </div>
                </div>

                {/* Scan Message */}
                {scanMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    scanMessage.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {scanMessage}
                  </div>
                )}

                {/* Complete Dispensing */}
                <div className="space-y-2">
                  {scannedItems.size === items.length && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={handleCompleteDispensing}
                      disabled={dispensing}
                    >
                      {dispensing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Completing Dispensing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Complete Dispensing
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Manual override button */}
                  {scannedItems.size < items.length && (
                    <Button 
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        console.log("Manual override - current state:", {
                          scannedItems: Array.from(scannedItems),
                          items: items.map((item: any) => ({ id: item.itemid, status: item.status, name: item.drugname }))
                        });
                        // Force complete dispensing anyway
                        handleCompleteDispensing();
                      }}
                      disabled={dispensing}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Force Complete Dispensing ({scannedItems.size}/{items.length} items)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Drug Details Modal */}
    <Dialog open={showDrugDetails} onOpenChange={setShowDrugDetails}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{selectedDrug?.drugname} - Storage Information</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedDrug?.form && selectedDrug?.strength && `${selectedDrug.form} • ${selectedDrug.strength}`}
          </p>
        </DialogHeader>
        <div className="space-y-4">
          {/* Storage Location Info */}
          {selectedDrug?.storageLocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📍</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">Storage Location</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-800">Location:</span>
                      <span className="text-green-900">{selectedDrug.storageLocation}</span>
                      {selectedDrug.storageType && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                          {selectedDrug.storageType}
                        </Badge>
                      )}
                    </div>
                    {selectedDrug.binLocation && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-800">Bin:</span>
                        <span className="text-green-900">{selectedDrug.binLocation}</span>
                      </div>
                    )}
                    {selectedDrug.warehouseName && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-800">Warehouse:</span>
                        <span className="text-green-900">{selectedDrug.warehouseName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-blue-600 font-medium">
            Scan the drug barcode to dispense
          </p>
          
          {/* Batches Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDrug?.batches && selectedDrug.batches.length > 0 ? (
                  selectedDrug.batches.map((batch: any, index: number) => (
                    <TableRow key={batch.batchid || index}>
                      <TableCell className="font-mono text-xs">{batch.batchNumber || batch.batchid || "N/A"}</TableCell>
                      <TableCell className="font-semibold">{batch.quantity || "0"}</TableCell>
                      <TableCell className="text-sm">
                        {batch.expiryDate 
                          ? new Date(batch.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>{batch.unitCost ? `${parseFloat(batch.unitCost).toFixed(2)} IQD` : "—"}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {batch.sellingPrice ? `${parseFloat(batch.sellingPrice).toFixed(2)} IQD` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={batch.status === "Low" ? "destructive" : batch.status === "Out of Stock" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {batch.status || "Available"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-12 w-12 text-amber-500" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-900">This drug is not found in inventory</p>
                          <p className="text-sm text-muted-foreground">
                            No batch or storage information available. Please add this drug to inventory before dispensing.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {selectedDrug?.batches && selectedDrug.batches.length > 0 ? (
            <p className="text-sm text-red-600">
              Once the drug is scanned, the inventory system will be updated and price added to the invoice
            </p>
          ) : (
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ This medication cannot be dispensed until it is added to the inventory system
            </p>
          )}

          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
               onClick={() => setShowDrugDetails(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Toast Notification */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
    {/* Print Preview Dialog */}
    <MedicationCardPrintPreview
      open={showPrintPreview}
      onClose={() => setShowPrintPreview(false)}
      workspaceid={workspaceid}
      orderid={orderid}
      items={items}
    />
  </>
  );
}

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
  DialogDescription,
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
  Plus,
} from "lucide-react";
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Fetch inventory items for all drugs in the order and redirect to POS
  const handleBeginDispensing = async () => {
    // Simply redirect to POS with order ID (no auto-add)
    // Items will be added individually from Prescription Items card
    const patientId = patient?.patientid;
    const url = patientId
      ? `/d/${workspaceid}/pos?orderId=${orderid}&patientId=${patientId}`
      : `/d/${workspaceid}/pos?orderId=${orderid}`;
    window.location.href = url;
  };

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
          // Dose amount and unit
          const doseMatch = part.match(/^(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|tablet|capsule|puff|U|TU|MU|mmol)/i);
          if (doseMatch) {
            details.doseamount = doseMatch[1];
            details.doseunit = doseMatch[2];
          }
          
          // Route
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
    } catch (error) {
      console.error('Error in handleDownloadIndividualPDF:', error);
      alert('Error generating PDF. Please try again.');
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
      fetchOrder();
      fetchInsurance();
    }
  }, [open, fetchOrder, fetchInsurance]);

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
    
    // Dummy barcode testing - accept common formats
    const dummyBarcodes = ["1234567890123", "9876543210987", "5555555555555", "1111111111111"];
    
    if (!dummyBarcodes.includes(barcode)) {
      setScanMessage("❌ Invalid barcode. Try: 1234567890123, 9876543210987, 5555555555555, or 1111111111111");
      return;
    }

    // Find first unscanned item
    const unscannedItem = items.find((item: any) => 
      !scannedItems.has(item.itemid) && item.status === "PENDING"
    );

    // Debug logging
    console.log("Scan Debug:", {
      totalItems: items.length,
      scannedItemsCount: scannedItems.size,
      scannedItems: Array.from(scannedItems),
      itemStatuses: items.map((item: any) => ({ id: item.itemid, status: item.status, name: item.drugname }))
    });

    if (!unscannedItem) {
      setScanMessage("✅ All items have been scanned!");
      return;
    }

    try {
      const res = await fetch(
        `/api/d/${workspaceid}/pharmacy-orders/${orderid}/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            itemid: unscannedItem.itemid,
            barcode: barcode 
          }),
        }
      );
      
      if (res.ok) {
        setScannedItems(prev => new Set([...prev, unscannedItem.itemid]));
        setScanMessage(`✅ Scanned: ${unscannedItem.drugname}`);
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
      if (!res.ok) throw new Error(json.error);
      await fetchOrder();
      setScanningMode(false);
      setScannedItems(new Set());
    } catch (err: any) {
      console.error(err);
    } finally {
      setDispensing(false);
    }
  };

  const handleDrugClick = async (drugId: string, drugName: string) => {
    try {
      // Fetch drug storage details
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-drugs/${drugId}/storage`);
      if (res.ok) {
        const drugDetails = await res.json();
        setSelectedDrug({ ...drugDetails, drugname: drugName });
        setShowDrugDetails(true);
      } else {
        // If API doesn't exist, show placeholder data
        setSelectedDrug({
          drugname: drugName,
          drugid: drugId,
          batches: [
            { batchid: "123", stock: "fridge 1", shelf: "A1", number: 7, expiredate: "13-4-2026", status: "Low" }
          ]
        });
        setShowDrugDetails(true);
      }
    } catch (err) {
      console.error("Failed to fetch drug details:", err);
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
    
    // Extract dose (look for mg, g, ml, etc.)
    const dosePart = uniqueParts.find(part => 
      /\d+\s*(mg|g|ml|mcg|tablet|capsule)/i.test(part)
    );
    if (dosePart) dose = dosePart;
    
    // Extract route (look for route keywords)
    const routePart = uniqueParts.find(part => 
      /oral|intravenous|iv|topical|inhalation|injection|subcutaneous|im/i.test(part)
    );
    if (routePart) route = routePart;
    
    return { dose, route };
  };

  const { order, patient, items, invoice } = data || {
    order: { orderid, status: "LOADING", notes: "" },
    patient: { firstname: "", lastname: "", nationalid: "", patientid: "", dateofbirth: "", gender: "" },
    items: [],
    invoice: null,
  };
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

        <div className="flex flex-1 flex-col gap-4">
          {/* Medications List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Medications</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {items.map((item: any) => {
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
                        
                        // Timing directions - more specific to avoid conflicts
                        if (/^(Once|Twice|Three times|Four times|Five times|Every|As needed|When needed|PRN|At bedtime|With meals|Before meals|After meals|daily|hourly|weekly|monthly)/i.test(part)) {
                          details.timingdirections = part;
                        }
                        
                        // Duration - more specific pattern to avoid conflicts
                        if (/^(for\s+\d+\s*(day|week|month)s?|until finished|\d+\s*(day|week|month)s?)$/i.test(part)) {
                          details.duration = part.replace(/^for\s+/i, '');
                        }
                        
                        // Instructions
                        if (/^(with food|before meals|after meals|with water|swallow whole|chew|dissolve|shake well|avoid alcohol)/i.test(part)) {
                          details.instructions = part;
                        }
                        
                        // Usage - more specific to avoid conflicts
                        if (/^for (headache|fever|pain|high blood pressure|diabetes|infection|asthma|allergies|stomach pain|diarrhea|anxiety|anemia|vitamin deficiency)$/i.test(part)) {
                          details.usage = part;
                        }
                      });
                      
                      return details;
                    };
                    
                    const doseInfo = parseDosageDetails(item.dosage || '');
                    
                    return (
                <Card key={item.itemid} className="p-3 min-w-[320px] flex-shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 
                        className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => handleDrugClick(item.drugid, item.drugname)}
                      >
                        {item.drugname}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{item.quantity ? `x${(item.quantity || 0) - (item.quantitydispensed || 0)}` : ""}</p>
                        {(() => {
                          // Priority: bestBatchPrice > unitprice > nameBasedPrice > inventorySellingPrice
                          const price = parseFloat(item.bestBatchPrice || '0') > 0
                            ? parseFloat(item.bestBatchPrice)
                            : parseFloat(item.unitprice || '0') > 0
                              ? parseFloat(item.unitprice)
                              : parseFloat(item.nameBasedPrice || '0') > 0
                                ? parseFloat(item.nameBasedPrice)
                                : parseFloat(item.inventorySellingPrice || '0') > 0
                                  ? parseFloat(item.inventorySellingPrice)
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
                  
                  {/* Dose Information */}
                  {Object.keys(doseInfo).length > 0 && (
                    <div className="space-y-1 text-sm mb-2">
                      {doseInfo.doseamount && doseInfo.doseunit && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Dose:</span>
                          <Badge variant="outline" className="text-xs">
                            {doseInfo.doseamount} {doseInfo.doseunit}
                          </Badge>
                        </div>
                      )}
                      {doseInfo.route && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Route:</span>
                          <Badge variant="secondary" className="text-xs">
                            {doseInfo.route}
                          </Badge>
                        </div>
                      )}
                      {doseInfo.timingdirections && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Timing:</span>
                          <span className="text-xs">{doseInfo.timingdirections}</span>
                        </div>
                      )}
                      {doseInfo.duration && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Duration:</span>
                          <span className="text-xs">{doseInfo.duration}</span>
                        </div>
                      )}
                      {doseInfo.instructions && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Instructions:</span>
                          <span className="text-xs">{doseInfo.instructions}</span>
                        </div>
                      )}
                      {doseInfo.usage && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">Usage:</span>
                          <span className="text-xs">{doseInfo.usage}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.notes && <div className="text-sm text-muted-foreground"><strong>Notes:</strong> {item.notes}</div>}
                  {item.alternativemedicine && <div className="text-sm text-muted-foreground"><strong>Alternative:</strong> {item.alternativemedicine}</div>}
                  {item.interaction && item.interaction !== "None" && <div className="text-sm text-red-600"><strong>Interaction:</strong> {item.interaction}</div>}
                </Card>
                    );
                  })}
            </div>
          </div>

          {/* Dosage Instructions Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dosage Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.notes ? (
                  (() => {
                    const orderNotes = order.notes;
                    const usageMatch = orderNotes.match(/Usage:\s*(.*?)(?=\s*\|\s*Valid until:|$|\s*\|\s*Instructions:)/i);
                    const instructionsMatch = orderNotes.match(/Instructions:\s*(.*?)(?=\s*\|\s*Issued from:|$)/i);

                    return (
                      <div className="border-l-4 border-blue-500 pl-2">
                        {usageMatch && (
                          <div className="text-sm">
                            <strong>Usage:</strong> {usageMatch[1]}
                          </div>
                        )}
                        {instructionsMatch && (
                          <div className="text-sm">
                            <strong>Instructions:</strong> {instructionsMatch[1]}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground">No order notes available for dosage instructions.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insurance and Pharmacist Notes Row */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Insurance benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center mb-1">
                  {invoice?.insurancecovered ? `${Math.round((parseFloat(invoice.insurancecovered) / parseFloat(invoice.total || "1")) * 100)}%` : "0%"}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {invoice?.insurancecovered && parseFloat(invoice.insurancecovered) > 0 
                    ? `Insurance covers $${parseFloat(invoice.insurancecovered).toFixed(2)}` 
                    : "No insurance coverage"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pharmacist notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-16 p-1 text-sm border rounded resize-none"
                  placeholder="Add pharmacist notes..."
                  value={order.pharmacistnotes || ""}
                  onChange={(e) => {
                    console.log("Pharmacist notes updated:", e.target.value);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Total Price Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total price</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calculate total from individual medication items if invoice data is not available
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
                
                // Use invoice data if available, otherwise calculate based on items
                const patientPay = patientFromInvoice || finalTotal;
                const insurancePay = insuranceFromInvoice || 0;
                const doctorShare = finalTotal - patientPay - insurancePay;

                return (
                  <>
                    <div className="flex gap-4 mb-2">
                      <div className="flex-1 text-center">
                        <p className="text-sm text-muted-foreground">Patient pays</p>
                        <p className="text-xl font-semibold text-green-600">
                          ${patientPay.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-sm text-muted-foreground">Insurance</p>
                        <p className="text-xl font-semibold text-blue-600">
                          ${insurancePay.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-sm text-muted-foreground">Doctor Share</p>
                        <p className="text-xl font-semibold text-purple-600">
                          ${doctorShare.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xl font-semibold">
                      Total: <span className="text-green-600">${finalTotal.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Bottom Actions Row */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Indication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.notes?.match(/Indication:\s*(.*?)(?=\s*\||$)/i)?.[1] || "No indication specified"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Drug Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {items.some((item: any) => item.interaction && item.interaction !== "None") 
                    ? "⚠️ Drug interactions detected - review required" 
                    : "✅ No drug interactions detected"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dispensing Information Card */}
          {order.status === "DISPENSED" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Dispensing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Dispensed Date</p>
                    <p className="text-muted-foreground">{order.dispensedat ? new Date(order.dispensedat).toLocaleString() : "N/A"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Dispensed By</p>
                    <p className="text-muted-foreground">{order.dispensedby || "N/A"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Collection Date</p>
                    <p className="text-muted-foreground">{order.collectedat ? new Date(order.collectedat).toLocaleDateString() : "Not collected"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Collected By</p>
                    <p className="text-muted-foreground">{order.collectedby || "Not collected"}</p>
                  </div>
                </div>
                {!order.collectedby && (
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // TODO: Add patient collection functionality
                        alert("Patient collection feature to be implemented");
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Collected by {patient?.firstname} {patient?.lastname}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {order.status !== "DISPENSED" && order.status !== "CANCELLED" && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
                className="gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
              {!scanningMode ? (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={handleBeginDispensing}
                  disabled={loadingInventory}
                >
                  {loadingInventory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanBarcode className="h-4 w-4" />
                  )}
                  {loadingInventory ? 'Loading...' : 'Begin Dispensing'}
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
                  Scan each medication barcode. Use dummy barcodes for testing.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    Progress: {scannedItems.size} / {items.length}
                  </span>
                  {/* Debug info */}
                  <div className="text-xs text-muted-foreground">
                    Debug: {scannedItems.size} === {items.length} = {scannedItems.size === items.length ? "YES" : "NO"}
                  </div>
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
                  <label className="text-sm font-medium">Enter Barcode (for testing):</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter dummy barcode (e.g., 1234567890123)"
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
                  <p className="text-xs text-muted-foreground">
                    Test barcodes: 1234567890123, 9876543210987, 5555555555555, 1111111111111
                  </p>
                </div>

                {/* Scan Message */}
                {scanMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    scanMessage.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {scanMessage}
                  </div>
                )}

                {/* Quick Test Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScan("1234567890123")}
                    className="text-xs"
                  >
                    Quick Scan: 1234567890123
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScan("9876543210987")}
                    className="text-xs"
                  >
                    Quick Scan: 9876543210987
                  </Button>
                </div>

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedDrug?.drugname} - Storage Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Once click on the drug name will show the storage
          </p>
          <p className="text-sm text-blue-600 font-medium">
            Scan the drug barcode
          </p>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Drug ID</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Expire Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDrug?.batches?.map((batch: any, index: number) => (
                  <TableRow key={batch.batchid || index}>
                    <TableCell>{batch.batchid || selectedDrug.drugid}</TableCell>
                    <TableCell>{batch.stock || batch.location || "N/A"}</TableCell>
                    <TableCell>{batch.shelf || "N/A"}</TableCell>
                    <TableCell>{batch.number || batch.quantity || "0"}</TableCell>
                    <TableCell>{batch.expiredate || batch.expirydate || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={batch.status === "Low" ? "destructive" : "default"}
                        className="text-xs"
                      >
                        {batch.status || "Available"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-red-600">
            Once the drug scanned the inventory system should be updated and price add to the invoice
          </p>

          <div className="flex justify-end">
            <Button onClick={() => setShowDrugDetails(false)}>
              ok
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Print Preview Dialog */}
    <MedicationCardPrintPreview
      open={showPrintPreview}
      onClose={() => setShowPrintPreview(false)}
      orderid={orderid}
      items={items}
      workspaceid={workspaceid}
    />
  </>
  );
}

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
  X,
} from "lucide-react";

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

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderid}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
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
            <h3 className="font-medium text-lg">Medications</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {items.map((item: any) => {
                    // Parse dosage string to extract structured information
                    const parseDosageDetails = (dosageStr: string) => {
                      if (!dosageStr) return {};
                      
                      const details: any = {};
                      const parts = dosageStr.split('|').map(p => p.trim());
                      
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
                        if (/daily|times|hours|needed|pain|fever|sleep|meals/i.test(part)) {
                          details.timingdirections = part;
                        }
                        
                        // Duration
                        if (/\d+\s*(day|week|month)|until finished/i.test(part)) {
                          details.duration = part;
                        }
                        
                        // Instructions
                        if (/with food|before meals|after meals|with water|swallow|chew|dissolve|shake|avoid/i.test(part)) {
                          details.instructions = part;
                        }
                        
                        // Usage
                        if (/for (headache|fever|pain|diabetes|infection|asthma|allerg|stomach|diarrhea|anxiety|anemia|vitamin)/i.test(part)) {
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
                      <p className="text-sm text-muted-foreground">{item.quantity ? `x${item.quantity}` : ""}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        statusColor[item.status] || statusColor.PENDING
                      }`}
                    >
                      {item.status}
                    </span>
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
              <div className="flex gap-4 mb-2">
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Patient pays</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${invoice?.patientcopay ? parseFloat(invoice.patientcopay).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Insurance</p>
                  <p className="text-xl font-semibold text-blue-600">
                    ${invoice?.insurancecovered ? parseFloat(invoice.insurancecovered).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Doctor Share</p>
                  <p className="text-xl font-semibold text-purple-600">
                    ${(() => {
                      if (!invoice?.total) return "0.00";
                      const total = parseFloat(invoice.total);
                      const patient = parseFloat(invoice.patientcopay || "0");
                      const insurance = parseFloat(invoice.insurancecovered || "0");
                      const doctorShare = total - patient - insurance;
                      return doctorShare.toFixed(2);
                    })()}
                  </p>
                </div>
              </div>
              <div className="text-xl font-semibold">
                Total: <span className="text-green-600">${invoice?.total ? parseFloat(invoice.total).toFixed(2) : "0.00"}</span>
              </div>
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
                  onClick={() => setScanningMode(true)}
                >
                  <ScanBarcode className="h-4 w-4" />
                  Begin Dispensing
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
  </>
  );
}

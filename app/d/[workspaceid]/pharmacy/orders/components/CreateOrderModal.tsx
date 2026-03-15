"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DrugAutocomplete } from "@/components/ui/drug-autocomplete";
import { Loader2, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  nationalid: string | null;
  dateofbirth: string | null;
}

interface OrderItem {
  drugid?: string;
  drugname: string;
  form?: string;
  strength?: string;
  quantity: number;
  doseAmount?: string;
  doseUnit?: string;
  route?: string;
  timingDirections?: string;
  directionDuration?: string;
  validUntil?: string;
  usage?: string;
  asRequired?: boolean;
  asRequiredCriterion?: string;
  additionalInstruction?: string;
  clinicalIndication?: string;
}

interface CreateOrderModalProps {
  workspaceid: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({
  workspaceid,
  open,
  onClose,
  onSuccess,
}: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    drugid: "",
    drugname: "",
    quantity: 1,
    doseAmount: "",
    doseUnit: "mg",
    route: "",
    timingDirections: "Once daily",
    directionDuration: "",
    validUntil: "",
    usage: "",
    asRequired: false,
    asRequiredCriterion: "",
    additionalInstruction: "",
    clinicalIndication: "",
  });
  
  const [priority, setPriority] = useState("routine");
  const [notes, setNotes] = useState("");

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setSearchingPatient(true);
      try {
        const res = await fetch(
          `/api/d/${workspaceid}/patients?search=${encodeURIComponent(patientSearch)}`
        );
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
        }
      } catch (error) {
        console.error("Error searching patients:", error);
      } finally {
        setSearchingPatient(false);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [patientSearch, workspaceid]);

  const handleAddItem = () => {
    if (!currentItem.drugname || currentItem.quantity < 1) {
      return;
    }

    const newItem: OrderItem = {
      drugid: currentItem.drugid || "",
      drugname: currentItem.drugname,
      form: "",
      strength: "",
      quantity: currentItem.quantity,
      doseAmount: currentItem.doseAmount,
      doseUnit: currentItem.doseUnit,
      route: currentItem.route,
      timingDirections: currentItem.timingDirections,
      directionDuration: currentItem.directionDuration,
      validUntil: currentItem.validUntil,
      usage: currentItem.usage,
      asRequired: currentItem.asRequired,
      asRequiredCriterion: currentItem.asRequiredCriterion,
      additionalInstruction: currentItem.additionalInstruction,
      clinicalIndication: currentItem.clinicalIndication,
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentItem({
      drugid: "",
      drugname: "",
      quantity: 1,
      doseAmount: "",
      doseUnit: "mg",
      route: "",
      timingDirections: "Once daily",
      directionDuration: "",
      validUntil: "",
      usage: "",
      asRequired: false,
      asRequiredCriterion: "",
      additionalInstruction: "",
      clinicalIndication: "",
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPatient || orderItems.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientid: selectedPatient.patientid,
          items: orderItems,
          priority,
          notes,
          source: "PHARMACY",
        }),
      });

      if (res.ok) {
        onSuccess();
        handleClose();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setPatients([]);
    setOrderItems([]);
    setCurrentItem({
      drugid: "",
      drugname: "",
      quantity: 1,
      doseAmount: "",
      doseUnit: "mg",
      route: "",
      timingDirections: "Once daily",
      directionDuration: "",
      validUntil: "",
      usage: "",
      asRequired: false,
      asRequiredCriterion: "",
      additionalInstruction: "",
      clinicalIndication: "",
    });
    setPriority("routine");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an Order</DialogTitle>
          <DialogDescription>
            Create a new pharmacy order with patient information and medications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </Label>
            
            {!selectedPatient ? (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search patient by name or national ID..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  {searchingPatient && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
                
                {patients.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <div
                        key={patient.patientid}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setPatients([]);
                          setPatientSearch("");
                        }}
                      >
                        <div className="font-medium">
                          {patient.firstname} {patient.lastname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {patient.nationalid && `ID: ${patient.nationalid}`}
                          {patient.dateofbirth && ` • DOB: ${new Date(patient.dateofbirth).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div>
                  <div className="font-semibold text-blue-900">
                    {selectedPatient.firstname} {selectedPatient.lastname}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedPatient.nationalid && `ID: ${selectedPatient.nationalid}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change Patient
                </Button>
              </div>
            )}
          </div>

          {/* Medication Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Add Medications</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Medication Name *</Label>
                <DrugAutocomplete
                  workspaceid={workspaceid}
                  value={currentItem.drugname}
                  onChange={(value) =>
                    setCurrentItem({ ...currentItem, drugname: value })
                  }
                  onSelect={(drug) => {
                    const route = drug.route?.match(/Route:\s*([^,]+)/i)?.[1]?.trim() || "";
                    const strengthMatch = drug.strength.match(/^(\d+)/);
                    setCurrentItem({
                      ...currentItem,
                      drugid: drug.drugid,
                      drugname: drug.name,
                      route: route.charAt(0).toUpperCase() + route.slice(1),
                      doseAmount: strengthMatch ? strengthMatch[1] : "",
                      doseUnit: drug.unit === "tablet" || drug.unit === "capsule" ? drug.unit : "mg",
                    });
                  }}
                  placeholder="Search for medication..."
                />
              </div>

              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div>
                <Label>Dose Amount *</Label>
                <Input
                  placeholder="e.g., 500"
                  value={currentItem.doseAmount}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, doseAmount: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Dose Unit *</Label>
                <Select
                  value={currentItem.doseUnit}
                  onValueChange={(value) =>
                    setCurrentItem({ ...currentItem, doseUnit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="mcg">mcg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="tablet">tablet(s)</SelectItem>
                    <SelectItem value="capsule">capsule(s)</SelectItem>
                    <SelectItem value="puff">puff(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Route *</Label>
                <Select
                  value={currentItem.route}
                  onValueChange={(value) =>
                    setCurrentItem({ ...currentItem, route: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oral">Oral</SelectItem>
                    <SelectItem value="Intravenous">IV</SelectItem>
                    <SelectItem value="Intramuscular">IM</SelectItem>
                    <SelectItem value="Subcutaneous">SC</SelectItem>
                    <SelectItem value="Topical">Topical</SelectItem>
                    <SelectItem value="Inhalation">Inhalation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Timing Directions *</Label>
                <Input
                  placeholder="e.g., Three times daily"
                  value={currentItem.timingDirections}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, timingDirections: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Duration</Label>
                <Input
                  placeholder="e.g., 7 days"
                  value={currentItem.directionDuration}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, directionDuration: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={currentItem.validUntil}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, validUntil: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Additional Fields */}
            <div className="space-y-3">
              <div>
                <Label>Usage</Label>
                <Input
                  placeholder="e.g., 1 tablet in the evening"
                  value={currentItem.usage}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, usage: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="asRequired"
                  checked={currentItem.asRequired}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, asRequired: e.target.checked })
                  }
                />
                <Label htmlFor="asRequired">As Required (PRN)</Label>
              </div>

              {currentItem.asRequired && (
                <div>
                  <Label>PRN Criterion</Label>
                  <Input
                    placeholder="e.g., for pain"
                    value={currentItem.asRequiredCriterion}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, asRequiredCriterion: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label>Instructions</Label>
                <Input
                  placeholder="e.g., Take with food"
                  value={currentItem.additionalInstruction}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, additionalInstruction: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Clinical Indication</Label>
                <Input
                  placeholder="e.g., Bacterial infection"
                  value={currentItem.clinicalIndication}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, clinicalIndication: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!currentItem.drugname || currentItem.quantity < 1}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Medication to Order
            </Button>
          </div>

          {/* Order Items List */}
          {orderItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Order Items ({orderItems.length})</Label>
              <div className="border rounded-md divide-y">
                {orderItems.map((item, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.drugname}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} • {item.doseAmount} {item.doseUnit} • {item.route} • {item.timingDirections}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Input
              placeholder="Additional instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedPatient || orderItems.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

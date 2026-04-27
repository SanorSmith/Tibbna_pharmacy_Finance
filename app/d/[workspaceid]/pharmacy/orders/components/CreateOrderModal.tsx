"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/user";
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
  middlename: string | null;
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
  pharmacistNotes?: string;
}

interface CreateOrderModalProps {
  workspaceid: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userName: string;
  userId: string;
}

export default function CreateOrderModal({
  workspaceid,
  open,
  onClose,
  onSuccess,
  userName,
  userId,
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
    pharmacistNotes: "",
  });

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
      pharmacistNotes: "",
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPatient || orderItems.length === 0 || loading) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientid: selectedPatient.patientid,
          prescriberid: userId, // Use logged-in user's ID
          prescriberName: userName, // Use logged-in user's name
          items: orderItems,
          source: "PHARMACY",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Order created successfully:", data.order?.orderid);
        onSuccess();
        handleClose();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create order");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
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
      pharmacistNotes: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
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
                          {patient.firstname} {patient.middlename ? `${patient.middlename} ` : ''}{patient.lastname}
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
                    {selectedPatient.firstname} {selectedPatient.middlename ? `${selectedPatient.middlename} ` : ''}{selectedPatient.lastname}
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
            
            <div className="space-y-3">
              {/* Single Row: Medication Name, Quantity, Dose Amount, Dose Unit */}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Medication Name *</Label>
                  <DrugAutocomplete
                    workspaceid={workspaceid}
                    value={currentItem.drugname}
                    onChange={(value) =>
                      setCurrentItem({ ...currentItem, drugname: value })
                    }
                    onSelect={(drug) => {
                      console.log("Selected drug:", drug); // Debug log
                      
                      // Handle different route data formats
                      let route = "";
                      
                      if (drug.route) {
                        if (typeof drug.route === 'string') {
                          // If route is already a simple string like "oral"
                          if (!drug.route.includes('Route:')) {
                            route = drug.route.toLowerCase();
                          } else {
                            // If route is in format "Route: Oral"
                            const routeMatch = drug.route.match(/Route:\s*([^,]+)/i);
                            route = routeMatch ? routeMatch[1].trim().toLowerCase() : drug.route.toLowerCase();
                          }
                        }
                      }
                      
                      // Map route names to dropdown values
                      const routeMapping: { [key: string]: string } = {
                        'oral': 'Oral',
                        'parenteral': 'Parenteral', 
                        'nasal': 'Nasal',
                        'rectal': 'Rectal',
                        'vaginal': 'Vaginal',
                        'implant': 'Implant',
                        'inhalation': 'Inhalation',
                        'instillation': 'Instillation',
                        'sublingual': 'Sublingual',
                        'buccal': 'Sublingual',
                        'oromucosal': 'Sublingual',
                        'transdermal': 'Transdermal',
                        'intravenous': 'Parenteral',
                        'intramuscular': 'Parenteral',
                        'subcutaneous': 'Parenteral',
                        'topical': 'Transdermal'
                      };
                      
                      const formattedRoute = routeMapping[route] || route.charAt(0).toUpperCase() + route.slice(1);
                      const strengthMatch = drug.strength?.match(/^(\d+)/);
                      
                      // Improved dose unit logic
                      let doseUnit = "mg"; // default
                      if (drug.unit) {
                        // Use the unit from the drug data directly
                        doseUnit = drug.unit.toLowerCase();
                        // Normalize common units
                        if (doseUnit === 'tablet' || doseUnit === 'capsule') {
                          doseUnit = 'mg';
                        } else if (doseUnit === 'microgram') {
                          doseUnit = 'mcg';
                        } else if (doseUnit === 'milliliter') {
                          doseUnit = 'ml';
                        } else if (doseUnit === 'gram') {
                          doseUnit = 'g';
                        }
                      }
                      
                      console.log("Setting doseUnit to:", doseUnit); // Debug log
                      
                      setCurrentItem({
                        ...currentItem,
                        drugid: drug.drugid,
                        drugname: drug.name,
                        route: formattedRoute,
                        doseAmount: strengthMatch ? strengthMatch[1] : "",
                        doseUnit: doseUnit,
                        pharmacistNotes: "",
                      });
                    }}
                    placeholder="Search medication..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantity *</Label>
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
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose Amount *</Label>
                  <Input
                    placeholder="e.g., 500"
                    value={currentItem.doseAmount}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, doseAmount: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose Unit *</Label>
                  <Select
                    value={currentItem.doseUnit}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, doseUnit: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="mg">mg</SelectItem>
                      <SelectItem value="mcg">mcg</SelectItem>
                      <SelectItem value="U">U</SelectItem>
                      <SelectItem value="TU">TU</SelectItem>
                      <SelectItem value="MU">MU</SelectItem>
                      <SelectItem value="mmol">mmol</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Single Row: Route, Timing, Duration, Instructions, Usage, Valid Until */}
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <Label className="text-xs">Route *</Label>
                  <Select
                    value={currentItem.route}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, route: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Implant">Implant</SelectItem>
                      <SelectItem value="Inhalation">Inhalation</SelectItem>
                      <SelectItem value="Instillation">Instillation</SelectItem>
                      <SelectItem value="Nasal">Nasal</SelectItem>
                      <SelectItem value="Oral">Oral</SelectItem>
                      <SelectItem value="Parenteral">Parenteral</SelectItem>
                      <SelectItem value="Rectal">Rectal</SelectItem>
                      <SelectItem value="Sublingual">Sublingual</SelectItem>
                      <SelectItem value="Transdermal">Transdermal</SelectItem>
                      <SelectItem value="Vaginal">Vaginal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Timing *</Label>
                  <Select
                    value={currentItem.timingDirections}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, timingDirections: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Timing..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                      <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                      <SelectItem value="Every 12 hours">Every 12 hours</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                      <SelectItem value="When in pain">When in pain</SelectItem>
                      <SelectItem value="When fever rises">When fever rises</SelectItem>
                      <SelectItem value="Before sleep">Before sleep</SelectItem>
                      <SelectItem value="After meals">After meals</SelectItem>
                      <SelectItem value="Before meals">Before meals</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Duration</Label>
                  <Select
                    value={currentItem.directionDuration}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, directionDuration: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Duration..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3 days">3 days</SelectItem>
                      <SelectItem value="5 days">5 days</SelectItem>
                      <SelectItem value="7 days">7 days</SelectItem>
                      <SelectItem value="10 days">10 days</SelectItem>
                      <SelectItem value="2 weeks">2 weeks</SelectItem>
                      <SelectItem value="1 month">1 month</SelectItem>
                      <SelectItem value="Until finished">Until finished</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Select
                    value={currentItem.additionalInstruction}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, additionalInstruction: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Instructions..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Take with food">Take with food</SelectItem>
                      <SelectItem value="Take before meals">Take before meals</SelectItem>
                      <SelectItem value="Take after meals">Take after meals</SelectItem>
                      <SelectItem value="Take with plenty of water">Take with plenty of water</SelectItem>
                      <SelectItem value="Swallow whole, do not crush">Swallow whole, do not crush</SelectItem>
                      <SelectItem value="Chew well before swallowing">Chew well before swallowing</SelectItem>
                      <SelectItem value="Dissolve under tongue">Dissolve under tongue</SelectItem>
                      <SelectItem value="Shake well before use">Shake well before use</SelectItem>
                      <SelectItem value="Avoid driving after taking">Avoid driving after taking</SelectItem>
                      <SelectItem value="Avoid alcohol during treatment">Avoid alcohol during treatment</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Usage</Label>
                  <Select
                    value={currentItem.usage}
                    onValueChange={(value) =>
                      setCurrentItem({ ...currentItem, usage: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Usage..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="For headache">For headache</SelectItem>
                      <SelectItem value="For fever">For fever</SelectItem>
                      <SelectItem value="For high blood pressure">For high blood pressure</SelectItem>
                      <SelectItem value="For diabetes">For diabetes</SelectItem>
                      <SelectItem value="For infection">For infection</SelectItem>
                      <SelectItem value="For asthma">For asthma</SelectItem>
                      <SelectItem value="For allergies">For allergies</SelectItem>
                      <SelectItem value="For stomach pain">For stomach pain</SelectItem>
                      <SelectItem value="For diarrhea">For diarrhea</SelectItem>
                      <SelectItem value="For anxiety">For anxiety</SelectItem>
                      <SelectItem value="For anemia">For anemia</SelectItem>
                      <SelectItem value="For vitamin deficiency">For vitamin deficiency</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valid Until</Label>
                  <Input
                    type="date"
                    value={currentItem.validUntil}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, validUntil: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            
            {/* PRN & Clinical Indication */}
            <div className="space-y-3">

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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Instructions</Label>
                  <Input
                    placeholder="e.g., Take with food"
                    value={currentItem.additionalInstruction}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, additionalInstruction: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Clinical Indication</Label>
                  <Input
                    placeholder="e.g., Bacterial infection"
                    value={currentItem.clinicalIndication}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, clinicalIndication: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Pharmacist Notes */}
              <div>
                <Label className="text-xs">Pharmacist Notes</Label>
                <Input
                  placeholder="Add pharmacist notes for this medication..."
                  value={currentItem.pharmacistNotes}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, pharmacistNotes: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!currentItem.drugname || currentItem.quantity < 1}
              className=" w-full bg-gray-100 hover:bg-green-300 text-gray-900 gap-2"
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
                      {item.pharmacistNotes && (
                        <div className="text-sm text-muted-foreground">
                          Pharmacist Notes: {item.pharmacistNotes}
                        </div>
                      )}
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={handleSubmit}
              disabled={loading || !selectedPatient || orderItems.length === 0}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

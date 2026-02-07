"use client";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  User,
  Shield,
  Pill,
  ArrowLeft,
  Loader2,
  FileText,
  Percent,
} from "lucide-react";

interface PatientResult {
  patientid: string;
  firstname: string;
  middlename: string | null;
  lastname: string;
  nationalid: string | null;
  dateofbirth: string | null;
  gender: string | null;
  phone: string | null;
}

interface InsuranceInfo {
  patientinsuranceid: string;
  policynumber: string;
  groupnumber: string | null;
  companyname: string;
  companycode: string | null;
  coveragepercent: string;
  companyphone: string | null;
  isprimary: boolean;
  isactive: boolean;
}

interface Prescription {
  composition_uid: string;
  recorded_time: string;
  medication_item: string;
  product_name?: string;
  dose_amount?: string;
  dose_unit?: string;
  route: string;
  timing_directions: string;
  additional_instruction?: string;
  prescribed_by: string;
  status: string;
  valid_until?: string;
}

interface PharmacyOrder {
  orderid: string;
  status: string;
  priority: string;
  source: string;
  createdat: string;
  dispensedat: string | null;
  notes: string | null;
  items: {
    itemid: string;
    drugname: string;
    dosage: string | null;
    quantity: number;
    unitprice: string | null;
    status: string;
  }[];
}

interface PatientDetail {
  patient: PatientResult & { age: number | null; email: string | null; bloodgroup: string | null };
  insurance: InsuranceInfo[];
  prescriptions: Prescription[];
  pharmacyOrders: PharmacyOrder[];
}

export default function PrescriptionManagement({ workspaceid }: { workspaceid: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, []);

  // Search patients
  const { data: searchResults, isLoading: searching } = useQuery<{ patients: PatientResult[] }>({
    queryKey: ["pharmacy-patient-search", workspaceid, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return { patients: [] };
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-prescriptions?query=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2 && !selectedPatientId,
  });

  // Fetch patient detail
  const { data: patientDetail, isLoading: loadingDetail } = useQuery<PatientDetail>({
    queryKey: ["pharmacy-patient-detail", workspaceid, selectedPatientId],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-prescriptions?patientid=${selectedPatientId}`);
      if (!res.ok) throw new Error("Failed to fetch patient");
      return res.json();
    },
    enabled: !!selectedPatientId,
  });

  const handleSelectPatient = (patientid: string) => {
    setSelectedPatientId(patientid);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleBack = () => {
    setSelectedPatientId(null);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  // Patient detail view
  if (selectedPatientId) {
    if (loadingDetail) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      );
    }

    if (!patientDetail) return null;

    const { patient, insurance, prescriptions, pharmacyOrders } = patientDetail;
    const primaryInsurance = insurance.find((i) => i.isprimary) || insurance[0];

    return (
      <div className="space-y-4">
        {/* Back button + Patient header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBack} className="h-8">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg font-bold">
            {patient.firstname} {patient.middlename || ""} {patient.lastname}
          </h2>
        </div>

        {/* Patient info + Insurance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient info card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-teal-500" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">National ID</span>
                  <p className="font-medium">{patient.nationalid || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Gender / Age</span>
                  <p className="font-medium">{patient.gender || "—"} {patient.age !== null ? `/ ${patient.age} yrs` : ""}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Date of Birth</span>
                  <p className="font-medium">{patient.dateofbirth || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Blood Group</span>
                  <p className="font-medium">{patient.bloodgroup || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Phone</span>
                  <p className="font-medium">{patient.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Email</span>
                  <p className="font-medium truncate">{patient.email || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Insurance Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {insurance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">No insurance on file</p>
              ) : (
                <div className="space-y-3">
                  {insurance.map((ins) => (
                    <div key={ins.patientinsuranceid} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{ins.companyname}</span>
                          {ins.companycode && <Badge variant="outline" className="text-[10px]">{ins.companycode}</Badge>}
                          {ins.isprimary && <Badge className="text-[10px] bg-teal-500">Primary</Badge>}
                        </div>
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md">
                          <Percent className="h-3 w-3" />
                          <span className="font-bold text-sm">{parseFloat(ins.coveragepercent).toFixed(0)}% coverage</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <div>Policy: <span className="text-foreground font-medium">{ins.policynumber}</span></div>
                        {ins.groupnumber && <div>Group: <span className="text-foreground font-medium">{ins.groupnumber}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prescriptions (from OpenEHR) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Medication History (Prescriptions)
              <Badge variant="outline" className="text-[10px]">{prescriptions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No prescriptions found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Medication</TableHead>
                      <TableHead className="text-xs">Dosage</TableHead>
                      <TableHead className="text-xs">Route</TableHead>
                      <TableHead className="text-xs">Timing</TableHead>
                      <TableHead className="text-xs">Prescribed By</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((rx) => (
                      <TableRow key={rx.composition_uid}>
                        <TableCell className="text-sm font-medium">
                          {rx.medication_item}
                          {rx.product_name && <p className="text-[11px] text-muted-foreground">{rx.product_name}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{rx.dose_amount} {rx.dose_unit || ""}</TableCell>
                        <TableCell className="text-sm">{rx.route || "—"}</TableCell>
                        <TableCell className="text-sm">{rx.timing_directions || "—"}</TableCell>
                        <TableCell className="text-sm">{rx.prescribed_by}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(rx.recorded_time).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={rx.status === "active" ? "default" : "secondary"}
                            className={`text-[10px] ${rx.status === "active" ? "bg-green-500" : rx.status === "expired" ? "bg-gray-400" : ""}`}
                          >
                            {rx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pharmacy Orders */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Pill className="h-4 w-4 text-orange-500" />
              Pharmacy Orders
              <Badge variant="outline" className="text-[10px]">{pharmacyOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {pharmacyOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pharmacy orders for this patient</p>
            ) : (
              <div className="space-y-3">
                {pharmacyOrders.map((order) => (
                  <div key={order.orderid} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Order {order.orderid.slice(0, 8)}...</span>
                        <Badge className={`text-[10px] ${
                          order.status === "DISPENSED" ? "bg-green-500" :
                          order.status === "PENDING" ? "bg-amber-500" :
                          order.status === "IN_PROGRESS" ? "bg-blue-500" :
                          "bg-gray-400"
                        }`}>
                          {order.status}
                        </Badge>
                        {order.priority !== "routine" && (
                          <Badge variant="destructive" className="text-[10px]">{order.priority}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdat).toLocaleDateString()} {new Date(order.createdat).toLocaleTimeString()}
                      </span>
                    </div>
                    {order.items.length > 0 && (
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.itemid} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                            <span className="font-medium">{item.drugname}</span>
                            <div className="flex items-center gap-3">
                              {item.dosage && <span className="text-muted-foreground">{item.dosage}</span>}
                              <span>Qty: {item.quantity}</span>
                              <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {order.dispensedat && (
                      <p className="text-[11px] text-green-600 mt-1">
                        Dispensed: {new Date(order.dispensedat).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance discount summary */}
        {primaryInsurance && (
          <Card className="shadow-sm border-teal-200 bg-teal-50/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold">Insurance Discount Available</p>
                    <p className="text-xs text-muted-foreground">{primaryInsurance.companyname} — Policy: {primaryInsurance.policynumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-teal-600">{parseFloat(primaryInsurance.coveragepercent).toFixed(0)}%</p>
                  <p className="text-[11px] text-muted-foreground">Coverage discount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Search view
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Prescription Management</h2>

      {/* Search field */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search patient by name, National ID, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Search results */}
      {searching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {searchResults && searchResults.patients.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">National ID</TableHead>
                  <TableHead className="text-xs">Gender</TableHead>
                  <TableHead className="text-xs">DOB</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.patients.map((p) => (
                  <TableRow key={p.patientid} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelectPatient(p.patientid)}>
                    <TableCell className="text-sm font-medium">
                      {p.firstname} {p.middlename || ""} {p.lastname}
                    </TableCell>
                    <TableCell className="text-sm">{p.nationalid || "—"}</TableCell>
                    <TableCell className="text-sm">{p.gender || "—"}</TableCell>
                    <TableCell className="text-sm">{p.dateofbirth || "—"}</TableCell>
                    <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {debouncedQuery.length >= 2 && !searching && searchResults?.patients.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No patients found matching &quot;{debouncedQuery}&quot;</p>
      )}

      {debouncedQuery.length < 2 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Search for a patient to view their medication history and insurance information</p>
        </div>
      )}
    </div>
  );
}

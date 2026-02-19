/**
 * Register Sample Tab Component
 * - Sample registration and accessioning
 * - Register new samples with barcode generation
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, Loader2, ScanBarcode, QrCode, Plus, Search, Clock } from "lucide-react";
import { calculateTAT, getTATStatusColor, getTATStatusLabel, formatDuration } from "@/lib/lims/tat-tracking";
import BarcodePrint from "./BarcodePrint";
import { getDialogClasses } from "@/lib/ui-constants";
import { LABORATORIES } from "@/lib/test-catalog";

// Storage Location interface
interface StorageLocation {
  locationid: string;
  name: string;
  code: string;
  description: string | null;
  type: string;
  category: string;
  building: string | null;
  room: string | null;
  equipment: string | null;
  section: string | null;
  position: string | null;
  capacity: number | null;
  currentcount: number | null;
  availableslots: number | null;
  temperaturemin: number | null;
  temperaturemax: number | null;
  humiditymin: number | null;
  humiditymax: number | null;
  restrictedaccess: boolean;
  accessrequirements: string | null;
  status: string;
  isavailable: boolean;
  sortorder: number;
  parentlocationid: string | null;
  createdby: string;
  createdat: string;
  updatedby: string | null;
  updatedat: string | null;
  workspaceid: string;
}

// Sample type options (duplicated from server utils to avoid importing server code in client)
const _SAMPLE_TYPES = [
  { value: 'blood', label: 'Blood' },
  { value: 'serum', label: 'Serum' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'urine', label: 'Urine' },
  { value: 'tissue', label: 'Tissue' },
  { value: 'csf', label: 'Cerebrospinal Fluid (CSF)' },
  { value: 'saliva', label: 'Saliva' },
  { value: 'stool', label: 'Stool' },
  { value: 'sputum', label: 'Sputum' },
  { value: 'swab', label: 'Swab' },
  { value: 'other', label: 'Other' },
] as const;

// Container type options
const _CONTAINER_TYPES = [
  { value: 'vacutainer_edta', label: 'Vacutainer (EDTA)' },
  { value: 'vacutainer_serum', label: 'Vacutainer (Serum)' },
  { value: 'vacutainer_heparin', label: 'Vacutainer (Heparin)' },
  { value: 'tube_plain', label: 'Plain Tube' },
  { value: 'tube_sterile', label: 'Sterile Tube' },
  { value: 'jar', label: 'Specimen Jar' },
  { value: 'container_sterile', label: 'Sterile Container' },
  { value: 'swab_transport', label: 'Swab Transport Medium' },
  { value: 'cryovial', label: 'Cryovial' },
  { value: 'other', label: 'Other' },
] as const;

// Volume unit options
const _VOLUME_UNITS = [
  { value: 'mL', label: 'mL (milliliters)' },
  { value: 'L', label: 'L (liters)' },
  { value: 'µL', label: 'µL (microliters)' },
  { value: 'g', label: 'g (grams)' },
  { value: 'mg', label: 'mg (milligrams)' },
] as const;

interface AccessioningTabProps {
  workspaceid: string;
}

interface AccessionedSample {
  sampleid: string;
  samplenumber: string;
  sampletype: string;
  containertype: string;
  collectiondate: string;
  currentstatus: string;
  barcode: string;
  accessionedat: string;
  patientid: string | null;
  patientname: string | null; // Changed from patientName to match API response
  subjectidentifier?: string | null;
  orderid: string | null;
  openehrrequestid?: string | null;
  patientage?: number;
  patientsex?: string;
  nationalid?: string | null;
  accessionnumber?: string | null;
  tests?: unknown;
  labcategory?: string | null;
  worklistid?: string | null;
  worklistname?: string | null;
  workliststatus?: string | null;
}

// Component to display tests for a sample
function SampleTestsDisplay({ sampleId, onSpecimenInfo }: { sampleId: string; onSpecimenInfo?: (info: { sampletype: string | null; containertype: string | null }) => void }) {
  const { data: sampleData, isLoading } = useQuery({
    queryKey: ["sample-tests", sampleId],
    queryFn: async () => {
      const response = await fetch(`/api/lims/samples/${sampleId}`);
      if (!response.ok) throw new Error("Failed to fetch sample");
      return response.json();
    },
  });

  // Report specimen info back to parent from first test that has it
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!sampleData?.results || reportedRef.current) return;
    const tests = sampleData.results as any[];
    const first = tests.find((t: any) => t.sampletype || t.containertype);
    if (first && onSpecimenInfo) {
      reportedRef.current = true;
      onSpecimenInfo({ sampletype: first.sampletype || null, containertype: first.containertype || null });
    }
  }, [sampleData, onSpecimenInfo]);

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading tests...</div>;
  }

  const tests = sampleData?.results || [];
  if (!tests || tests.length === 0) {
    return <div className="text-xs text-muted-foreground">No tests found</div>;
  }

  // Group tests by category
  const testsByCategory = (tests as any[]).reduce((acc: Record<string, any[]>, test: any) => {
    const category = test.testcategory || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {});

  const categories = Object.entries(testsByCategory);
  return (
    <div className={`grid gap-2 ${categories.length >= 3 ? 'grid-cols-3' : categories.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {categories.map(([category, tests]) => (
        <div key={category} className="border rounded px-2 py-1.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{category}</h4>
          <div className="space-y-0.5">
            {tests.map((test: any, index: number) => (
              <div key={index} className="text-xs px-1.5 py-1 bg-gray-50 rounded">
                <span className="font-medium">{test.testname}</span>
                {test.testcode && (
                  <span className="text-[10px] text-muted-foreground font-mono ml-1">{test.testcode}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RegisterSample({ workspaceid }: AccessioningTabProps) {
  const queryClient = useQueryClient();
  const [_showAccessionForm, setShowAccessionForm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showSampleDetail, setShowSampleDetail] = useState(false);
  const [selectedSample, setSelectedSample] = useState<AccessionedSample | null>(null);
  const [testSpecimenInfo, setTestSpecimenInfo] = useState<{ sampletype: string | null; containertype: string | null } | null>(null);
  const handleSpecimenInfo = useCallback((info: { sampletype: string | null; containertype: string | null }) => setTestSpecimenInfo(info), []);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [storageLocation, setStorageLocation] = useState('');
  const [showWorklistDialog, setShowWorklistDialog] = useState(false);
  const [showCreateWorklistDialog, setShowCreateWorklistDialog] = useState(false);
  const [showBarcodePrintDialog, setShowBarcodePrintDialog] = useState(false);
  const [selectedWorklist, setSelectedWorklist] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; item: any }>({ show: false, item: null });
  
  // Alert dialog states
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'success',
  });
  
  const [worklistFormData, setWorklistFormData] = useState({
    worklistname: '',
    laboratory: '',
    description: '',
  });
  const [accessionedSample, setAccessionedSample] = useState<{
    sampleId: string;
    sampleNumber: string;
    barcode: string;
    qrcode: string;
  } | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    sampleType: "",
    containerType: "",
    volume: "",
    volumeUnit: "",
    collectionDate: "",
    collectionTime: "",
    collectorId: "",
    collectorName: "",
    orderId: "",
    patientId: "",
    ehrId: "",
    subjectIdentifier: "",
    currentLocation: "Accessioning Desk",
    notes: "",
  });

  // Fetch accessioned samples
  const { data: samples, isLoading } = useQuery<AccessionedSample[]>({
    queryKey: ["accessioned-samples", workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/accession?workspaceid=${workspaceid}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch samples");
      const data = await response.json();
      return data.samples;
    },
  });

  // Filter samples based on search, status, and date
  const filteredSamples = samples?.filter((sample: AccessionedSample) => {
    // Search filter - matches sample number, patient name, patient ID, sample type, container
    const matchesSearch = 
      sample.samplenumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sample.patientname && sample.patientname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sample.patientid && sample.patientid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sample.sampletype.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sample.containertype && sample.containertype.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus = statusFilter === "all" || sample.currentstatus === statusFilter;

    // Date range filter - matches collection date within range
    let matchesDate = true;
    if (dateRangeStart || dateRangeEnd) {
      const sampleDate = new Date(sample.collectiondate);
      
      if (dateRangeStart) {
        const startDate = new Date(dateRangeStart);
        startDate.setHours(0, 0, 0, 0); // Start of day
        if (sampleDate < startDate) {
          matchesDate = false;
        }
      }
      
      if (dateRangeEnd && matchesDate) {
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (sampleDate > endDate) {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  const groupedSamples = filteredSamples.reduce<Record<string, AccessionedSample[]>>(
    (acc, sample) => {
      const key = sample.labcategory ? String(sample.labcategory) : "Unassigned";
      acc[key] = acc[key] || [];
      acc[key].push(sample);
      return acc;
    },
    {}
  );

  const groupKeys = Object.keys(groupedSamples).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  // Fetch existing worklists
  const { data: worklists } = useQuery({
    queryKey: ['worklists', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/worklists?workspaceid=${workspaceid}&status=pending`);
      if (!response.ok) throw new Error('Failed to fetch worklists');
      const data = await response.json();
      return data.worklists;
    },
  });

  // Use hardcoded laboratories from test catalog (same as lab order form)
  const labTypes = Object.values(LABORATORIES);

  // Fetch storage locations
  const { data: storageLocations, isLoading: locationsLoading } = useQuery<StorageLocation[]>({
    queryKey: ['storage-locations', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/storage-locations?workspaceid=${workspaceid}`);
      if (!response.ok) throw new Error('Failed to fetch storage locations');
      const data = await response.json();
      return data.locations;
    },
  });

  // Create worklist mutation
  const createWorklistMutation = useMutation({
    mutationFn: async (data: typeof worklistFormData) => {
      const response = await fetch('/api/lims/worklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worklistname: data.worklistname,
          worklisttype: 'department',
          department: data.laboratory,
          description: data.description,
          priority: 'routine',
          workspaceId: workspaceid,
        }),
      });
      if (!response.ok) throw new Error('Failed to create worklist');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      setShowCreateWorklistDialog(false);
      setWorklistFormData({ worklistname: '', laboratory: '', description: '' });
      
      // Automatically add the sample to the newly created worklist
      if (selectedSample && data.worklist) {
        addToWorklistMutation.mutate({
          worklistid: data.worklist.worklistid,
          orderid: selectedSample.orderid || selectedSample.openehrrequestid || null,
          sampleid: selectedSample.sampleid,
        });
      }
    },
  });

  // Remove from worklist mutation
  const removeFromWorklistMutation = useMutation({
    mutationFn: async ({ worklistid, worklistitemid }: { worklistid: string; worklistitemid: string }) => {
      const response = await fetch(`/api/lims/worklists/${worklistid}/items?worklistitemid=${worklistitemid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklist-items', selectedWorklist?.worklistid] });
      queryClient.invalidateQueries({ queryKey: ['accessioned-samples', workspaceid] });
      showAlert('Success', 'Sample removed from worklist successfully!', 'success');
    },
    onError: (error: Error) => {
      showAlert('Cannot Remove from Worklist', error.message, 'error');
    },
  });

  // Add to worklist mutation
  const addToWorklistMutation = useMutation({
    mutationFn: async ({ worklistid, orderid, sampleid }: { worklistid: string; orderid: string | null; sampleid: string }) => {
      const response = await fetch(`/api/lims/worklists/${worklistid}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderid, sampleid }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to worklist');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      queryClient.invalidateQueries({ queryKey: ['accessioned-samples', workspaceid] });
      setShowWorklistDialog(false);
      showAlert('Success', 'Sample added to worklist successfully!', 'success');
    },
    onError: (error: Error) => {
      showAlert('Cannot Add to Worklist', error.message, 'error');
    },
  });

  // Update sample status mutation
  const updateSampleStatusMutation = useMutation({
    mutationFn: async ({ sampleid, status, location, reason }: { sampleid: string; status: string; location: string; reason: string }) => {
      const response = await fetch(`/api/lims/accession/${sampleid}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, location, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update sample status");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessioned-samples", workspaceid] });
    },
  });

  // Accession mutation
  const accessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Combine date and time
      const collectionDateTime = data.collectionTime
        ? `${data.collectionDate}T${data.collectionTime}`
        : `${data.collectionDate}T00:00:00`;

      const response = await fetch("/api/lims/accession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          collectionDate: collectionDateTime,
          workspaceId: workspaceid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Accession error:", error);
        
        // If there are validation errors, format them nicely
        if (error.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map((e: { field: string; message: string }) => 
            `${e.field}: ${e.message}`
          ).join(", ");
          throw new Error(errorMessages);
        }
        
        throw new Error(error.error || "Failed to accession sample");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accessioned-samples", workspaceid] });
      setAccessionedSample(data.sample);
      setShowAccessionForm(false);
      setShowSuccessDialog(true);
      resetForm();
    },
  });

  // Helper function to show alerts
  const showAlert = (title: string, description: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertDialog({
      isOpen: true,
      title,
      description,
      type,
    });
  };

  const resetForm = () => {
    setFormData({
      sampleType: "",
      containerType: "",
      volume: "",
      volumeUnit: "",
      collectionDate: "",
      collectionTime: "",
      collectorId: "",
      collectorName: "",
      orderId: "",
      patientId: "",
      ehrId: "",
      subjectIdentifier: "",
      currentLocation: "Accessioning Desk",
      notes: "",
    });
  };

  const _handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    accessionMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      RECEIVED: "bg-blue-500",
      IN_STORAGE: "bg-green-500",
      IN_PROCESS: "bg-yellow-500",
      ANALYZED: "bg-purple-500",
      DISPOSED: "bg-gray-500",
      REJECTED: "bg-red-500",
    };

    return (
      <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const printBarcode = () => {
    if (!accessionedSample) return;
    // In production, this would trigger actual barcode printing
    // For now, open print dialog with barcode
    window.print();
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Collected Samples</h2>
          <p className="text-xs text-muted-foreground">
            Register and track physical samples received in the laboratory
          </p>
        </div>
      </div>

      
      {/* Filters and Search */}
      <Card className="border-gray-200 flex-shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Sample Number, Patient Name, Patient ID, Sample Type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACCESSIONED">Accessioned</SelectItem>
                  <SelectItem value="IN_STORAGE">In Storage</SelectItem>
                  <SelectItem value="IN_PROCESS">In Process</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Start */}
            <div>
              <Input
                type="date"
                placeholder="Start date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date Range End */}
            <div>
              <Input
                type="date"
                placeholder="End date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full"
                min={dateRangeStart}
              />
            </div>

            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateRangeStart("");
                  setDateRangeEnd("");
                }}
                className="w-full"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Samples List */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 flex-shrink-0 border-b">
          <CardTitle className="text-sm">Accessioned Samples ({filteredSamples.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredSamples.length > 0 ? (
            <div className="space-y-6">
              {groupKeys.map((group) => (
                <div key={group} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">
                      {group}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {groupedSamples[group].length} samples
                    </Badge>
                  </div>

                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sample Number</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Sample Type</TableHead>
                        
                          <TableHead>Collection Date</TableHead>
                          <TableHead>Patient Name</TableHead>
                          
                          <TableHead>Status</TableHead>
                          <TableHead>Worklist</TableHead>
                          <TableHead>TAT Elapsed</TableHead>
                          <TableHead>Accessioned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedSamples[group].map((sample) => (
                          <TableRow
                            key={`${group}-${sample.sampleid}`}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setSelectedSample(sample);
                              setTestSpecimenInfo(null);
                              setShowSampleDetail(true);
                            }}
                          >
                            <TableCell className="font-mono font-medium text-blue-600">
                              {sample.samplenumber}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {sample.orderid ? (
                                <span className="text-blue-600" title={sample.orderid}>
                                  ...{sample.orderid.slice(-5)}
                                </span>
                              ) : sample.openehrrequestid ? (
                                <span className="text-purple-600" title={sample.openehrrequestid}>
                                  {sample.openehrrequestid.length > 10 ? `...${sample.openehrrequestid.slice(-5)}` : sample.openehrrequestid}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="capitalize">{sample.sampletype}</TableCell>
                            
                            <TableCell className="text-sm">
                              {new Date(sample.collectiondate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {sample.patientname || sample.subjectidentifier || "Unknown"}
                            </TableCell>
                            <TableCell>{getStatusBadge(sample.currentstatus)}</TableCell>
                            <TableCell>
                              {sample.worklistname ? (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                                  {sample.worklistname}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const completedStatuses = ["ANALYZED", "DISPOSED"];
                                const isComplete = completedStatuses.includes(sample.currentstatus);
                                const tat = calculateTAT(
                                  sample.collectiondate,
                                  isComplete ? sample.accessionedat : null,
                                  "ROUTINE"
                                );
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-medium ${getTATStatusColor(tat.status)}`}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {tat.elapsedDisplay}
                                    {tat.status !== "completed" && (
                                      <span className="ml-1 opacity-70">({tat.percentUsed}%)</span>
                                    )}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(sample.accessionedat).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          ) : samples && samples.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No samples found matching your filters</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ScanBarcode className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No samples accessioned yet</p>
              <p className="text-sm">Click &quot;Accession Sample&quot; to register a new sample</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className={getDialogClasses("SMALL")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Sample Accessioned Successfully
            </DialogTitle>
            <DialogDescription>
              The sample has been registered and is ready for processing
            </DialogDescription>
          </DialogHeader>

          {accessionedSample && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Sample Number:</span>
                  <span className="text-sm font-mono">{accessionedSample.sampleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Sample ID:</span>
                  <span className="text-sm font-mono text-xs">{accessionedSample.sampleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Barcode:</span>
                  <span className="text-sm font-mono">{accessionedSample.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className="bg-blue-500 text-white">RECEIVED</Badge>
                </div>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sample Detail Dialog */}
      <Dialog open={showSampleDetail} onOpenChange={setShowSampleDetail}>
        <DialogContent className="w-[70vw] max-w-[70vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Sample Details</DialogTitle>
            <p className="text-sm text-muted-foreground font-mono">{selectedSample?.samplenumber}</p>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-1 py-0.5">
              {/* Patient & Sample Card - compact */}
              <div className="border rounded p-2">
                <div className="grid grid-cols-2 gap-3">
                  {/* Left: Patient Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{selectedSample.patientname || "Unknown Patient"}</span>
                      {getStatusBadge(selectedSample.currentstatus)}
                      {(() => {
                        const completedStatuses = ["ANALYZED", "DISPOSED"];
                        const isComplete = completedStatuses.includes(selectedSample.currentstatus);
                        const tat = calculateTAT(
                          selectedSample.collectiondate,
                          isComplete ? selectedSample.accessionedat : null,
                          "ROUTINE"
                        );
                        return (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${getTATStatusColor(tat.status)}`}>
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            {tat.elapsedDisplay}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {selectedSample.patientage && selectedSample.patientsex && (
                        <div>{selectedSample.patientage} yrs / {selectedSample.patientsex}</div>
                      )}
                      <div>NID: {selectedSample.nationalid || "-"}</div>
                      <div>Order: {selectedSample.orderid || selectedSample.openehrrequestid || "-"}</div>
                      <div>COLLECTED: {new Date(selectedSample.collectiondate).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>

                  {/* Right: Sample & Order Info */}
                  <div className="border-l pl-3">
                    <div className="text-xs space-y-0.5">
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] font-semibold">Sample Type</span>
                        <div className="font-medium capitalize">{selectedSample.sampletype || testSpecimenInfo?.sampletype || "-"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] font-semibold">Container</span>
                        <div className="font-medium capitalize">{selectedSample.containertype || testSpecimenInfo?.containertype || "-"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tests Card */}
              <div className="border rounded p-2">
                <h3 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tests</h3>
                <SampleTestsDisplay sampleId={selectedSample.sampleid} onSpecimenInfo={handleSpecimenInfo} />
              </div>

              {/* Sample Information - inline compact */}
              <div className="border rounded px-2 py-1.5 flex items-center gap-3 text-xs">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Sample</span>
                <span className="font-mono text-[11px]">{selectedSample.barcode}</span>
                {selectedSample.accessionnumber && (
                  <span className="text-muted-foreground">Accession: {selectedSample.accessionnumber}</span>
                )}
                <span className="text-muted-foreground">Accessioned: {new Date(selectedSample.accessionedat).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>


              {/* Action Buttons - right aligned like Image 2 */}
              <div className="flex justify-end gap-2 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowStorageDialog(true);
                    setShowSampleDetail(false);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Storage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!!selectedSample?.worklistname}
                  title={selectedSample?.worklistname ? `Already in worklist: ${selectedSample.worklistname}` : 'Add to worklist'}
                  onClick={() => {
                    setShowSampleDetail(false);
                    setShowWorklistDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedSample?.worklistname ? `In: ${selectedSample.worklistname}` : 'Worklist'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSampleDetail(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Storage Location Dialog */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent className={getDialogClasses("MEDIUM")}>
          <DialogHeader>
            <DialogTitle>Move Sample to Storage</DialogTitle>
            <DialogDescription>
              Update the storage location for sample {selectedSample?.samplenumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storageLocation">Storage Location *</Label>
              <Select value={storageLocation} onValueChange={setStorageLocation}>
                <SelectTrigger id="storageLocation">
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  {locationsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading storage locations...
                    </SelectItem>
                  ) : storageLocations && storageLocations.length > 0 ? (
                    storageLocations
                      .filter(location => location.status === 'active' && location.isavailable)
                      .map((location) => (
                        <SelectItem key={location.locationid} value={location.code}>
                          {location.name} ({location.code})
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No storage locations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Current Status:</strong> {selectedSample?.currentstatus}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                Moving to storage will update status to <strong>IN_STORAGE</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStorageDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!storageLocation || !selectedSample) {
                  showAlert('Validation Error', 'Please select a storage location', 'warning');
                  return;
                }
                
                updateSampleStatusMutation.mutate({
                  sampleid: selectedSample.sampleid,
                  status: 'IN_STORAGE',
                  location: storageLocation,
                  reason: `Sample moved to storage location: ${storageLocation}`,
                }, {
                  onSuccess: () => {
                    showAlert('Success', `Sample ${selectedSample.samplenumber} moved to: ${storageLocation}\nStatus updated to: IN_STORAGE`, 'success');
                    setShowStorageDialog(false);
                    setStorageLocation('');
                  },
                  onError: (error: Error) => {
                    showAlert('Error', `Failed to move sample: ${error.message}`, 'error');
                  },
                });
              }}
              disabled={!storageLocation || updateSampleStatusMutation.isPending}
            >
              {updateSampleStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Move to Storage
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Worklist Dialog */}
      <Dialog open={showWorklistDialog} onOpenChange={setShowWorklistDialog}>
        <DialogContent className={getDialogClasses("MEDIUM")}>
          <DialogHeader>
            <DialogTitle>Add Sample to Worklist</DialogTitle>
            <DialogDescription>
              Select an existing worklist or create a new one for sample {selectedSample?.samplenumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {worklists && worklists.length > 0 ? (
              <div className="space-y-2">
                <Label>Select Worklist</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {worklists.map((worklist: any) => (
                    <div
                      key={worklist.worklistid}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (selectedSample) {
                          addToWorklistMutation.mutate({
                            worklistid: worklist.worklistid,
                            orderid: selectedSample.orderid || selectedSample.openehrrequestid || null,
                            sampleid: selectedSample.sampleid,
                          });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{worklist.worklistname}</div>
                          <div className="text-sm text-gray-600">
                            {worklist.department} • {worklist.itemCount || 0} items
                          </div>
                        </div>
                        <Badge>{worklist.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No active worklists available</p>
              </div>
            )}

            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowWorklistDialog(false);
                  setShowCreateWorklistDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Worklist
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorklistDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Worklist Dialog */}
      <Dialog open={showCreateWorklistDialog} onOpenChange={setShowCreateWorklistDialog}>
        <DialogContent className={getDialogClasses("MEDIUM")}>
          <DialogHeader>
            <DialogTitle>Create New Worklist</DialogTitle>
            <DialogDescription>
              Create a new worklist for organizing samples by laboratory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worklistname">Worklist Name *</Label>
              <Input
                id="worklistname"
                placeholder="e.g., Hematology Morning Batch"
                value={worklistFormData.worklistname}
                onChange={(e) => setWorklistFormData({ ...worklistFormData, worklistname: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laboratory">Laboratory/Department *</Label>
              <Select
                value={worklistFormData.laboratory}
                onValueChange={(value) => setWorklistFormData({ ...worklistFormData, laboratory: value })}
              >
                <SelectTrigger id="laboratory">
                  <SelectValue placeholder="Select laboratory" />
                </SelectTrigger>
                <SelectContent>
                  {labTypes.map((lab) => (
                    <SelectItem key={lab.id} value={lab.name}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this worklist"
                value={worklistFormData.description}
                onChange={(e) => setWorklistFormData({ ...worklistFormData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWorklistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!worklistFormData.worklistname || !worklistFormData.laboratory) {
                  showAlert('Validation Error', 'Please fill in required fields', 'warning');
                  return;
                }
                createWorklistMutation.mutate(worklistFormData);
              }}
              disabled={createWorklistMutation.isPending}
            >
              {createWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Worklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Print Dialog */}
      <Dialog open={showBarcodePrintDialog} onOpenChange={setShowBarcodePrintDialog}>
        <DialogContent className={getDialogClasses("SMALL")}>
          <DialogHeader>
            <DialogTitle>Print Barcode Label</DialogTitle>
            <DialogDescription>
              Preview and print barcode label for sample {selectedSample?.samplenumber}
            </DialogDescription>
          </DialogHeader>

          {selectedSample && (
            <BarcodePrint
              barcode={selectedSample.barcode}
              sampleNumber={selectedSample.samplenumber}
              patientName={selectedSample.patientname || selectedSample.patientid || "Unknown"}
              collectionDate={selectedSample.collectiondate}
              sampleType={selectedSample.sampletype}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodePrintDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(open) => setDeleteConfirm({ show: open, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sample from Worklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteConfirm.item?.samplenumber}</strong> from this worklist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ show: false, item: null })}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteConfirm.item && selectedWorklist) {
                  removeFromWorklistMutation.mutate({
                    worklistid: selectedWorklist.worklistid,
                    worklistitemid: deleteConfirm.item.worklistitemid,
                  });
                  setDeleteConfirm({ show: false, item: null });
                }
              }}
              disabled={removeFromWorklistMutation.isPending}
            >
              {removeFromWorklistMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={alertDialog.type === 'error' ? 'text-red-600' : alertDialog.type === 'warning' ? 'text-yellow-600' : 'text-green-600'}>
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

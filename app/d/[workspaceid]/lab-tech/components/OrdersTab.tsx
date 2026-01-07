/**
 * Orders Tab Component - LIMS Order Entry Module
 * - Create lab test orders with multi-select tests
 * - Validate against test catalog
 * - Support patient and research orders
 * - Role-based access control
 * - openEHR integration
 */
"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { limsOrders, ORDER_STATUS } from "@/lib/db/tables/lims-order";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Download, CheckCircle2, Clock, AlertCircle, Loader2, Plus, XCircle, FlaskConical } from "lucide-react";
import EnhancedLabOrderForm from "@/components/shared/EnhancedLabOrderForm";
import { useSession } from "next-auth/react";

interface ValidationError {
  field: string;
  message: string;
}

interface SampleData {
  sampleType: string;
  containerType: string;
  volume: string | number;
  volumeUnit: string;
  collectionDate: string;
  collectorName: string | undefined;
  currentLocation: string;
  notes?: string;
  orderId?: string;
  patientId?: string;
  ehrId?: string;
  subjectIdentifier?: string;
  workspaceId?: string;
}

interface OrderFormData {
  patientId: string;
  selected_tests?: string[];
  testCodes?: string[];
  priority: string;
  urgency?: string;
  clinicalIndication?: string;
  clinical_indication?: string;
  narrative?: string;
  orderingProviderName?: string;
  fastingRequired?: boolean;
}

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  dateofbirth: string;
  mrn?: string;
  name?: string;
  nationalid?: string;
}

interface LimsOrder {
  // Core LIMS properties
  orderid: string;
  subjecttype: string;
  subjectidentifier: string;
  encounterid: string | null;
  studyprotocolid: string | null;
  priority: string;
  status: string;
  orderingprovidername: string | null;
  clinicalindication: string | null;
  createdat: string;
  tests?: Array<{
    testCode: string;
    testName: string;
    material?: string;
  }>;
  
  // OpenEHR integration properties
  source?: string;
  composition_uid?: string;
  request_id?: string;
  patientId?: string;
  patientName?: string;
  service_name?: string;
  clinical_indication?: string;
  clinicalnotes?: string;
  urgency?: string;
  requesting_provider?: string;
  recorded_time?: string;
  ehrid?: string;
  openEhr?: any;
  
  // Aliases for compatibility
  orderId?: string;
  createdAt?: string;
}

interface TestCatalogItem {
  testid: string;
  testcode: string;
  testname: string;
  testcategory: string;
  testdescription: string | null;
  specimentype: string;
  fastingrequired: boolean;
  turnaroundtime: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}


export default function OrdersTab({ workspaceid }: { workspaceid: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<LimsOrder | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LimsOrder | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showSampleCollection, setShowSampleCollection] = useState(false);
  const [sampleCollectionData, setSampleCollectionData] = useState({
    sampleType: '',
    containerType: '',
    volume: '',
    volumeUnit: 'mL',
    collectionDate: new Date().toISOString().slice(0, 16),
    collectorName: session?.user?.name || '',
    currentLocation: 'Laboratory',
  });
  const [currentPatientId, setCurrentPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Update collector name when session loads
  useEffect(() => {
    if (session?.user?.name) {
      setSampleCollectionData(prev => ({
        ...prev,
        collectorName: session.user.name || '',
      }));
    }
  }, [session]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(patientSearchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [patientSearchTerm]);

  // Fetch patients for search
  const { data: patientsData } = useQuery({
    queryKey: ['patients', workspaceid, debouncedSearchTerm],
    queryFn: async () => {
      const response = await fetch(`/api/d/${workspaceid}/patients?search=${debouncedSearchTerm}`);
      if (!response.ok) return { patients: [] };
      return response.json();
    },
    enabled: isModalOpen && debouncedSearchTerm.length > 1,
  });

  const patients = patientsData?.patients || [];

  // Fetch user session
  const { data: sessionData, isLoading: isLoadingSession, error: sessionError } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      console.log("Session data loaded:", data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Keep session data fresh for 5 minutes
    retry: 3,
  });

  // Fetch all orders (both local and openEHR)
  const { data, isLoading, error } = useQuery({
    queryKey: ['lims-orders', workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/orders?workspaceid=${workspaceid}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  // Mutation for creating accession samples
  const createSampleMutation = useMutation({
    mutationFn: async (sampleData: SampleData) => {
      const response = await fetch('/api/lims/accession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create sample');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Sample created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['lims-accession', workspaceid] });
      queryClient.invalidateQueries({ queryKey: ['lims-orders', workspaceid] });
      setShowSampleCollection(false);
      setShowOrderDetail(false);
      // Show success message
      alert(`Sample collected successfully!\n\nSample Number: ${data.sample.sampleNumber}\nBarcode: ${data.sample.barcode}\n\nOrder status updated to IN PROGRESS`);
    },
    onError: (error: Error) => {
      console.error('Sample creation error:', error);
      alert(`Failed to collect sample: ${error.message}`);
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (requestBody: OrderFormData) => {
      // The requestBody is already transformed by handleSubmitOrder
      console.log("Mutation received request body:", requestBody);
      
      const response = await fetch('/api/lims/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      console.log("API response:", { status: response.status, data });
      
      if (!response.ok) {
        console.error("Order creation failed:", {
          status: response.status,
          error: data.error,
          errors: data.errors,
          fullResponse: data
        });
        throw data;
      }
      
      return data;
    },
    onSuccess: (data) => {
      setCreatedOrder(data);
      setIsModalOpen(false);
      setShowOrderForm(false);
      setIsSuccessModalOpen(true);
      setValidationErrors([]);
      setCurrentPatientId('');
      setSelectedPatient(null);
      setPatientSearchTerm('');
      queryClient.invalidateQueries({ queryKey: ['lims-orders', workspaceid] });
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error);
      if (error.errors) {
        setValidationErrors(error.errors);
      } else {
        setValidationErrors([{ field: 'general', message: error.error || error.message || 'Failed to create order' }]);
      }
    },
  });

  const handleSubmitOrder = async (formData: OrderFormData) => {
    if (!currentPatientId) {
      alert("Please enter a patient ID first");
      return;
    }
    
    // Check if session is loaded
    if (!sessionData?.user) {
      alert("Session not loaded. Please wait a moment and try again.");
      return;
    }
    
    // Fetch patient to get EHR ID
    let patientEhrId = null;
    try {
      const patientResponse = await fetch(`/api/d/${workspaceid}/patients/${currentPatientId}`);
      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        patientEhrId = patientData.patient?.ehrid || null;
      } else if (patientResponse.status === 403) {
        console.warn("Permission denied to fetch patient details. Order will be created without openEHR integration.");
      } else {
        console.warn(`Failed to fetch patient details (${patientResponse.status}). Order will be created without openEHR integration.`);
      }
    } catch (error) {
      console.warn("Could not fetch patient EHR ID:", error);
    }
    
    // Transform enhanced form data to API format
    // The enhanced form provides selected_tests as test IDs, we need to convert to test codes
    const { INDIVIDUAL_TESTS } = await import("@/lib/test-catalog");
    const testCodes = formData.selected_tests?.map((testId: string) => {
      const test = INDIVIDUAL_TESTS[testId];
      return test?.code || testId;
    }) || [];
    
    // Handle urgency - convert to uppercase if it's a string, otherwise default to ROUTINE
    let priority = 'ROUTINE';
    if (formData.urgency) {
      priority = typeof formData.urgency === 'string' ? formData.urgency.toUpperCase() : 'ROUTINE';
    }
    
    const apiFormData: any = {
      subjectType: 'patient',
      subjectIdentifier: currentPatientId,
      encounterId: `ENC-${Date.now()}`,
      requestedTests: testCodes,
      priority: priority,
      orderingProviderId: sessionData.user.id,
      orderingProviderName: sessionData.user.name || sessionData.user.email || 'Unknown Provider',
      clinicalIndication: formData.clinical_indication || '',
      clinicalNotes: formData.narrative || '',
      sourceSystem: 'LIMS_UI',
      workspaceId: workspaceid,
    };
    
    // Only include ehrId if patient has one
    if (patientEhrId) {
      apiFormData.ehrId = patientEhrId;
    }
    
    console.log('Transformed form data for API:', apiFormData);
    
    await createOrderMutation.mutateAsync(apiFormData);
  };


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return <Badge variant="destructive" className="bg-red-600">STAT</Badge>;
      case 'URGENT':
        return <Badge variant="destructive" className="bg-orange-600">Urgent</Badge>;
      case 'ASAP':
        return <Badge className="bg-yellow-600">ASAP</Badge>;
      default:
        return <Badge variant="outline">Routine</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <Badge variant="secondary">Requested</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-blue-600">Accepted</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-purple-600">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const orders: LimsOrder[] = data?.orders || [];

  const filteredOrders = orders.filter((order: LimsOrder) => {
    // Handle both local and openEHR orders
    const orderId = order.orderid || order.composition_uid || order.request_id || '';
    const subjectId = order.subjectidentifier || order.patientId || '';
    const providerName = order.orderingprovidername || order.requesting_provider || '';
    const serviceName = order.service_name || '';
    
    const matchesSearch = 
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map openEHR urgency to status for filtering
    const orderStatus = order.source === 'openEHR' ? 'REQUESTED' : order.status;
    const matchesStatus = statusFilter === 'all' || orderStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lab Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage incoming lab test orders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-gray-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setValidationErrors([]);
              setCurrentPatientId('');
              setPatientSearchTerm('');
              setSelectedPatient(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Patient</DialogTitle>
                <DialogDescription>
                  Search for a patient by name or ID to create a lab order
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors.map((err, idx) => (
                        <div key={idx} className="text-sm">{err.message}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Search Input */}
                <div>
                  <Label htmlFor="patientSearch" className="text-sm font-medium">Search Patient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="patientSearch"
                      type="text"
                      className="w-full mt-1 pl-10"
                      placeholder="Search by name or ID..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Patient List */}
                {patientSearchTerm.length > 0 && (
                  <div className="border rounded-md max-h-[300px] overflow-y-auto bg-white shadow-sm">
                    {patients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No patients found
                      </div>
                    ) : (
                      <div>
                        {patients.map((patient: Patient) => (
                          <div
                            key={patient.patientid}
                            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0 ${
                              selectedPatient?.patientid === patient.patientid ? 'bg-blue-50' : 'bg-white'
                            }`}
                            onClick={() => {
                              setSelectedPatient(patient);
                              setCurrentPatientId(patient.patientid);
                            }}
                          >
                            <div className="font-medium text-sm uppercase tracking-wide">
                              {patient.name || patient.firstname + ' ' + patient.lastname || 'Unknown Patient'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {patient.nationalid || patient.patientid?.substring(0, 15) || 'No ID'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Patient Display */}
                {selectedPatient && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-sm font-medium text-blue-900">Selected Patient</div>
                    <div className="mt-1">
                      <div className="font-semibold">{selectedPatient.name}</div>
                      <div className="text-sm text-gray-600">ID: {selectedPatient.patientid}</div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setPatientSearchTerm('');
                    setSelectedPatient(null);
                    setCurrentPatientId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={() => {
                    if (selectedPatient && currentPatientId) {
                      setIsModalOpen(false);
                      setTimeout(() => setShowOrderForm(true), 100);
                    } else {
                      alert('Please select a patient from the search results');
                    }
                  }}
                  disabled={!selectedPatient}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Enhanced Order Form Modal */}
          <EnhancedLabOrderForm
            open={showOrderForm}
            onOpenChange={setShowOrderForm}
            onSubmit={handleSubmitOrder}
            patientId={currentPatientId}
            patientName={selectedPatient ? `${selectedPatient.firstname} ${selectedPatient.lastname}` : undefined}
          />
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-gray-200">
        <CardContent className="">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, test type, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="REQUESTED">Requested</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
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

      {/* Orders Table */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Orders ({filteredOrders.length})
            </CardTitle>
            {filteredOrders.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">Loading orders...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive">Error loading orders. Please try again.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Patient</TableHead>
                    <TableHead className="font-semibold">Test/Service</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Provider</TableHead>
                    <TableHead className="font-semibold">Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Clock className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-gray-900">
                            {orders.length === 0 
                              ? "No lab orders found"
                              : "No orders match your filters"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {orders.length === 0 
                              ? "Create a new order to get started."
                              : "Try adjusting your search or filters."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order: LimsOrder) => {
                      const isOpenEHR = order.source === 'openEHR';
                      const orderId = order.orderid || order.composition_uid || order.request_id || '';
                      const displayId = orderId.length > 12 ? orderId.substring(0, 12) + '...' : orderId;
                      const patientInfo = order.patientName || order.subjectidentifier;
                      const testInfo = isOpenEHR ? order.service_name : (order.tests?.map((t: any) => t.testName).join(', ') || 'N/A');
                      const priority = isOpenEHR ? order.urgency?.toUpperCase() : order.priority;
                      const status = isOpenEHR ? 'REQUESTED' : order.status;
                      const provider = isOpenEHR ? order.requesting_provider : order.orderingprovidername;
                      const orderDate = isOpenEHR ? order.recorded_time : order.createdat;
                      
                      return (
                        <TableRow 
                          key={orderId} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetail(true);
                          }}
                        >
                          <TableCell className="font-medium text-blue-600">
                            {displayId}
                          </TableCell>
                          <TableCell className="font-medium">
                            {patientInfo || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-sm" title={testInfo}>
                              {testInfo}
                            </div>
                          </TableCell>
                          <TableCell>
                            {priority === 'URGENT' || priority === 'urgent' ? (
                              <Badge variant="destructive" className="bg-orange-600">Urgent</Badge>
                            ) : priority === 'STAT' ? (
                              <Badge variant="destructive" className="bg-red-600">STAT</Badge>
                            ) : (
                              <Badge variant="outline">Routine</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {provider || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {orderDate ? new Date(orderDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Order Created Successfully
            </DialogTitle>
            <DialogDescription>
              Your lab test order has been created and is now in the system.
            </DialogDescription>
          </DialogHeader>
          {createdOrder && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-900 mb-1">Order ID</div>
                <div className="text-lg font-mono font-semibold text-green-700">
                  {createdOrder.orderId}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="mt-1">{getStatusBadge(createdOrder.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Created At</div>
                  <div className="text-sm mt-1">{new Date(createdOrder.createdAt || createdOrder.createdat).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Requested Tests</div>
                <div className="space-y-1">
                  {createdOrder.tests?.map((test: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                      <FlaskConical className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{test.testName}</span>
                      <span className="text-gray-500">({test.testCode})</span>
                    </div>
                  ))}
                </div>
              </div>

              {createdOrder.openEhr && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1">openEHR Integration</div>
                  <div className="text-xs text-blue-700 font-mono">
                    EHR ID: {createdOrder.openEhr.ehrId}<br />
                    Composition: {createdOrder.openEhr.compositionUid}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setIsSuccessModalOpen(false)}
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-blue-600" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this laboratory order
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 py-4">
              {/* Order ID and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">Order ID</div>
                  <div className="text-lg font-mono font-semibold text-blue-700">
                    {selectedOrder.orderid || selectedOrder.composition_uid || selectedOrder.request_id || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">Status</div>
                  <div className="mt-1">
                    {getStatusBadge(selectedOrder.source === 'openEHR' ? 'REQUESTED' : selectedOrder.status)}
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Patient</div>
                    <div className="text-sm mt-1 font-medium">
                      {selectedOrder.patientName || selectedOrder.subjectidentifier || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Patient ID</div>
                    <div className="text-sm mt-1 font-mono">
                      {selectedOrder.subjectidentifier || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">Requested Tests</h3>
                <div className="space-y-2">
                  {selectedOrder.source === 'openEHR' ? (
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                      <FlaskConical className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium">{selectedOrder.service_name}</div>
                        {selectedOrder.clinical_indication && (
                          <div className="text-xs text-gray-600 mt-1">
                            Indication: {selectedOrder.clinical_indication}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    selectedOrder.tests?.map((test: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                        <FlaskConical className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">{test.testName}</div>
                          <div className="text-xs text-gray-600">Code: {test.testCode}</div>
                        </div>
                        {test.fastingRequired && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Fasting Required
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">Order Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Priority</div>
                    <div className="mt-1">
                      {getPriorityBadge(selectedOrder.source === 'openEHR'
                        ? selectedOrder.urgency?.toUpperCase() || 'ROUTINE'
                        : selectedOrder.priority || 'ROUTINE')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Ordering Provider</div>
                    <div className="text-sm mt-1">
                      {selectedOrder.source === 'openEHR' 
                        ? selectedOrder.requesting_provider 
                        : selectedOrder.orderingprovidername || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                    <div className="text-sm mt-1">
                      {(selectedOrder.source === 'openEHR'
                        ? selectedOrder.recorded_time || selectedOrder.createdat
                        : selectedOrder.createdat) ? new Date(selectedOrder.source === 'openEHR'
                        ? selectedOrder.recorded_time || selectedOrder.createdat
                        : selectedOrder.createdat).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  {selectedOrder.encounterid && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Encounter ID</div>
                      <div className="text-sm mt-1 font-mono">{selectedOrder.encounterid}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Information */}
              {(selectedOrder.clinicalindication || selectedOrder.clinicalnotes) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">Clinical Information</h3>
                  {selectedOrder.clinicalindication && (
                    <div className="mb-2">
                      <div className="text-sm font-medium text-muted-foreground">Clinical Indication</div>
                      <div className="text-sm mt-1">{selectedOrder.clinicalindication}</div>
                    </div>
                  )}
                  {selectedOrder.clinicalnotes && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Clinical Notes</div>
                      <div className="text-sm mt-1">{selectedOrder.clinicalnotes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Fasting Requirements Alert */}
              {selectedOrder.tests?.some((t: any) => t.fastingRequired) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-semibold text-sm">⚠️ Fasting Required</span>
                  </div>
                  <p className="text-sm text-amber-800 mt-1">
                    Some tests in this order require fasting (8-12 hours). Ensure patient has fasted before sample collection.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowOrderDetail(false)}
            >
              Close
            </Button>
            <Button 
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setShowOrderDetail(false);
                setShowSampleCollection(true);
                // Pre-fill sample type based on tests
                if (selectedOrder?.tests && selectedOrder.tests.length > 0) {
                  const firstTest = selectedOrder.tests[0];
                  setSampleCollectionData(prev => ({
                    ...prev,
                    sampleType: firstTest.material || 'Blood',
                  }));
                }
              }}
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Collect Samples
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sample Collection Modal */}
      <Dialog open={showSampleCollection} onOpenChange={setShowSampleCollection}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-green-600" />
              Collect Sample
            </DialogTitle>
            <DialogDescription>
              Register and collect sample for this order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-4">
              {/* Order Info Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900 mb-1">Order Information</div>
                <div className="text-sm text-blue-700">
                  <div>Order ID: {selectedOrder.orderid || selectedOrder.request_id}</div>
                  <div>Patient: {selectedOrder.patientName || selectedOrder.subjectidentifier}</div>
                  <div>Tests: {selectedOrder.source === 'openEHR' 
                    ? selectedOrder.service_name 
                    : selectedOrder.tests?.map((t: any) => t.testName).join(', ')}</div>
                </div>
              </div>

              {/* Sample Collection Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sampleType">Sample Type *</Label>
                    <select
                      id="sampleType"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={sampleCollectionData.sampleType}
                      onChange={(e) => setSampleCollectionData(prev => ({ ...prev, sampleType: e.target.value }))}
                    >
                      <option value="">Select type</option>
                      <option value="Blood">Blood</option>
                      <option value="Urine">Urine</option>
                      <option value="Serum">Serum</option>
                      <option value="Plasma">Plasma</option>
                      <option value="Sputum">Sputum</option>
                      <option value="Stool">Stool</option>
                      <option value="Tissue">Tissue</option>
                      <option value="CSF">CSF (Cerebrospinal Fluid)</option>
                      <option value="Swab">Swab</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="containerType">Container Type *</Label>
                    <select
                      id="containerType"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={sampleCollectionData.containerType}
                      onChange={(e) => setSampleCollectionData(prev => ({ ...prev, containerType: e.target.value }))}
                    >
                      <option value="">Select container</option>
                      <option value="Vacutainer">Vacutainer (Blood)</option>
                      <option value="EDTA Tube">EDTA Tube (Purple)</option>
                      <option value="Serum Tube">Serum Tube (Red)</option>
                      <option value="Heparin Tube">Heparin Tube (Green)</option>
                      <option value="Urine Container">Urine Container</option>
                      <option value="Sterile Container">Sterile Container</option>
                      <option value="Culture Bottle">Culture Bottle</option>
                      <option value="Swab Tube">Swab Tube</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="volume">Volume</Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 5.0"
                      value={sampleCollectionData.volume}
                      onChange={(e) => setSampleCollectionData(prev => ({ ...prev, volume: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="volumeUnit">Volume Unit</Label>
                    <select
                      id="volumeUnit"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      value={sampleCollectionData.volumeUnit}
                      onChange={(e) => setSampleCollectionData(prev => ({ ...prev, volumeUnit: e.target.value }))}
                    >
                      <option value="mL">mL</option>
                      <option value="L">L</option>
                      <option value="μL">μL</option>
                      <option value="g">g (grams)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="collectionDate">Collection Date & Time *</Label>
                  <Input
                    id="collectionDate"
                    type="datetime-local"
                    value={sampleCollectionData.collectionDate}
                    onChange={(e) => setSampleCollectionData(prev => ({ ...prev, collectionDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="collectorName">Collector Name (Auto-filled)</Label>
                  <Input
                    id="collectorName"
                    type="text"
                    value={sampleCollectionData.collectorName}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    title="Automatically filled from your user profile"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically filled from your user profile</p>
                </div>

                <div>
                  <Label htmlFor="currentLocation">Current Location (Auto-filled)</Label>
                  <Input
                    id="currentLocation"
                    type="text"
                    value={sampleCollectionData.currentLocation}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    title="Automatically filled from your workplace"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically filled from your workplace</p>
                </div>
              </div>

              {/* Fasting Warning if applicable */}
              {selectedOrder.tests?.some((t: any) => t.fastingRequired) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-semibold text-sm">⚠️ Fasting Required</span>
                  </div>
                  <p className="text-sm text-amber-800 mt-1">
                    Verify that the patient has fasted for 8-12 hours before collecting this sample.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowSampleCollection(false)}
              disabled={createSampleMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={createSampleMutation.isPending || !sampleCollectionData.sampleType || !sampleCollectionData.containerType}
              onClick={() => {
                if (!selectedOrder) return;

                const sampleData = {
                  sampleType: sampleCollectionData.sampleType,
                  containerType: sampleCollectionData.containerType,
                  volume: sampleCollectionData.volume ? parseFloat(sampleCollectionData.volume) : 0,
                  volumeUnit: sampleCollectionData.volumeUnit,
                  collectionDate: new Date(sampleCollectionData.collectionDate).toISOString(),
                  collectorName: sampleCollectionData.collectorName || undefined,
                  orderId: selectedOrder.orderid || selectedOrder.request_id || selectedOrder.composition_uid,
                  patientId: selectedOrder.subjectidentifier || undefined,
                  ehrId: selectedOrder.ehrid || undefined,
                  subjectIdentifier: selectedOrder.subjectidentifier || undefined,
                  workspaceId: workspaceid,
                  currentLocation: sampleCollectionData.currentLocation,
                };

                console.log('Creating sample with data:', sampleData);
                createSampleMutation.mutate(sampleData);
              }}
            >
              {createSampleMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Collect & Register Sample
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

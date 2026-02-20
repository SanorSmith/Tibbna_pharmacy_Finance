/**
 * Orders Tab Component - LIMS Order Entry Module
 * - Create lab test orders with multi-select tests
 * - Validate against test catalog
 * - Support patient and research orders
 * - Role-based access control
 * - openEHR integration
 */
"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSampleRecommendations, getRecommendationsByServiceName, findRecommendation } from "@/lib/lims/test-recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDialogClasses } from "@/lib/ui-constants";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  XCircle,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import EnhancedLabOrderFormMultiple from "@/components/shared/EnhancedLabOrderFormMultiple";
import { calculateTAT, getTATStatusColor } from "@/lib/lims/tat-tracking";
import { useSession } from "next-auth/react";

type PatientCreatePayload = {
  firstname: string;
  middlename: string;
  lastname: string;
  nationalid?: string;
  dateofbirth?: string;
  gender?: string;
  phone?: string;
};

interface ValidationError {
  field: string;
  message: string;
}

interface SampleData {
  collectionDate: string;
  accessionNumber?: string;
  labCategory?: string;
  sampleNumber?: string;
  collectorName?: string;
  orderId?: string;
  patientId?: string;
  ehrId?: string;
  subjectIdentifier?: string;
  workspaceId: string;
  currentLocation: string;
  sampleType?: string;
  tests: string[];
  comments?: string;
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
  middlename: string;
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
  }>;
  
  // Additional properties
  patientName?: string;
  patientId?: string;
  patientage?: string;
  patientsex?: string;
  clinicalnotes?: string;
  testCodes: string[];
  test_category?: string;
  source: "local" | "openEHR";
  openEhr?: any;
  sampleRecommendations?: any;
  openehrrequestid?: string;
  recorded_time?: string;
  createdAt?: string;
  orderId?: string;
  requestingProvider?: string;
  receivingProvider?: string;
  urgency?: string;
  clinicalIndication?: string;
  clinical_indication?: string;

  // Aliases for compatibility
  order_id?: string;
  request_id?: string;
  composition_uid?: string;
  ehrid?: string;
  service_name?: string;
  description?: string;
  requesting_provider?: string;
  receiving_provider?: string;
  narrative?: string;
  is_package?: boolean;
  target_lab?: string;

  // Cancellation details (local LIMS orders)
  cancelledat?: string | null;
  cancelledby?: string | null;
  cancelledbyname?: string | null;
  cancellationreason?: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

interface Test {
  testcategory: string;
  testdescription: string | null;
  specimentype: string;
  fastingrequired: boolean;
  turnaroundtime: string | null;
}

export default function OrdersTab({ workspaceid }: { workspaceid: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<LimsOrder | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [selectedOrder, setSelectedOrder] = useState<LimsOrder | null>(null);
  const [openEHROrderStatus, setOpenEHROrderStatus] =
    useState<string>("REQUESTED");
  const [openEHROrderStatuses, setOpenEHROrderStatuses] = useState<
    Map<string, string>
  >(new Map());
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showSampleCollection, setShowSampleCollection] = useState(false);
  const [collectSampleInOrderDetail, setCollectSampleInOrderDetail] =
    useState(false);
  const [sampleCollectionData, setSampleCollectionData] = useState({
    sampleNumber: "", // Manual entry or auto-generated
    accessionNumber: "", // Scanned/manual accession number
    collectionDate: new Date().toISOString().slice(0, 16),
    collectorName: session?.user?.name || "",
    currentLocation: "Laboratory",
    specimenType: "", // Selected specimen type for this sample
  });
  const [sampleComments, setSampleComments] = useState("");
  const [collectedSpecimenTypes, setCollectedSpecimenTypes] = useState<Record<string, { sampleNumber: string; accessionNumber: string }>>({});
  const [currentCollectingSpecimen, setCurrentCollectingSpecimen] = useState<string>("");
  const [selectedTestForCollection, setSelectedTestForCollection] = useState<string | null>(null);

  const [currentPatientId, setCurrentPatientId] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showRegisterPatientDialog, setShowRegisterPatientDialog] = useState(false);
  const [registerPatientForm, setRegisterPatientForm] = useState<PatientCreatePayload>({
    firstname: "",
    middlename:"",
    lastname: "",
    nationalid: "",
    dateofbirth: "",
    gender: "",
    phone: "",
  });
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "success" | "error" | "warning";
  }>({ show: false, title: "", message: "" });

  // Query to check if selected order already has samples collected
  const { data: orderSamples } = useQuery({
    queryKey: ['order-samples', selectedOrder?.orderid || selectedOrder?.request_id || selectedOrder?.composition_uid],
    queryFn: async () => {
      if (!selectedOrder) return null;
      const orderId = selectedOrder.orderid || selectedOrder.request_id || selectedOrder.composition_uid;
      if (!orderId) return null;
      
      const response = await fetch(`/api/lims/accession?workspaceid=${workspaceid}&orderid=${orderId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.samples || [];
    },
    enabled: !!selectedOrder,
  });

  const createPatientMutation = useMutation({
    mutationFn: async (payload: PatientCreatePayload) => {
      const res = await fetch(`/api/d/${workspaceid}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to register patient");
      }
      return data as { patient: Patient };
    },
    onSuccess: async (data) => {
      const patient = data.patient;
      setSelectedPatient(patient);
      setCurrentPatientId(patient.patientid);
      setShowRegisterPatientDialog(false);
      setRegisterPatientForm({
        firstname: "",
        middlename:"",
        lastname: "",
        nationalid: "",
        dateofbirth: "",
        gender: "",
        phone: "",
      });
      await queryClient.invalidateQueries({
        queryKey: ["patients", workspaceid, debouncedSearchTerm],
      });
      setAlertDialog({
        show: true,
        title: "Patient Registered",
        message: "Patient created successfully and selected for this order.",
        type: "success",
      });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to register patient";
      setAlertDialog({
        show: true,
        title: "Registration Failed",
        message: msg,
        type: "error",
      });
    },
  });

  // Update collector name when session loads
  useEffect(() => {
    if (session?.user?.name) {
      setSampleCollectionData((prev) => ({
        ...prev,
        collectorName: session.user.name || "",
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
    queryKey: ["patients", workspaceid, debouncedSearchTerm],
    queryFn: async () => {
      const response = await fetch(
        `/api/d/${workspaceid}/patients?search=${debouncedSearchTerm}`
      );
      if (!response.ok) return { patients: [] };
      return response.json();
    },
    enabled: isModalOpen && debouncedSearchTerm.length > 1,
  });

  const patients = patientsData?.patients || [];

  // Fetch test catalog from DB to get sampleType/containerType for all tests
  const { data: testCatalogData } = useQuery({
    queryKey: ["test-catalog", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/test-catalog?workspaceid=${workspaceid}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Build lookup: test name (lowercase) → { sampleType, containerType }
  const testCatalogLookup = (() => {
    const lookup: Record<string, { sampleType: string; containerType: string; testCode: string }> = {};
    if (testCatalogData?.individualTests) {
      Object.values(testCatalogData.individualTests).forEach((t: any) => {
        if (t?.name) {
          lookup[t.name.toLowerCase()] = {
            sampleType: t.sampleType || t.material || "",
            containerType: t.containerType || "",
            testCode: t.code || t.id || "",
          };
        }
      });
    }
    return lookup;
  })();

  // Resolve specimen info from DB catalog, falling back to static findRecommendation
  const resolveSpecimenFromCatalog = (testCode?: string, testName?: string) => {
    // Try catalog lookup by name first (most reliable for openEHR orders)
    if (testName && testCatalogLookup[testName.toLowerCase()]) {
      const cat = testCatalogLookup[testName.toLowerCase()];
      return { sampleType: cat.sampleType, containerType: cat.containerType, testCode: cat.testCode };
    }
    // Try catalog lookup by code
    if (testCode) {
      const byCode = Object.values(testCatalogLookup).find(
        (c: any) => c.testCode && c.testCode.toLowerCase() === testCode.toLowerCase()
      );
      if (byCode) return { sampleType: byCode.sampleType, containerType: byCode.containerType, testCode: byCode.testCode };
    }
    // Fallback to static recommendations
    const rec = findRecommendation(testCode, testName);
    if (rec) return { sampleType: rec.sampleType, containerType: rec.containerType, testCode: rec.testCode };
    return null;
  };

  // Fetch user session
  const { data: sessionData } = useQuery({
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lims-orders", workspaceid],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/lims/orders?workspaceid=${workspaceid}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Orders API error ${response.status}:`, errorText);
          throw new Error(`Failed to fetch orders (${response.status})`);
        }
        
        return response.json();
      } catch (error) {
        console.error('Orders fetch error:', error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 4xx errors
      if (failureCount < 3 && error instanceof Error && !error.message.includes('401') && !error.message.includes('403')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 0, // Always refetch on invalidation to ensure status updates are visible
  });

  // Mutation for creating accession samples
  const createSampleMutation = useMutation({
    mutationFn: async (sampleData: SampleData) => {
      const response = await fetch("/api/lims/accession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleData),
      });

      if (!response.ok) {
        const error = await response.json();
        // Use the detailed message if available, otherwise use the error field
        const errorMessage = error.message || error.error || "Failed to create sample";
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Sample created successfully:", data);
      queryClient.invalidateQueries({
        queryKey: ["lims-accession", workspaceid],
      });
      queryClient.invalidateQueries({ queryKey: ["lims-orders", workspaceid] });

      if (currentCollectingSpecimen) {
        // Multi-specimen mode: track collected specimen, don't close modal yet
        setCollectedSpecimenTypes(prev => ({
          ...prev,
          [currentCollectingSpecimen]: {
            sampleNumber: data.sample.sampleNumber,
            accessionNumber: data.sample.accessionNumber || "-",
          }
        }));
        setCurrentCollectingSpecimen("");
        // Reset sample number for next specimen
        setSampleCollectionData(prev => ({ ...prev, sampleNumber: "" }));
      } else {
        // Legacy mode (from separate Sample Collection modal): close both modals
        setShowSampleCollection(false);
        setShowOrderDetail(false);
        setAlertDialog({
          show: true,
          title: "Sample Collected Successfully",
          message: `Sample Number: ${data.sample.sampleNumber}\nAccession Number: ${data.sample.accessionNumber || "-"}\nBarcode: ${data.sample.barcode}\n\nOrder status updated to IN PROGRESS`,
          type: "success",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Sample creation error:", error);
      setAlertDialog({
        show: true,
        title: "Failed to Collect Sample",
        message: error.message,
        type: "error",
      });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (requestBody: OrderFormData) => {
      // The requestBody is already transformed by handleSubmitOrder
      console.log("Mutation received request body:", requestBody);

      const response = await fetch("/api/lims/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("API response:", { status: response.status, data });

      if (!response.ok) {
        console.error("Order creation failed:", {
          status: response.status,
          error: data.error,
          errors: data.errors,
          fullResponse: data,
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
      setCurrentPatientId("");
      setSelectedPatient(null);
      setPatientSearchTerm("");
      queryClient.invalidateQueries({ queryKey: ["lims-orders", workspaceid] });
    },
    onError: (error: any) => {
      console.error("Order creation failed:", error);
      if (error.errors) {
        setValidationErrors(error.errors);
      } else {
        setValidationErrors([
          {
            field: "general",
            message: error.error || error.message || "Failed to create order",
          },
        ]);
      }
    },
  });

  // Fetch OpenEHR order status when order is selected
  useEffect(() => {
    const requestId =
      selectedOrder?.request_id || selectedOrder?.openehrrequestid;
    if (selectedOrder?.source === "openEHR" && requestId) {
      const fetchOpenEHRStatus = async () => {
        try {
          console.log(
            `Fetching OpenEHR order status for request_id: ${requestId}`
          );
          const response = await fetch(
            `/api/d/${workspaceid}/openehr-orders/${requestId}/status`
          );
          if (response.ok) {
            const data = await response.json();
            console.log(`OpenEHR order status received:`, data);
            setOpenEHROrderStatus(data.status);
          } else {
            console.error(
              `Failed to fetch OpenEHR order status: ${response.status}`
            );
          }
        } catch (error) {
          console.error("Failed to fetch OpenEHR order status:", error);
        }
      };
      fetchOpenEHRStatus();
    } else {
      setOpenEHROrderStatus("REQUESTED");
    }
  }, [selectedOrder, workspaceid]);

  const handleSubmitOrder = async (formData: OrderFormData) => {
    if (!currentPatientId) {
      setAlertDialog({
        show: true,
        title: "Validation Error",
        message: "Please enter a patient ID first",
        type: "warning",
      });
      return;
    }

    // Check if session is loaded
    if (!sessionData?.user) {
      setAlertDialog({
        show: true,
        title: "Session Error",
        message: "Session not loaded. Please wait a moment and try again.",
        type: "warning",
      });
      return;
    }

    // Fetch patient to get EHR ID
    let patientEhrId = null;
    try {
      const patientResponse = await fetch(
        `/api/d/${workspaceid}/patients/${currentPatientId}`
      );
      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        patientEhrId = patientData.patient?.ehrid || null;
      } else if (patientResponse.status === 403) {
        console.warn(
          "Permission denied to fetch patient details. Order will be created without openEHR integration."
        );
      } else {
        console.warn(
          `Failed to fetch patient details (${patientResponse.status}). Order will be created without openEHR integration.`
        );
      }
    } catch (error) {
      console.warn("Could not fetch patient EHR ID:", error);
    }

    // Transform enhanced form data to API format
    // The enhanced form provides selected_tests as test IDs, we need to convert to test codes
    const { INDIVIDUAL_TESTS } = await import("@/lib/test-catalog");
    const testCodes =
      formData.selected_tests?.map((testId: string) => {
        const test = INDIVIDUAL_TESTS[testId];
        return test?.code || testId;
      }) || [];

    // Handle urgency - convert to uppercase if it's a string, otherwise default to ROUTINE
    let priority = "ROUTINE";
    if (formData.urgency) {
      priority =
        typeof formData.urgency === "string"
          ? formData.urgency.toUpperCase()
          : "ROUTINE";
    }

    const apiFormData: any = {
      subjectType: "patient",
      subjectIdentifier: currentPatientId,
      encounterId: `ENC-${Date.now()}`,
      requestedTests: testCodes,
      priority: priority,
      orderingProviderId: sessionData.user.id,
      orderingProviderName:
        sessionData.user.name || sessionData.user.email || "Unknown Provider",
      clinicalIndication: formData.clinical_indication || "",
      clinicalNotes: formData.narrative || "",
      sourceSystem: "LIMS_UI",
      workspaceId: workspaceid,
    };

    // Only include ehrId if patient has one
    if (patientEhrId) {
      apiFormData.ehrId = patientEhrId;
    }

    console.log("Transformed form data for API:", apiFormData);

    await createOrderMutation.mutateAsync(apiFormData);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "STAT":
        return (
          <Badge variant="destructive" className="bg-red-600">
            STAT
          </Badge>
        );
      case "URGENT":
        return (
          <Badge variant="destructive" className="bg-orange-600">
            Urgent
          </Badge>
        );
      case "ASAP":
        return <Badge className="bg-yellow-600">ASAP</Badge>;
      default:
        return <Badge variant="outline">Routine</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <Badge variant="secondary">Requested</Badge>;
      case "ACCEPTED":
        return <Badge className="bg-blue-600">Accepted</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-purple-600">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const orders: LimsOrder[] = data?.orders || [];

  // Fetch computed statuses for all OpenEHR orders in a single batch request
  const batchStatusFetchedRef = useRef<string>("");
  const [statusRefreshTrigger, setStatusRefreshTrigger] = useState(0);
  
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const openEHROrders = orders.filter(
      (o: LimsOrder) => o.source === "openEHR"
    );
    const requestIds = openEHROrders
      .map((o) => o.request_id || o.openehrrequestid)
      .filter(Boolean) as string[];

    if (requestIds.length === 0) return;

    const fetchBatchStatuses = async () => {
      try {
        const response = await fetch(
          `/api/d/${workspaceid}/openehr-orders/batch-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestIds }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const statusMap = new Map<string, string>();
          if (data.statuses) {
            Object.entries(data.statuses).forEach(([id, status]) => {
              statusMap.set(id, status as string);
            });
          }
          setOpenEHROrderStatuses(statusMap);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Batch status fetch failed:", error);
        }
      }
    };

    fetchBatchStatuses();
    
    // Refresh statuses every 30 seconds to pick up changes from sample collection
    const intervalId = setInterval(() => {
      fetchBatchStatuses();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [orders, workspaceid, statusRefreshTrigger]);

  // First filter by search and status, then group by test to show only latest
  const baseFilteredOrders = orders.filter((order: LimsOrder) => {
    // Handle both local and openEHR orders
    const orderId =
      order.orderid || order.composition_uid || order.request_id || "";
    const subjectId = order.subjectidentifier || order.patientId || "";
    const providerName =
      order.orderingprovidername || order.requesting_provider || "";
    const serviceName = order.service_name || "";
    const patientName = order.patientName || "";

    const matchesSearch =
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patientName.toLowerCase().includes(searchTerm.toLowerCase());

    // Use the same status logic as the table display
    const isOpenEHR = order.source === "openEHR";
    const requestId = order.request_id || order.openehrrequestid;
    const orderStatus = isOpenEHR
      ? order.status || openEHROrderStatuses.get(requestId || "") || "REQUESTED"
      : order.status;
    
    const matchesStatus =
      statusFilter === "all" || orderStatus === statusFilter;

    // Priority filter
    const orderPriority = order.source === "openEHR"
      ? (order.urgency?.toUpperCase() || "ROUTINE")
      : (order.priority || "ROUTINE");
    const matchesPriority =
      priorityFilter === "all" || orderPriority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group orders by test and keep only the latest one for each test
  const latestOrdersByTest = new Map<string, LimsOrder>();
  
  baseFilteredOrders.forEach((order: LimsOrder) => {
    // Create a unique key for each test (test name + patient)
    const testInfo = order.source === "openEHR" 
      ? order.service_name 
      : order.tests?.map((t: any) => t.testName).join(", ") || "N/A";
    
    const patientId = order.subjectidentifier || order.patientId || "";
    const testKey = `${testInfo}_${patientId}`;
    
    const orderDate = order.source === "openEHR" 
      ? new Date(order.recorded_time || "")
      : new Date(order.createdat || "");
    
    // If this test doesn't exist yet, or if this order is newer, keep it
    const existingOrder = latestOrdersByTest.get(testKey);
    if (!existingOrder) {
      latestOrdersByTest.set(testKey, order);
    } else {
      const existingDate = existingOrder.source === "openEHR" 
        ? new Date(existingOrder.recorded_time || "")
        : new Date(existingOrder.createdat || "");
      
      if (orderDate > existingDate) {
        latestOrdersByTest.set(testKey, order);
      }
    }
  });

  const filteredOrders = Array.from(latestOrdersByTest.values()).sort((a, b) => {
    const dateA = a.source === "openEHR" 
      ? new Date(a.recorded_time || "").getTime()
      : new Date(a.createdat || "").getTime();
    const dateB = b.source === "openEHR" 
      ? new Date(b.recorded_time || "").getTime()
      : new Date(b.createdat || "").getTime();
    
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Orders</h2>
          <p className="text-xs text-muted-foreground">
            View and manage incoming lab test orders
          </p>
        </div>
        <div className="flex gap-2">
         {/*  <Button variant="outline" size="sm" className="border-gray-300">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button> */}
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                setValidationErrors([]);
                setCurrentPatientId("");
                setPatientSearchTerm("");
                setSelectedPatient(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#4E7BC7]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className={getDialogClasses("MEDIUM")}>
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
                        <div key={idx} className="text-sm">
                          {err.message}
                        </div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Search Input */}
                <div>
                  <Label
                    htmlFor="patientSearch"
                    className="text-sm font-medium"
                  >
                    Search Patient
                  </Label>
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
                  <div className="max-h-[300px] overflow-y-auto bg-white shadow-sm rounded-md border">
                    {patients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground space-y-3">
                        <div>No patients found</div>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                          onClick={() => {
                            const trimmed = patientSearchTerm.trim();
                            const looksLikeId = /^\d+$/.test(trimmed);
                            setRegisterPatientForm((prev) => ({
                              ...prev,
                              firstname: prev.firstname || (!looksLikeId ? trimmed : ""),
                              middlename: prev.middlename || "",
                              lastname: prev.lastname || "",
                              nationalid: prev.nationalid || (looksLikeId ? trimmed : ""),
                            }));
                            setShowRegisterPatientDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Register new patient
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {patients.map((patient: Patient) => (
                          <div
                            key={patient.patientid}
                            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0 ${
                              selectedPatient?.patientid === patient.patientid
                                ? "bg-blue-50"
                                : "bg-white"
                            }`}
                            onClick={() => {
                              setSelectedPatient(patient);
                              setCurrentPatientId(patient.patientid);
                            }}
                          >
                            <div className="font-medium text-sm uppercase tracking-wide">
                              {[patient.firstname, patient.middlename, patient.lastname].filter(Boolean).join(" ") ||
                                patient.name ||
                                "Unknown Patient"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {patient.nationalid ||
                                patient.patientid?.substring(0, 15) ||
                                "No ID"}
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
                    <div className="text-sm font-medium text-blue-900">
                      Selected Patient
                    </div>
                    <div className="mt-1">
                      <div className="font-semibold">
                        {[selectedPatient.firstname, selectedPatient.middlename, selectedPatient.lastname].filter(Boolean).join(" ") ||
                          selectedPatient.name ||
                          "Unknown Patient"}
                      </div>
                      <div className="text-sm text-gray-600">
                        National ID: {selectedPatient.nationalid || "—"}
                      </div>
                    </div>
                  </div>
                )}

                <Dialog
                  open={showRegisterPatientDialog}
                  onOpenChange={(open) => {
                    setShowRegisterPatientDialog(open);
                    if (!open) {
                      setRegisterPatientForm({
                        firstname: "",
                        middlename:"",
                        lastname: "",
                        nationalid: "",
                        dateofbirth: "",
                        gender: "",
                        phone: "",
                      });
                    }
                  }}
                >
                  <DialogContent className={getDialogClasses("MEDIUM")}>
                    <DialogHeader>
                      <DialogTitle>Register Patient</DialogTitle>
                      <DialogDescription>
                        Create a new patient in the EHR and database, then continue with the lab order.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reg-firstname">First name *</Label>
                          <Input
                            id="reg-firstname"
                            value={registerPatientForm.firstname}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev, firstname: e.target.value }))
                            }
                          />
                        </div>
                          <div className="space-y-2">
                          <Label htmlFor="reg-middlename">Middle name *</Label>
                          <Input
                            id="reg-middlename"
                            value={registerPatientForm.middlename}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev,middlename: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-lastname">Last name *</Label>
                          <Input
                            id="reg-lastname"
                            value={registerPatientForm.lastname}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev, lastname: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-nationalid">National ID (optional)</Label>
                          <Input
                            id="reg-nationalid"
                            value={registerPatientForm.nationalid || ""}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev, nationalid: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-dob">Date of birth (optional)</Label>
                          <Input
                            id="reg-dob"
                            type="date"
                            value={registerPatientForm.dateofbirth || ""}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev, dateofbirth: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-gender">Gender (optional)</Label>
                          <Select
                            value={registerPatientForm.gender || ""}
                            onValueChange={(value) =>
                              setRegisterPatientForm((prev) => ({ ...prev, gender: value }))
                            }
                          >
                            <SelectTrigger id="reg-gender">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-phone">Phone (optional)</Label>
                          <Input
                            id="reg-phone"
                            value={registerPatientForm.phone || ""}
                            onChange={(e) =>
                              setRegisterPatientForm((prev) => ({ ...prev, phone: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRegisterPatientDialog(false)}
                        disabled={createPatientMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          if (!registerPatientForm.firstname.trim() || !registerPatientForm.lastname.trim()) {
                            setAlertDialog({
                              show: true,
                              title: "Validation Error",
                              message: "First name and last name are required.",
                              type: "warning",
                            });
                            return;
                          }
                          createPatientMutation.mutate({
                            firstname: registerPatientForm.firstname.trim(),
                            middlename: registerPatientForm.middlename.trim(),
                            lastname: registerPatientForm.lastname.trim(),
                            nationalid: registerPatientForm.nationalid?.trim() || undefined,
                            dateofbirth: registerPatientForm.dateofbirth || undefined,
                            gender: registerPatientForm.gender || undefined,
                            phone: registerPatientForm.phone?.trim() || undefined,
                          });
                        }}
                        disabled={createPatientMutation.isPending}
                      >
                        {createPatientMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          "Register"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setPatientSearchTerm("");
                    setSelectedPatient(null);
                    setCurrentPatientId("");
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
                      setAlertDialog({
                        show: true,
                        title: "Validation Error",
                        message:
                          "Please select a patient from the search results",
                        type: "warning",
                      });
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
          <EnhancedLabOrderFormMultiple
            open={showOrderForm}
            onOpenChange={setShowOrderForm}
            onSubmit={handleSubmitOrder}
            patientId={currentPatientId}
            patientName={
              selectedPatient
                ? `${selectedPatient.firstname} ${selectedPatient.lastname}`
                : undefined
            }
            workspaceid={workspaceid}
          />
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
                  placeholder="Search by Order ID, Patient Name, Patient ID, Provider..."
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
                  <SelectItem value="REQUESTED">Requested</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
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
      <Card className="border-gray-200 flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Orders ({filteredOrders.length})
            </CardTitle>
            {filteredOrders.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "order" : "orders"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">
                Loading orders...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive mb-3">
                Error loading orders. Please try again.
              </p>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="h-full overflow-auto [&_[data-slot=table-container]]:overflow-visible">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold w-32 sticky top-0 z-10 bg-gray-50">Order ID</TableHead>
                    <TableHead className="font-semibold w-40 sticky top-0 z-10 bg-gray-50">Patient</TableHead>
                    <TableHead className="font-semibold w-48 sticky top-0 z-10 bg-gray-50">
                      Test
                    </TableHead>
                    <TableHead className="font-semibold w-24 sticky top-0 z-10 bg-gray-50">Priority</TableHead>
                    <TableHead className="font-semibold w-28 sticky top-0 z-10 bg-gray-50">Status</TableHead>
                    <TableHead className="font-semibold w-36 sticky top-0 z-10 bg-gray-50">Provider</TableHead>
                    <TableHead className="font-semibold w-28 sticky top-0 z-10 bg-gray-50">TAT</TableHead>
                    <TableHead className="font-semibold w-32 sticky top-0 z-10 bg-gray-50">
                      <button
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        Order Date
                        <span className="text-xs">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </span>
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
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
                    filteredOrders.map((order: LimsOrder, idx: number) => {
                      const isOpenEHR = order.source === "openEHR";
                      const orderId = isOpenEHR
                        ? (order.request_id || order.composition_uid || "")
                        : (order.orderid || order.composition_uid || order.request_id || "");
                      const rowKey = `${orderId}-${idx}`;
                      const displayId =
                        orderId.length > 12
                          ? orderId.substring(0, 12) + "..."
                          : orderId;
                      const patientInfo =
                        order.patientName || order.subjectidentifier;
                      const testInfo = isOpenEHR
                        ? order.service_name
                        : order.tests?.map((t: any) => t.testName).join(", ") ||
                          "N/A";
                      const priority = isOpenEHR
                        ? order.urgency?.toUpperCase()
                        : order.priority;
                      const requestId =
                        order.request_id || order.openehrrequestid;
                      const status = isOpenEHR
                        ? order.status || openEHROrderStatuses.get(requestId || "") ||
                          "REQUESTED"
                        : order.status;
                      const provider = isOpenEHR
                        ? order.requesting_provider
                        : order.orderingprovidername;
                      const orderDate = isOpenEHR
                        ? order.recorded_time
                        : order.createdat;

                      return (
                        <TableRow
                          key={rowKey}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedOrder(order);
                            setCollectedSpecimenTypes({});
                            setCurrentCollectingSpecimen("");
                            // Reset selection - effectiveSelection in render will auto-select first test
                            setSelectedTestForCollection(null);
                            setShowOrderDetail(true);
                          }}
                        >
                          <TableCell className="font-medium text-blue-600">
                            {displayId}
                          </TableCell>
                          <TableCell className="font-medium">
                            {patientInfo || "N/A"}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-sm" title={testInfo}>
                              {testInfo}
                            </div>
                          </TableCell>
                          <TableCell>
                            {priority === "URGENT" || priority === "urgent" ? (
                              <Badge
                                variant="destructive"
                                className="bg-orange-600"
                              >
                                Urgent
                              </Badge>
                            ) : priority === "STAT" ? (
                              <Badge
                                variant="destructive"
                                className="bg-red-600"
                              >
                                STAT
                              </Badge>
                            ) : (
                              <Badge variant="outline">Routine</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {provider || "N/A"}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (!orderDate) return <span className="text-gray-400">-</span>;
                              const completedStatuses = ["COMPLETED", "CANCELLED", "REJECTED"];
                              const isComplete = completedStatuses.includes(status || "");
                              const tat = calculateTAT(orderDate, isComplete ? new Date().toISOString() : null, priority || "ROUTINE");
                              return (
                                <Badge variant="outline" className={`text-xs font-medium ${getTATStatusColor(tat.status)}`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {tat.elapsedDisplay}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {orderDate
                              ? new Date(orderDate).toLocaleDateString()
                              : "N/A"}
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
        <DialogContent className={getDialogClasses("SMALL")}>
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
                <div className="text-sm font-medium text-green-900 mb-1">
                  Order ID
                </div>
                <div className="text-lg font-mono font-semibold text-green-700">
                  {createdOrder.orderId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Status
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(createdOrder.status)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Created At
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(
                      createdOrder.createdAt || createdOrder.createdat
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Requested Tests
                </div>
                <div className="space-y-1">
                  {createdOrder.tests?.map((test: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                    >
                      <FlaskConical className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{test.testName}</span>
                      <span className="text-gray-500">({test.testCode})</span>
                    </div>
                  ))}
                </div>
              </div>

              {createdOrder.openEhr && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    openEHR Integration
                  </div>
                  <div className="text-xs text-blue-700 font-mono">
                    EHR ID: {createdOrder.openEhr.ehrId}
                    <br />
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
        <DialogContent className={getDialogClasses("STANDARD")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-blue-600" />
              Order Details
            </DialogTitle>
          </DialogHeader>

          {selectedOrder &&
            (() => {
              // Calculate sample recommendations if not stored in order
              let computedRecommendations = null;
              if (
                selectedOrder.tests &&
                selectedOrder.tests.length > 0
              ) {
                const testCodes = selectedOrder.tests.map(
                  (t: any) => t.testCode || t.testcode || t.code
                );
                computedRecommendations = getSampleRecommendations(testCodes);
              } else if (selectedOrder.source === "openEHR" && selectedOrder.service_name) {
                // For openEHR orders, resolve service name to test codes (also parses Selected Tests from description)
                computedRecommendations = getRecommendationsByServiceName(selectedOrder.service_name, selectedOrder.description);
              }
              // Use stored data or computed recommendations
              const displayRecommendations =
                selectedOrder.sampleRecommendations || computedRecommendations;
              
              // Resolve individual tests for display - enrich with specimen data from DB catalog
              let resolvedTests: any[] = [];
              if (selectedOrder.tests && selectedOrder.tests.length > 0) {
                // LIMS orders have tests but may lack specimen/container info
                // Enrich using DB catalog lookup (covers all 427 tests), fallback to static recommendations
                resolvedTests = selectedOrder.tests.map((t: any) => {
                  const code = t.testCode || t.testcode || t.code;
                  const name = t.testName || t.testname;
                  const existing = t.specimenType || t.specimentype || t.material;
                  const cat = existing ? null : resolveSpecimenFromCatalog(code, name);
                  return {
                    testCode: code || name,
                    testName: name || code,
                    specimenType: existing || (cat ? cat.sampleType : undefined),
                    containerType: t.containerType || t.containertype || t.specimencontainer || (cat ? cat.containerType : undefined),
                    specimenvolume: t.specimenvolume || t.volume,
                    fastingRequired: t.fastingRequired ?? false,
                  };
                });
              } else if (selectedOrder.source === "openEHR" && (selectedOrder.description || selectedOrder.service_name)) {
                // OpenEHR orders: parse actual ordered tests from description/service_name
                const nameSource = selectedOrder.description || selectedOrder.service_name || "";
                const selectedTestsMatch = nameSource.match(/Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i);
                const testNames = selectedTestsMatch
                  ? selectedTestsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean)
                  : (selectedOrder.service_name || "").split(',').map((s: string) => s.trim()).filter(Boolean);
                
                if (testNames.length > 0) {
                  resolvedTests = testNames.map((name: string) => {
                    const cat = resolveSpecimenFromCatalog(undefined, name);
                    return {
                      testCode: cat?.testCode || name,
                      testName: name,
                      specimenType: cat?.sampleType,
                      containerType: cat?.containerType,
                      fastingRequired: false,
                    };
                  });
                } else if (displayRecommendations?.recommendations?.length > 0) {
                  resolvedTests = displayRecommendations.recommendations.map((r: any) => ({
                    testCode: r.testCode,
                    testName: r.testName,
                    specimenType: r.sampleType,
                    containerType: r.containerType,
                    specimenvolume: `${r.volume} ${r.volumeUnit}`,
                    fastingRequired: r.fastingRequired,
                  }));
                }
              } else if (displayRecommendations?.recommendations?.length > 0) {
                resolvedTests = displayRecommendations.recommendations.map((r: any) => ({
                    testCode: r.testCode,
                    testName: r.testName,
                    specimenType: r.sampleType,
                    containerType: r.containerType,
                    specimenvolume: `${r.volume} ${r.volumeUnit}`,
                    fastingRequired: r.fastingRequired,
                  }));
              }

              // Auto-select first test if nothing is selected
              if (resolvedTests.length > 0 && !selectedTestForCollection) {
                const firstTest = resolvedTests[0];
                const firstKey = firstTest.testCode || firstTest.testName || "test-0";
                // Use setTimeout to avoid setState during render
                setTimeout(() => setSelectedTestForCollection(firstKey), 0);
              }

              // Compute effective selection: use selectedTestForCollection if it matches a resolved test, otherwise use first test
              const effectiveSelection = (() => {
                if (resolvedTests.length === 0) return null;
                const firstKey = resolvedTests[0].testCode || resolvedTests[0].testName || "test-0";
                if (!selectedTestForCollection) return firstKey;
                // Check if selectedTestForCollection matches any resolved test
                const match = resolvedTests.find((t: any) => {
                  const key = t.testCode || t.testName;
                  return key === selectedTestForCollection;
                });
                return match ? selectedTestForCollection : firstKey;
              })();

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
                  {/* Left Column - Order Information */}
                  <div className="space-y-2">
                   {/* Combined Patient & Order Info Card - Compact */}
<div className="border rounded-lg p-2.5">
  {/* Header with badges */}
  <div className="flex items-center justify-between mb-2">
    <h3 className="font-semibold text-xs">Patient Information</h3>
    <div className="flex gap-1.5">
      {getStatusBadge(selectedOrder.source === "openEHR" ? openEHROrderStatus : selectedOrder.status)}
      {getPriorityBadge(selectedOrder.source === "openEHR" ? selectedOrder.urgency?.toUpperCase() || "ROUTINE" : selectedOrder.priority || "ROUTINE")}
    </div>
  </div>
  
  {/* Patient & Order Details - Side by Side */}
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    {/* Left Column */}
    <div className="space-y-1.5">
      <div>
        <span className="text-muted-foreground">Patient:</span>
        <div className="font-semibold text-sm">
          {selectedOrder.patientName || selectedOrder.subjectidentifier || "N/A"}
          {(selectedOrder.patientage !== undefined || selectedOrder.patientsex) && (
            <>
              {" • "}
              {selectedOrder.patientage !== undefined && `${selectedOrder.patientage}y`}
              {selectedOrder.patientage !== undefined && selectedOrder.patientsex && " / "}
              {selectedOrder.patientsex && `${selectedOrder.patientsex.charAt(0).toUpperCase()}`}
            </>
          )}
        </div>
      </div>
      
      <div>
        <span className="text-muted-foreground">Order ID:</span>
        <div className="font-mono text-[10px]">
          {(() => {
            const orderId = selectedOrder.source === "openEHR"
              ? (selectedOrder.request_id || selectedOrder.composition_uid || "N/A")
              : (selectedOrder.orderid || selectedOrder.composition_uid || selectedOrder.request_id || "N/A");
            return orderId.length > 20 ? `${orderId.substring(0, 8)}...${orderId.substring(orderId.length - 8)}` : orderId;
          })()}
        </div>
      </div>
    </div>

    {/* Right Column */}
    <div className="space-y-1.5">
      <div>
        <span className="text-muted-foreground">Order Date:</span>
        <div className="text-xs">
          {(
            selectedOrder.source === "openEHR"
              ? selectedOrder.recorded_time || selectedOrder.createdat
              : selectedOrder.createdat
          )
            ? new Date(
                selectedOrder.source === "openEHR"
                  ? selectedOrder.recorded_time || selectedOrder.createdat
                  : selectedOrder.createdat
              ).toLocaleString()
            : "N/A"}
        </div>
      </div>
      
      {(selectedOrder.test_category || (selectedOrder as any)?.tests?.[0]?.testcategory) && (
        <div>
          <span className="text-muted-foreground">Test Category:</span>
          <div className="font-medium">
            {selectedOrder.test_category ||
              ((selectedOrder as any)?.tests?.[0]?.testcategory as string)}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Clinical Information - Full Width */}
  {(selectedOrder.clinicalindication || selectedOrder.clinicalnotes) && (
    <div className="border-t mt-2 pt-2 text-[11px]">
      {selectedOrder.clinicalindication && (
        <div className="mb-0.5">
          <span className="font-medium text-muted-foreground">Clinical Indication:</span>{" "}
          <span>{selectedOrder.clinicalindication}</span>
        </div>
      )}
      {selectedOrder.clinicalnotes && (
        <div>
          <span className="font-medium text-muted-foreground">Clinical Notes:</span>{" "}
          <span>{selectedOrder.clinicalnotes}</span>
        </div>
      )}
    </div>
  )}
</div>


                    {/* Requested Tests - List format grouped by specimen */}
                    <div className="border rounded-lg p-2">
                      <h3 className="font-semibold text-xs mb-1.5">
                        Requested Tests
                      </h3>

                      {resolvedTests.length > 0 ? (() => {
                        // Group tests by specimen type and container
                        const specimenGroups = resolvedTests.reduce((acc: any, test: any) => {
                          const specimen = test.specimenType || test.specimentype || test.material || "Not specified";
                          const container = test.containerType || test.containertype || test.specimencontainer || "-";
                          const groupKey = `${specimen}|${container}`;
                          if (!acc[groupKey]) {
                            acc[groupKey] = {
                              specimen,
                              container,
                              tests: []
                            };
                          }
                          acc[groupKey].tests.push(test);
                          return acc;
                        }, {});
                        
                        return (
                          <div className="space-y-2">
                            {Object.entries(specimenGroups).map(([groupKey, data]: [string, any]) => {
                              const isCollected = !!collectedSpecimenTypes[data.specimen];
                              const isSelectedForCollection = effectiveSelection && resolvedTests.find((t: any) => (t.testCode || t.testName) === effectiveSelection)?.specimenType === data.specimen;
                              return (
                              <div 
                                key={groupKey} 
                                className={`border rounded p-2 transition-colors cursor-pointer hover:shadow-md ${
                                  isCollected ? 'bg-green-50 border-green-300' : 'border-gray-200 hover:border-blue-300'
                                }`}
                                onClick={() => {
                                  // Select first test of this specimen when card is clicked
                                  const firstTest = data.tests[0];
                                  if (firstTest) {
                                    const testKey = firstTest.testCode || firstTest.testName;
                                    setSelectedTestForCollection(testKey);
                                  }
                                }}
                              >
                                <div 
                                  className="flex items-center gap-1.5 mb-1.5"
                                >
                                  <FlaskConical className={`h-3 w-3 flex-shrink-0 ${
                                    isCollected ? 'text-green-600' : 'text-blue-600'
                                  }`} />
                                  <span className={`font-semibold text-xs ${
                                    isCollected ? 'text-green-900' : 'text-blue-900'
                                  }`}>{data.specimen}</span>
                                  <span className="text-[10px] text-gray-600">({data.tests.length})</span>
                                  <span className="text-[10px] text-gray-500">• {data.container}</span>
                                  {isCollected && (
                                    <span className="ml-auto text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                      ✓ Collected
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  {data.tests.map((test: any, idx: number) => {
                                    const testKey = test.testCode || test.testName || `test-${idx}`;
                                    const isSelected = effectiveSelection === testKey;
                                    // Get test category from catalog or order
                                    const testCategory = test.testcategory || selectedOrder.test_category || "";
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                                          isSelected
                                            ? 'bg-blue-100 border border-blue-300'
                                            : isCollected ? 'bg-green-50' : 'bg-gray-50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 flex-1">
                                          <div className="font-medium">{test.testName}</div>
                                          <div className="text-[10px] text-gray-500 font-mono">{test.testCode}</div>
                                          {testCategory && (
                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                                              {testCategory}
                                            </span>
                                          )}
                                        </div>
                                        {test.fastingRequired && (
                                          <span className="text-[9px] font-medium bg-amber-100 text-amber-700 rounded px-1 py-0.5">
                                            Fasting
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        );
                      })() : (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded text-left">
                          <FlaskConical className="h-4 w-4 text-gray-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {selectedOrder.service_name || "Unknown Service"}
                            </div>
                            {selectedOrder.test_category && (
                              <div className="text-xs text-gray-600 truncate">
                                Category: {selectedOrder.test_category}
                              </div>
                            )}
                            {(selectedOrder.clinical_indication || selectedOrder.clinicalindication) && (
                              <div className="text-xs text-gray-600 truncate">
                                Indication: {selectedOrder.clinical_indication || selectedOrder.clinicalindication}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>


                    {/* Fasting Requirements Alert */}
                    {resolvedTests.some(
                      (t: any) => t.fastingRequired
                    ) && (
                      <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                        <span className="text-amber-600 font-semibold text-xs">⚠️ Fasting Required</span>
                        <span className="text-[10px] text-amber-800">Some tests require 8-12 hours fasting.</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Sample Collection */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-green-200 rounded-lg p-2.5">
                      <h3 className="font-semibold text-xs mb-2 flex items-center gap-1.5 text-green-900">
                        <FlaskConical className="h-3.5 w-3.5" />
                        Sample Collection
                        {/* Progress indicator */}
                        {(() => {
                          const specimenGroupsForProgress = resolvedTests.reduce((acc: any, test: any) => {
                            const specimen = test.specimenType || test.specimentype || test.material || "Not specified";
                            if (!acc[specimen]) acc[specimen] = true;
                            return acc;
                          }, {} as Record<string, boolean>);
                          const totalGroups = Object.keys(specimenGroupsForProgress).length;
                          const collectedCount = Object.keys(collectedSpecimenTypes).filter(s => specimenGroupsForProgress[s]).length;
                          if (totalGroups > 1) {
                            return (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${collectedCount === totalGroups ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {collectedCount}/{totalGroups} collected
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </h3>

                      {/* Specimen type groups with individual collect buttons */}
                      {(() => {
                        const specimenGroups = resolvedTests.reduce((acc: any, test: any) => {
                          const specimen = test.specimenType || test.specimentype || test.material || "Not specified";
                          if (!acc[specimen]) {
                            acc[specimen] = { tests: [] as any[], containers: new Set<string>(), volumes: [] as string[] };
                          }
                          acc[specimen].tests.push(test);
                          const container = test.containerType || test.containertype || test.specimencontainer;
                          if (container) acc[specimen].containers.add(container);
                          const volume = test.specimenvolume || test.volume;
                          if (volume) acc[specimen].volumes.push(String(volume));
                          return acc;
                        }, {} as Record<string, { tests: any[]; containers: Set<string>; volumes: string[] }>);

                        const groupEntries = Object.entries(specimenGroups);

                        if (groupEntries.length === 0) {
                          return (
                            <div className="text-xs text-gray-500 p-2">
                              No specimen type information available for this order.
                            </div>
                          );
                        }

                        // Find which specimen type the selected test belongs to
                        let filteredEntries = groupEntries;
                        if (effectiveSelection) {
                          const selectedTest = resolvedTests.find((t: any) =>
                            (t.testCode || t.testName) === effectiveSelection
                          );
                          if (selectedTest) {
                            const selectedSpecimen = selectedTest.specimenType || selectedTest.specimentype || selectedTest.material || "Not specified";
                            filteredEntries = groupEntries.filter(([specimen]) => specimen === selectedSpecimen);
                          }
                        }

                        if (!effectiveSelection) {
                          return (
                            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
                              <FlaskConical className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-xs font-medium">Select a test from the left panel</p>
                              <p className="text-[10px]">Click on a requested test to collect its sample</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {filteredEntries.map(([specimen, data]: [string, any]) => {
                              const isCollected = !!collectedSpecimenTypes[specimen];
                              const isCollecting = createSampleMutation.isPending && currentCollectingSpecimen === specimen;
                              const isCancelled = openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED";

                              return (
                                <div key={specimen} className={`rounded border p-2.5 transition-colors ${isCollected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-green-300'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <FlaskConical className={`h-3.5 w-3.5 ${isCollected ? 'text-green-600' : 'text-blue-500'}`} />
                                      <span className="text-xs font-semibold">{specimen}</span>
                                      <span className="text-[10px] text-gray-500">({data.tests.length} test{data.tests.length > 1 ? 's' : ''})</span>
                                    </div>
                                    {isCollected && (
                                      <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Collected
                                      </span>
                                    )}
                                  </div>

                                  {/* Container & Volume info */}
                                  <div className="text-[10px] text-gray-600 ml-5 mb-1">
                                    {data.containers.size > 0 && <span><strong>Container:</strong> {Array.from(data.containers).join(', ')} </span>}
                                    {data.volumes.length > 0 && <span>• <strong>Volume:</strong> {data.volumes[0]} </span>}
                                    {data.tests.some((t: any) => t.fastingRequired) && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-800 ml-1">
                                        ⚠️ Fasting
                                      </span>
                                    )}
                                  </div>

                                  {/* Tests in this group */}
                                  <div className="text-[10px] text-gray-700 ml-5 mb-1.5">
                                    <strong>Tests:</strong> {data.tests.map((t: any) => t.testName).join(", ")}
                                  </div>

                                  {/* Collected sample info */}
                                  {isCollected && (
                                    <div className="text-[10px] text-green-700 ml-5 bg-green-100 rounded px-2 py-1">
                                      Sample: <span className="font-mono font-medium">{collectedSpecimenTypes[specimen].sampleNumber}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* All collected success message */}
                            {groupEntries.length > 0 && groupEntries.every(([specimen]) => !!collectedSpecimenTypes[specimen]) && (
                              <div className="p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800 text-center font-medium">
                                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                                All specimen types collected successfully!
                              </div>
                            )}

                          </div>
                        );
                      })()}

                      {/* Shared collection fields - only show when a test is selected */}
                      {effectiveSelection && <div className="space-y-2 mt-3 pt-2 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="sampleNumberDetail" className="text-xs">Sample ID</Label>
                            <Input
                              id="sampleNumberDetail"
                              type="text"
                              placeholder="Auto-generated"
                              value={sampleCollectionData.sampleNumber || ""}
                              onChange={(e) => setSampleCollectionData((prev) => ({ ...prev, sampleNumber: e.target.value }))}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label htmlFor="collectionDateDetail" className="text-xs">Collection Date *</Label>
                            <Input
                              id="collectionDateDetail"
                              type="datetime-local"
                              value={sampleCollectionData.collectionDate}
                              onChange={(e) => setSampleCollectionData((prev) => ({ ...prev, collectionDate: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="collectorNameDetail" className="text-xs">Collector</Label>
                            <Input id="collectorNameDetail" type="text" value={sampleCollectionData.collectorName} readOnly className="h-8 text-xs bg-gray-50" />
                          </div>
                          <div>
                            <Label htmlFor="locationDetail" className="text-xs">Location</Label>
                            <Input id="locationDetail" type="text" value={sampleCollectionData.currentLocation} readOnly className="h-8 text-xs bg-gray-50" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="sampleCommentsDetail" className="text-xs">Comments (Optional)</Label>
                          <textarea
                            id="sampleCommentsDetail"
                            placeholder="Add notes about sample collection..."
                            value={sampleComments}
                            onChange={(e) => setSampleComments(e.target.value)}
                            rows={2}
                            className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        </div>

                        {/* Collect Sample Buttons */}
                        {(() => {
                          const isCancelled = openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED";
                          if (isCancelled) return null;
                          
                          // Check if order already has samples collected
                          const hasSamplesCollected = orderSamples && orderSamples.length > 0;
                          
                          const specimenGroups = resolvedTests.reduce((acc: any, test: any) => {
                            const specimen = test.specimenType || test.specimentype || test.material || "Not specified";
                            if (!acc[specimen]) acc[specimen] = { tests: [] as any[], containers: new Set<string>(), volumes: [] as string[] };
                            acc[specimen].tests.push(test);
                            return acc;
                          }, {} as Record<string, { tests: any[]; containers: Set<string>; volumes: string[] }>);
                          let entries = Object.entries(specimenGroups);
                          if (effectiveSelection) {
                            const selectedTest = resolvedTests.find((t: any) => (t.testCode || t.testName) === effectiveSelection);
                            if (selectedTest) {
                              const selectedSpecimen = selectedTest.specimenType || selectedTest.specimentype || selectedTest.material || "Not specified";
                              entries = entries.filter(([specimen]) => specimen === selectedSpecimen);
                            }
                          }
                          const uncollected = entries.filter(([specimen]) => !collectedSpecimenTypes[specimen]);
                          if (uncollected.length === 0) return null;
                          
                          // Show message if samples already collected
                          if (hasSamplesCollected) {
                            return (
                              <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                <div className="font-semibold flex items-center gap-1">
                                  ✓ Samples already collected for this order
                                </div>
                                <div className="text-blue-600 mt-1">
                                  {orderSamples.length} sample{orderSamples.length !== 1 ? 's' : ''} collected: {orderSamples.map((s: any) => s.samplenumber).join(', ')}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="mt-3 space-y-2">
                              {uncollected.map(([specimen, data]: [string, any]) => {
                                const isCollecting = createSampleMutation.isPending && currentCollectingSpecimen === specimen;
                                return (
                                  <Button
                                    key={specimen}
                                    type="button"
                                    size="sm"
                                    className="w-full h-8 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                                    disabled={isCollecting || createSampleMutation.isPending}
                                    onClick={() => {
                                      if (!selectedOrder) return;
                                      setCurrentCollectingSpecimen(specimen);
                                      const sampleData: SampleData = {
                                        sampleNumber: sampleCollectionData.sampleNumber || undefined,
                                        accessionNumber: sampleCollectionData.accessionNumber || undefined,
                                        collectionDate: new Date(sampleCollectionData.collectionDate).toISOString(),
                                        collectorName: sampleCollectionData.collectorName || undefined,
                                        orderId: selectedOrder.orderid || selectedOrder.request_id || selectedOrder.composition_uid,
                                        patientId: selectedOrder.subjectidentifier || undefined,
                                        ehrId: selectedOrder.ehrid || undefined,
                                        sampleType: specimen,
                                        subjectIdentifier: selectedOrder.subjectidentifier || undefined,
                                        workspaceId: workspaceid,
                                        currentLocation: sampleCollectionData.currentLocation,
                                        tests: data.tests.map((t: any) => t.testCode || t.testcode || t.testName || t) || [],
                                        comments: sampleComments || undefined,
                                      };
                                      createSampleMutation.mutate(sampleData);
                                    }}
                                  >
                                    {isCollecting ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Collecting...</>
                                    ) : (
                                      <><FlaskConical className="h-3 w-3 mr-1" /> Collect {specimen} Sample</>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>}

                      {/* Show message if order is cancelled */}
                      {(openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED") && (() => {
                        // Extract cancellation details from local order or openEHR narrative
                        let cancelledBy = selectedOrder?.cancelledbyname || null;
                        let cancelReason = selectedOrder?.cancellationreason || null;

                        // For openEHR orders, parse narrative: "[CANCELLED] Reason: ... | Cancelled by: ... | Cancelled at: ..."
                        if (!cancelledBy && selectedOrder?.narrative?.includes("[CANCELLED]")) {
                          const byMatch = selectedOrder.narrative.match(/Cancelled by:\s*([^|]+)/);
                          const reasonMatch = selectedOrder.narrative.match(/Reason:\s*([^|]+)/);
                          if (byMatch) cancelledBy = byMatch[1].trim();
                          if (reasonMatch) cancelReason = reasonMatch[1].trim();
                        }

                        return (
                          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 space-y-1">
                            <div className="font-semibold flex items-center gap-1">
                              ❌ Cannot collect sample: This order has been cancelled.
                            </div>
                            {(cancelledBy || cancelReason) && (
                              <div className="text-red-600">
                                {cancelledBy && <>Cancelled by <strong>{cancelledBy}</strong></>}
                                {cancelledBy && cancelReason && <> — </>}
                                {cancelReason && <>Reason: <em>{cancelReason}</em></>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

          <DialogFooter className="gap-2">
            {Object.keys(collectedSpecimenTypes).length > 0 && (
              <div className="flex-1 text-xs text-green-700">
                {Object.keys(collectedSpecimenTypes).length} specimen type(s) collected
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowOrderDetail(false);
                if (Object.keys(collectedSpecimenTypes).length > 0) {
                  const collected = Object.entries(collectedSpecimenTypes)
                    .map(([type, info]) => `${type}: ${info.sampleNumber}`)
                    .join("\n");
                  setAlertDialog({
                    show: true,
                    title: "Samples Collected Successfully",
                    message: `Collected specimens:\n${collected}\n\nOrder status updated to IN PROGRESS`,
                    type: "success",
                  });
                }
              }}
            >
              {Object.keys(collectedSpecimenTypes).length > 0 ? "Done" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sample Collection Modal */}
      <Dialog
        open={showSampleCollection}
        onOpenChange={setShowSampleCollection}
      >
        <DialogContent className={getDialogClasses("MEDIUM")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-green-600" />
              Collect Sample
            </DialogTitle>
            <DialogDescription>
              Register and collect sample for this order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder &&
            (() => {
              // Calculate sample recommendations if not stored in order
              let computedRecommendations = null;
              if (
                selectedOrder.tests &&
                selectedOrder.tests.length > 0
              ) {
                const testCodes = selectedOrder.tests.map(
                  (t: any) => t.testCode || t.testcode || t.code
                );
                computedRecommendations = getSampleRecommendations(testCodes);
              } else if (selectedOrder.source === "openEHR" && selectedOrder.service_name) {
                computedRecommendations = getRecommendationsByServiceName(selectedOrder.service_name, selectedOrder.description);
              }

              // Use stored data or computed recommendations
              const displayRecommendations =
                selectedOrder.sampleRecommendations || computedRecommendations;
              
              // Resolve tests for display - enrich with DB catalog specimen data
              let resolvedTests2: any[] = [];
              if (selectedOrder.tests && selectedOrder.tests.length > 0) {
                // Enrich LIMS tests with specimen info from DB catalog
                resolvedTests2 = selectedOrder.tests.map((t: any) => {
                  const code = t.testCode || t.testcode || t.code;
                  const name = t.testName || t.testname;
                  const existing = t.specimenType || t.specimentype || t.material;
                  const cat = existing ? null : resolveSpecimenFromCatalog(code, name);
                  return {
                    ...t,
                    specimenType: existing || (cat ? cat.sampleType : undefined),
                    containerType: t.containerType || t.containertype || t.specimencontainer || (cat ? cat.containerType : undefined),
                    specimenvolume: t.specimenvolume || t.volume,
                    fastingRequired: t.fastingRequired ?? false,
                  };
                });
              } else if (selectedOrder.source === "openEHR" && (selectedOrder.description || selectedOrder.service_name)) {
                const nameSource = selectedOrder.description || selectedOrder.service_name || "";
                const selectedTestsMatch = nameSource.match(/Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i);
                const testNames = selectedTestsMatch
                  ? selectedTestsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean)
                  : (selectedOrder.service_name || "").split(',').map((s: string) => s.trim()).filter(Boolean);
                if (testNames.length > 0) {
                  resolvedTests2 = testNames.map((name: string) => {
                    const cat = resolveSpecimenFromCatalog(undefined, name);
                    return {
                      testCode: cat?.testCode || name,
                      testName: name,
                      specimenType: cat?.sampleType,
                      containerType: cat?.containerType,
                      fastingRequired: false,
                    };
                  });
                } else if (displayRecommendations?.recommendations?.length > 0) {
                  resolvedTests2 = displayRecommendations.recommendations.map((r: any) => ({
                    testCode: r.testCode,
                    testName: r.testName,
                    specimenType: r.sampleType,
                    containerType: r.containerType,
                    specimenvolume: `${r.volume} ${r.volumeUnit}`,
                    fastingRequired: r.fastingRequired,
                  }));
                }
              } else if (displayRecommendations?.recommendations?.length > 0) {
                resolvedTests2 = displayRecommendations.recommendations.map((r: any) => ({
                    testCode: r.testCode,
                    testName: r.testName,
                    specimenType: r.sampleType,
                    containerType: r.containerType,
                    specimenvolume: `${r.volume} ${r.volumeUnit}`,
                    fastingRequired: r.fastingRequired,
                  }));
              }

              return (
                <div className="space-y-4 py-4">
                  {/* Order Info Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      Order Information
                    </div>
                    <div className="text-sm text-blue-700">
                      <div>
                        Order ID:{" "}
                        {selectedOrder.orderid || selectedOrder.request_id}
                      </div>
                      <div>
                        Patient:{" "}
                        {selectedOrder.patientName ||
                          selectedOrder.subjectidentifier}
                      </div>
                      <div>
                        Tests:{" "}
                        {resolvedTests2.length > 0
                          ? resolvedTests2.map((t: any) => t.testName).join(", ")
                          : selectedOrder.service_name || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Sample Collection Requirements from Order */}
                  {displayRecommendations && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" />
                        Recommended Sample Collection
                        {computedRecommendations && (
                          <span className="text-xs font-normal text-green-600">
                            (Auto-calculated)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm text-green-700">
                        {displayRecommendations?.fastingRequired && (
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              ⚠️ Fasting Required
                            </span>
                          </div>
                        )}
                      </div>
                      {displayRecommendations?.specialInstructions?.length >
                        0 && (
                        <div className="mt-2">
                          <strong className="text-sm text-green-900">
                            Special Instructions:
                          </strong>
                          <ul className="text-sm text-green-700 mt-1 space-y-1">
                            {displayRecommendations.specialInstructions.map(
                              (instruction: string, index: number) => (
                                <li key={index}>• {instruction}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sample Collection Form */}
                  <div className="space-y-4">
                    {/* Sample Number - Manual Entry */}
                    <div>
                      <Label
                        htmlFor="sampleNumber"
                        className="flex items-center gap-2"
                      >
                        Sample Number *
                        <span className="text-xs font-normal text-gray-500">
                          (Enter manually or auto-generated)
                        </span>
                      </Label>
                      <Input
                        id="sampleNumber"
                        type="text"
                        placeholder="e.g., S-2026-001234 or leave blank for auto-generation"
                        value={sampleCollectionData.sampleNumber || ""}
                        onChange={(e) =>
                          setSampleCollectionData((prev) => ({
                            ...prev,
                            sampleNumber: e.target.value,
                          }))
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter a custom sample number or leave blank to
                        auto-generate (format: S-YYYY-NNNNNN)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="accessionNumber" className="flex items-center gap-2">
                        Accession Number
                        <span className="text-xs font-normal text-gray-500">(Scan or type)</span>
                      </Label>
                      <Input
                        id="accessionNumber"
                        type="text"
                        placeholder="Scan or type accession number"
                        value={sampleCollectionData.accessionNumber || ""}
                        onChange={(e) =>
                          setSampleCollectionData((prev) => ({
                            ...prev,
                            accessionNumber: e.target.value,
                          }))
                        }
                        className="font-mono"
                      />
                    </div>

                    
                    <div>
                      <Label htmlFor="collectionDate">
                        Collection Date & Time *
                      </Label>
                      <Input
                        id="collectionDate"
                        type="datetime-local"
                        value={sampleCollectionData.collectionDate}
                        onChange={(e) =>
                          setSampleCollectionData((prev) => ({
                            ...prev,
                            collectionDate: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="collectorName">
                        Collector Name (Auto-filled)
                      </Label>
                      <Input
                        id="collectorName"
                        type="text"
                        value={sampleCollectionData.collectorName}
                        readOnly
                        className="bg-gray-50 cursor-not-allowed"
                        title="Automatically filled from your user profile"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically filled from your user profile
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="currentLocation">
                        Current Location (Auto-filled)
                      </Label>
                      <Input
                        id="currentLocation"
                        type="text"
                        value={sampleCollectionData.currentLocation}
                        readOnly
                        className="bg-gray-50 cursor-not-allowed"
                        title="Automatically filled from your workplace"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically filled from your workplace
                      </p>
                    </div>
                  </div>

                  {/* Comments/Notes Section */}
                  <div>
                    <Label htmlFor="sampleComments" className="text-sm font-medium">
                      Comments / Notes (Optional)
                    </Label>
                    <textarea
                      id="sampleComments"
                      placeholder="Add any notes about this sample collection (e.g., patient condition, special handling, etc.)"
                      value={sampleComments}
                      onChange={(e) => setSampleComments(e.target.value)}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Add any relevant notes about the sample collection
                    </p>
                  </div>

                  {/* Fasting Warning if applicable */}
                  {displayRecommendations?.fastingRequired && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 font-semibold text-sm">
                          ⚠️ Fasting Required
                        </span>
                      </div>
                      <p className="text-sm text-amber-800 mt-1">
                        Verify that the patient has fasted for 8-12 hours before
                        collecting this sample.
                      </p>
                    </div>
                  )}

                  {/* Show message if order is cancelled */}
                  {(openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED") && (() => {
                    let cancelledBy = selectedOrder?.cancelledbyname || null;
                    let cancelReason = selectedOrder?.cancellationreason || null;
                    if (!cancelledBy && selectedOrder?.narrative?.includes("[CANCELLED]")) {
                      const byMatch = selectedOrder.narrative.match(/Cancelled by:\s*([^|]+)/);
                      const reasonMatch = selectedOrder.narrative.match(/Reason:\s*([^|]+)/);
                      if (byMatch) cancelledBy = byMatch[1].trim();
                      if (reasonMatch) cancelReason = reasonMatch[1].trim();
                    }
                    return (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          ❌ Cannot collect sample: This order has been cancelled.
                        </div>
                        {(cancelledBy || cancelReason) && (
                          <div className="text-red-600">
                            {cancelledBy && <>Cancelled by <strong>{cancelledBy}</strong></>}
                            {cancelledBy && cancelReason && <> — </>}
                            {cancelReason && <>Reason: <em>{cancelReason}</em></>}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

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
              disabled={createSampleMutation.isPending || openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED"}
              onClick={() => {
                if (!selectedOrder) return;

                const sampleData: SampleData = {
                  sampleNumber: sampleCollectionData.sampleNumber || undefined,
                  accessionNumber:
                    sampleCollectionData.accessionNumber || undefined,
                  labCategory:
                    selectedOrder.test_category ||
                    ((selectedOrder as any)?.tests?.[0]?.testcategory as
                      | string
                      | undefined) ||
                    undefined,
                  collectionDate: new Date(
                    sampleCollectionData.collectionDate
                  ).toISOString(),
                  collectorName:
                    sampleCollectionData.collectorName || undefined,
                  orderId:
                    selectedOrder.orderid ||
                    selectedOrder.request_id ||
                    selectedOrder.composition_uid,
                  patientId: selectedOrder.subjectidentifier || undefined,
                  ehrId: selectedOrder.ehrid || undefined,
                  subjectIdentifier:
                    selectedOrder.subjectidentifier || undefined,
                  workspaceId: workspaceid,
                  currentLocation: sampleCollectionData.currentLocation,
                  tests:
                    selectedOrder.tests?.map(
                      (t: any) => t.testCode || t.testcode || t.testName || t
                    ) ||
                    (selectedOrder.service_name
                      ? [selectedOrder.service_name]
                      : []) ||
                    [],
                };

                console.log("Creating sample with data:", sampleData);
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

      {/* Alert Dialog for notifications */}
      <AlertDialog
        open={alertDialog.show}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, show: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                alertDialog.type === "error"
                  ? "text-red-600"
                  : alertDialog.type === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
              }
            >
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                setAlertDialog({ show: false, title: "", message: "" })
              }
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

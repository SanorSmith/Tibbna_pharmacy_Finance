/**
 * Orders Tab Component - LIMS Order Entry Module
 * - Create lab test orders with multi-select tests
 * - Validate against test catalog
 * - Support patient and research orders
 * - Role-based access control
 * - openEHR integration
 */
"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSampleRecommendations } from "@/lib/lims/test-recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { limsOrders } from "@/lib/db/tables/lims-order";
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
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  XCircle,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import EnhancedLabOrderForm from "@/components/shared/EnhancedLabOrderForm";
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
  middletname: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  // Standalone test search state
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [debouncedTestSearchTerm, setDebouncedTestSearchTerm] = useState("");
  const [showTestSearch, setShowTestSearch] = useState(false);
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

  // Debounce test search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTestSearchTerm(testSearchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [testSearchTerm]);

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

  // Fallback test catalog data
  const getFallbackTestCatalog = (searchTerm: string) => {
    const fallbackTests = [
      { testid: "1", testcode: "CBC", testname: "Complete Blood Count", testcategory: "Hematology", specimentype: "Blood", turnaroundtime: "2-4 hours" },
      { testid: "2", testcode: "CMP", testname: "Comprehensive Metabolic Panel", testcategory: "Chemistry", specimentype: "Blood", turnaroundtime: "1-2 hours" },
      { testid: "3", testcode: "LIP", testname: "Lipid Panel", testcategory: "Chemistry", specimentype: "Blood", turnaroundtime: "2-3 hours" },
      { testid: "4", testcode: "TSH", testname: "Thyroid Stimulating Hormone", testcategory: "Endocrinology", specimentype: "Blood", turnaroundtime: "1-2 days" },
      { testid: "5", testcode: "HBA1C", testname: "Hemoglobin A1C", testcategory: "Chemistry", specimentype: "Blood", turnaroundtime: "1-2 days" },
      { testid: "6", testcode: "UA", testname: "Urinalysis", testcategory: "Urinalysis", specimentype: "Urine", turnaroundtime: "1-2 hours" },
      { testid: "7", testcode: "CULT", testname: "Blood Culture", testcategory: "Microbiology", specimentype: "Blood", turnaroundtime: "2-5 days" },
      { testid: "8", testcode: "XRAY", testname: "Chest X-Ray", testcategory: "Radiology", specimentype: "N/A", turnaroundtime: "Same day" },
      { testid: "9", testcode: "ECG", testname: "Electrocardiogram", testcategory: "Cardiology", specimentype: "N/A", turnaroundtime: "Same day" },
      { testid: "10", testcode: "PSA", testname: "Prostate Specific Antigen", testcategory: "Chemistry", specimentype: "Blood", turnaroundtime: "1-2 days" },
    ];
    
    const filtered = fallbackTests.filter((test: any) => 
      test.testname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.testcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.testcategory?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log('Fallback filtered tests:', filtered);
    return { tests: filtered };
  };

  // Fetch test catalog for standalone test search
  const { data: testCatalogData } = useQuery({
    queryKey: ["test-catalog", workspaceid, debouncedTestSearchTerm],
    queryFn: async () => {
      console.log('Fetching test catalog for workspace:', workspaceid);
      
      try {
        const response = await fetch(
          `/api/lims/test-catalog?workspaceid=${workspaceid}`
        );
        if (!response.ok) {
          console.error('Failed to fetch test catalog:', response.status);
          // Return fallback data if API fails
          return getFallbackTestCatalog(debouncedTestSearchTerm);
        }
        const data = await response.json();
        console.log('Test catalog data:', data);
        
        // Filter tests based on search term
        const filteredTests = data.tests?.filter((test: any) => 
          test.testname?.toLowerCase().includes(debouncedTestSearchTerm.toLowerCase()) ||
          test.testcode?.toLowerCase().includes(debouncedTestSearchTerm.toLowerCase()) ||
          test.testcategory?.toLowerCase().includes(debouncedTestSearchTerm.toLowerCase())
        ) || [];
        
        console.log('Filtered tests:', filteredTests);
        
        // If no results from API, use fallback data
        if (filteredTests.length === 0) {
          return getFallbackTestCatalog(debouncedTestSearchTerm);
        }
        
        return { tests: filteredTests };
      } catch (error) {
        console.error('Error fetching test catalog:', error);
        return getFallbackTestCatalog(debouncedTestSearchTerm);
      }
    },
    enabled: showTestSearch && debouncedTestSearchTerm.length > 1,
  });

  const availableTests = testCatalogData?.tests || [];

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
    staleTime: 30000, // Consider data fresh for 30 seconds
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
        throw new Error(error.error || "Failed to create sample");
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Sample created successfully:", data);
      queryClient.invalidateQueries({
        queryKey: ["lims-accession", workspaceid],
      });
      queryClient.invalidateQueries({ queryKey: ["lims-orders", workspaceid] });
      setShowSampleCollection(false);
      setShowOrderDetail(false);
      // Show success message
      setAlertDialog({
        show: true,
        title: "Sample Collected Successfully",
        message: `Sample Number: ${data.sample.sampleNumber}\nAccession Number: ${data.sample.accessionNumber || "-"}\nBarcode: ${data.sample.barcode}\n\nOrder status updated to IN PROGRESS`,
        type: "success",
      });
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
        return <Badge variant="outline">Cancelled</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const orders: LimsOrder[] = data?.orders || [];

  // Fetch computed statuses for all OpenEHR orders when orders list changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      const fetchAllOpenEHRStatuses = async () => {
        const statusMap = new Map<string, string>();
        const openEHROrders = orders.filter(
          (o: LimsOrder) => o.source === "openEHR"
        );

        // Fetch statuses in parallel with error handling
        const statusPromises = openEHROrders.map(async (order) => {
          const requestId = order.request_id || order.openehrrequestid;
          if (!requestId) return null;

          try {
            const response = await fetch(
              `/api/d/${workspaceid}/openehr-orders/${requestId}/status`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(5000),
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              return { requestId, status: data.status };
            } else {
              console.warn(`Status API returned ${response.status} for ${requestId}`);
              return null;
            }
          } catch (error) {
            // Silently handle errors to prevent console spam
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn(`Timeout fetching status for ${requestId}`);
            } else {
              // Quiet error logging - only in development
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Status fetch failed for ${requestId}:`, error);
              }
            }
            return null;
          }
        });

        // Wait for all status fetches to complete
        const results = await Promise.allSettled(statusPromises);
        
        // Process successful results
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const { requestId, status } = result.value;
            statusMap.set(requestId, status);
          }
        });

        setOpenEHROrderStatuses(statusMap);
      };

      fetchAllOpenEHRStatuses();
    }
  }, [orders, workspaceid]);

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
    
    // Only show REQUESTED and CANCELLED orders
    const isAllowedStatus = orderStatus === "REQUESTED" || orderStatus === "CANCELLED";
    
    // Debug logging
    if (statusFilter !== "all") {
      console.log(`Order ${orderId}: status=${orderStatus}, filter=${statusFilter}, matches=${orderStatus === statusFilter}`);
    }
    
    const matchesStatus =
      statusFilter === "all" || orderStatus === statusFilter;

    return matchesSearch && matchesStatus && isAllowedStatus;
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

  const filteredOrders = Array.from(latestOrdersByTest.values());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lab Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">
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
                              {patient.name ||
                                patient.firstname + " " + patient.lastname ||
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
                        {selectedPatient.name ||
                          `${selectedPatient.firstname || ""} ${selectedPatient.lastname || ""}`.trim() ||
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
          <EnhancedLabOrderForm
            open={showOrderForm}
            onOpenChange={setShowOrderForm}
            onSubmit={handleSubmitOrder}
            patientId={currentPatientId}
            patientName={
              selectedPatient
                ? `${selectedPatient.firstname} ${selectedPatient.lastname}`
                : undefined
            }
          />
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
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

          {/* Standalone Test Search */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-blue-800">
                  Search Standalone Tests
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTestSearch(!showTestSearch)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  {showTestSearch ? "Hide" : "Show"} Search
                </Button>
              </div>
            </CardHeader>
            {showTestSearch && (
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testSearch" className="text-sm font-medium text-blue-800">
                    Search Tests
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="testSearch"
                      type="text"
                      className="w-full pl-10"
                      placeholder="Search by test name, code, or category..."
                      value={testSearchTerm}
                      onChange={(e) => setTestSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Test Search Results */}
                {testSearchTerm.length > 1 && (
                  <div className="max-h-[400px] overflow-y-auto bg-white rounded-md border border-blue-200">
                    {/* Debug Info */}
                    <div className="p-2 bg-gray-100 text-xs border-b">
                      Debug: Search term="{testSearchTerm}" | Debounced="{debouncedTestSearchTerm}" | 
                      Show search={showTestSearch} | Results={availableTests.length}
                    </div>
                    
                    {availableTests.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No tests found matching "{testSearchTerm}"
                      </div>
                    ) : (
                      <div className="divide-y divide-blue-100">
                        {availableTests.map((test: any) => (
                          <div
                            key={test.testid}
                            className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => {
                              // Handle test selection - could open order form or show details
                              console.log('Selected test:', test);
                              // You can implement what happens when a test is selected
                              // For example, open a quick order dialog or show test details
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-blue-900">{test.testname}</h4>
                                <p className="text-sm text-blue-700">Code: {test.testcode}</p>
                                <p className="text-sm text-muted-foreground">Category: {test.testcategory}</p>
                                {test.specimen && (
                                  <p className="text-sm text-muted-foreground">Specimen: {test.specimen}</p>
                                )}
                                {test.turnaroundtime && (
                                  <p className="text-sm text-muted-foreground">TAT: {test.turnaroundtime}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {test.testcategory}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Quick order functionality
                                    console.log('Quick order for:', test);
                                  }}
                                >
                                  Quick Order
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
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
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "order" : "orders"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold w-32">Order ID</TableHead>
                    <TableHead className="font-semibold w-40">Patient</TableHead>
                    <TableHead className="font-semibold w-48">
                      Test/Service
                    </TableHead>
                    <TableHead className="font-semibold w-24">Priority</TableHead>
                    <TableHead className="font-semibold w-28">Status</TableHead>
                    <TableHead className="font-semibold w-36">Provider</TableHead>
                    <TableHead className="font-semibold w-32">Order Date</TableHead>
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
                      const isOpenEHR = order.source === "openEHR";
                      const orderId =
                        order.orderid ||
                        order.composition_uid ||
                        order.request_id ||
                        "";
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
                console.log(
                  "Computing recommendations for test codes:",
                  testCodes
                );
                computedRecommendations = getSampleRecommendations(testCodes);
                console.log(
                  "Computed recommendations:",
                  computedRecommendations
                );
              }

              // Use stored data or computed recommendations
              const displayRecommendations =
                selectedOrder.sampleRecommendations || computedRecommendations;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
                  {/* Left Column - Order Information */}
                  <div className="space-y-4">
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
            const orderId = selectedOrder.orderid || selectedOrder.composition_uid || selectedOrder.request_id || "N/A";
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


                    {/* Requested Tests */}
                    <div className="border rounded-lg p-3">
                      <h3 className="font-semibold text-sm mb-2">
                        Requested Tests
                      </h3>

                      {selectedOrder.source === "openEHR" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 bg-gray-50 px-3 py-1 rounded text-left"
                              >
                                <FlaskConical className="h-4 w-4 text-gray-600" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {selectedOrder.service_name}
                                  </div>
                                  {selectedOrder.test_category && (
                                    <div className="text-xs text-gray-600 truncate">
                                      Category: {selectedOrder.test_category}
                                    </div>
                                  )}
                                  {selectedOrder.clinical_indication && (
                                    <div className="text-xs text-gray-600 truncate">
                                      Indication: {selectedOrder.clinical_indication}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              <div className="space-y-0.5">
                                <div className="font-medium">
                                  {selectedOrder.service_name}
                                </div>
                                {selectedOrder.test_category && (
                                  <div>
                                    <span className="font-medium">Category:</span>{" "}
                                    {selectedOrder.test_category}
                                  </div>
                                )}
                                {selectedOrder.clinical_indication && (
                                  <div>
                                    <span className="font-medium">Indication:</span>{" "}
                                    {selectedOrder.clinical_indication}
                                  </div>
                                )}
                                {(selectedOrder as any).request_id && (
                                  <div>
                                    <span className="font-medium">Request ID:</span>{" "}
                                    {(selectedOrder as any).request_id}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
                          <TooltipProvider>
                            {selectedOrder.tests?.map(
                              (test: any, idx: number) => (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-1 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left"
                                    >
                                      <FlaskConical className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate leading-tight">
                                          {test.testName}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate">
                                          {test.testCode}
                                        </div>

                                        {test.fastingRequired && (
                                          <span className="inline-block mt-0.5 text-[8px] font-medium bg-amber-100 text-amber-700 rounded px-1 py-0.5">
                                            F
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent sideOffset={6}>
                                    <div className="space-y-0.5">
                                      <div className="font-medium">{test.testName}</div>
                                      <div>
                                        <span className="font-medium">Code:</span> {test.testCode}
                                      </div>
                                      {(test.specimenType || test.specimentype || test.material) && (
                                        <div>
                                          <span className="font-medium">Specimen:</span>{" "}
                                          {test.specimenType || test.specimentype || test.material}
                                        </div>
                                      )}
                                      {typeof test.fastingRequired === "boolean" && (
                                        <div>
                                          <span className="font-medium">Fasting:</span>{" "}
                                          {test.fastingRequired ? "Required" : "Not required"}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            )}
                          </TooltipProvider>
                        </div>
                      )}
                    </div>

                    {/* Required Specimen Types */}
                    {selectedOrder.tests && selectedOrder.tests.length > 0 && (() => {
                      console.log('[OrdersTab] Order tests:', selectedOrder.tests);
                      console.log('[OrdersTab] First test:', selectedOrder.tests[0]);
                      
                      const specimenGroups = selectedOrder.tests.reduce((acc: any, test: any) => {
                        const specimen = test.specimenType || test.specimentype || test.material || "Not specified";
                        if (!acc[specimen]) {
                          acc[specimen] = {
                            tests: [],
                            containers: new Set(),
                            volumes: new Set()
                          };
                        }
                        acc[specimen].tests.push(test);
                        
                        // Collect container types
                        const container = test.containerType || test.containertype || test.specimencontainer;
                        if (container) acc[specimen].containers.add(container);
                        
                        // Collect volume requirements
                        const volume = test.specimenvolume || test.volume;
                        if (volume) acc[specimen].volumes.add(volume);
                        
                        return acc;
                      }, {});
                      
                      return (
                        <div className="border rounded-lg p-3">
                          <h3 className="font-semibold text-sm mb-2">Required Specimen Types</h3>
                          <div className="space-y-2">
                            {Object.entries(specimenGroups).map(([specimen, data]: [string, any]) => (
                              <div key={specimen} className="bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <FlaskConical className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-sm text-blue-900">{specimen}</span>
                                  <span className="text-xs text-blue-600">({data.tests.length} test{data.tests.length > 1 ? 's' : ''})</span>
                                </div>
                                
                                {/* Container and Volume Info - Single Line */}
                                <div className="ml-6 text-xs text-gray-700">
                                  {data.containers.size > 0 && <span><strong>Container:</strong> {Array.from(data.containers).join(', ')} • </span>}
                                  {data.volumes.size > 0 && <span><strong>Volume:</strong> {Array.from(data.volumes).join(', ')} • </span>}
                                  <span><strong>Tests:</strong> {data.tests.map((t: any) => t.testName).join(", ")}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Fasting Requirements Alert */}
                    {selectedOrder.tests?.some(
                      (t: any) => t.fastingRequired
                    ) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-600 font-semibold text-sm">
                            ⚠️ Fasting Required
                          </span>
                        </div>
                        <p className="text-sm text-amber-800 mt-1">
                          Some tests in this order require fasting (8-12 hours).
                          Ensure patient has fasted before sample collection.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Sample Collection */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-green-200 rounded-lg p-2.5">
                      <h3 className="font-semibold text-xs mb-2 flex items-center gap-1.5 text-green-900">
                        <FlaskConical className="h-3.5 w-3.5" />
                        Collect Sample
                      </h3>

                      {/* Sample Collection Requirements from Order - Single Line */}
                      <div className="mb-2.5 p-2 bg-white rounded border border-green-300">
                        <div className="text-[10px] font-medium text-green-800 mb-1">
                          Recommended Collection:
                        </div>
                        <div className="text-[10px] text-green-700">
                          {(selectedOrder.sampletype || selectedOrder.sampleType || displayRecommendations?.primarySampleType) && (
                            <span><strong>Sample:</strong> {selectedOrder.sampletype || selectedOrder.sampleType || displayRecommendations?.primarySampleType} • </span>
                          )}
                          {(selectedOrder.containertype || selectedOrder.containerType || displayRecommendations?.primaryContainer) && (
                            <span><strong>Container:</strong> {selectedOrder.containertype || selectedOrder.containerType || displayRecommendations?.primaryContainer} • </span>
                          )}
                          {(selectedOrder.volume || displayRecommendations?.totalVolume) && (
                            <span><strong>Volume:</strong> {selectedOrder.volume || displayRecommendations?.totalVolume} {selectedOrder.volumeunit || displayRecommendations?.volumeUnit || 'mL'}</span>
                          )}
                          {displayRecommendations?.fastingRequired && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 ml-2">
                              ⚠️ Fasting
                            </span>
                          )}
                          {displayRecommendations?.specialInstructions?.length > 0 && (
                            <span className="block mt-1"><strong>Method:</strong> {displayRecommendations.specialInstructions[0]}</span>
                          )}
                        </div>
                      </div>

                      {/* Sample Collection Form */}
                      <div className="space-y-2">
                        {/* Specimen Type Selection */}
                        {(() => {
                          // For local orders with tests array
                          if (selectedOrder.tests && selectedOrder.tests.length > 0) {
                            const specimenTypes = Array.from(new Set(
                              selectedOrder.tests.map((t: any) => 
                                t.specimenType || t.specimentype || t.material || "Not specified"
                              )
                            ));
                            
                            return (
                              <div>
                                <Label htmlFor="specimenTypeDetail" className="text-xs font-semibold">
                                  Specimen Type *
                                </Label>
                                <select
                                  id="specimenTypeDetail"
                                  title="Select specimen type for sample collection"
                                  value={sampleCollectionData.specimenType}
                                  onChange={(e) =>
                                    setSampleCollectionData((prev) => ({
                                      ...prev,
                                      specimenType: e.target.value,
                                    }))
                                  }
                                  className="w-full h-8 text-xs border border-gray-300 rounded px-2 bg-white"
                                >
                                  <option value="">Select specimen type...</option>
                                  {specimenTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                                {sampleCollectionData.specimenType && (
                                  <p className="text-[10px] text-blue-600 mt-1">
                                    Tests for this specimen: {selectedOrder.tests
                                      .filter((t: any) => 
                                        (t.specimenType || t.specimentype || t.material || "Not specified") === sampleCollectionData.specimenType
                                      )
                                      .map((t: any) => t.testName)
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          
                          // For openEHR orders without tests array - provide common specimen types
                          if (selectedOrder.source === "openEHR") {
                            const commonSpecimenTypes = [
                              "Blood",
                              "Venous blood",
                              "Arterial blood",
                              "Capillary blood",
                              "Urine",
                              "Serum",
                              "Plasma",
                              "Tissue",
                              "Saliva",
                              "Stool",
                              "Cerebrospinal fluid",
                              "Other"
                            ];
                            
                            return (
                              <div>
                                <Label htmlFor="specimenTypeDetail" className="text-xs font-semibold">
                                  Specimen Type *
                                </Label>
                                <select
                                  id="specimenTypeDetail"
                                  title="Select specimen type for sample collection"
                                  value={sampleCollectionData.specimenType}
                                  onChange={(e) =>
                                    setSampleCollectionData((prev) => ({
                                      ...prev,
                                      specimenType: e.target.value,
                                    }))
                                  }
                                  className="w-full h-8 text-xs border border-gray-300 rounded px-2 bg-white"
                                >
                                  <option value="">Select specimen type...</option>
                                  {commonSpecimenTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                                {sampleCollectionData.specimenType && (
                                  <p className="text-[10px] text-blue-600 mt-1">
                                    Service: {selectedOrder.service_name}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          
                          return null;
                        })()}

                        {/* Sample ID and Accession ID on one line */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label
                              htmlFor="sampleNumberDetail"
                              className="text-xs"
                            >
                              Sample ID
                            </Label>
                            <Input
                              id="sampleNumberDetail"
                              type="text"
                              placeholder="Auto-generated"
                              value={sampleCollectionData.sampleNumber || ""}
                              onChange={(e) =>
                                setSampleCollectionData((prev) => ({
                                  ...prev,
                                  sampleNumber: e.target.value,
                                }))
                              }
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <Label htmlFor="accessionNumberDetail" className="text-xs">
                              Accession ID
                            </Label>
                            <Input
                              id="accessionNumberDetail"
                              type="text"
                              placeholder="Scan or type"
                              value={sampleCollectionData.accessionNumber || ""}
                              onChange={(e) =>
                                setSampleCollectionData((prev) => ({
                                  ...prev,
                                  accessionNumber: e.target.value,
                                }))
                              }
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        
                        <div>
                          <Label
                            htmlFor="collectionDateDetail"
                            className="text-xs"
                          >
                            Collection Date *
                          </Label>
                          <Input
                            id="collectionDateDetail"
                            type="datetime-local"
                            value={sampleCollectionData.collectionDate}
                            onChange={(e) =>
                              setSampleCollectionData((prev) => ({
                                ...prev,
                                collectionDate: e.target.value,
                              }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label
                              htmlFor="collectorNameDetail"
                              className="text-xs"
                            >
                              Collector
                            </Label>
                            <Input
                              id="collectorNameDetail"
                              type="text"
                              value={sampleCollectionData.collectorName}
                              readOnly
                              className="h-8 text-xs bg-gray-50"
                            />
                          </div>

                          <div>
                            <Label htmlFor="locationDetail" className="text-xs">
                              Location
                            </Label>
                            <Input
                              id="locationDetail"
                              type="text"
                              value={sampleCollectionData.currentLocation}
                              readOnly
                              className="h-8 text-xs bg-gray-50"
                            />
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div>
                          <Label htmlFor="sampleCommentsDetail" className="text-xs">
                            Comments (Optional)
                          </Label>
                          <textarea
                            id="sampleCommentsDetail"
                            placeholder="Add notes about sample collection..."
                            value={sampleComments}
                            onChange={(e) => setSampleComments(e.target.value)}
                            rows={2}
                            className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                          disabled={
                            !sampleCollectionData.specimenType ||
                            createSampleMutation.isPending ||
                            openEHROrderStatus === "CANCELLED" ||
                            (selectedOrder?.status === "CANCELLED")
                          }
                          onClick={() => {
                            if (!selectedOrder || !sampleCollectionData.specimenType) return;

                            // Filter tests that match the selected specimen type
                            const testsForSpecimen = selectedOrder.tests?.filter(
                              (t: any) => 
                                (t.specimenType || t.specimentype || t.material || "Not specified") === sampleCollectionData.specimenType
                            ) || [];

                            const sampleData: SampleData = {
                              sampleNumber:
                                sampleCollectionData.sampleNumber || undefined,
                              accessionNumber:
                                sampleCollectionData.accessionNumber || undefined,
                              collectionDate: new Date(
                                sampleCollectionData.collectionDate
                              ).toISOString(),
                              collectorName:
                                sampleCollectionData.collectorName || undefined,
                              orderId:
                                selectedOrder.orderid ||
                                selectedOrder.request_id ||
                                selectedOrder.composition_uid,
                              patientId:
                                selectedOrder.subjectidentifier || undefined,
                              ehrId: selectedOrder.ehrid || undefined,
                              sampleType: sampleCollectionData.specimenType,
                              subjectIdentifier:
                                selectedOrder.subjectidentifier || undefined,
                              workspaceId: workspaceid,
                              currentLocation:
                                sampleCollectionData.currentLocation,
                              tests:
                                testsForSpecimen.map(
                                  (t: any) =>
                                    t.testCode || t.testcode || t.testName || t
                                ) || [],
                              comments: sampleComments || undefined,
                            };

                            createSampleMutation.mutate(sampleData);
                          }}
                        >
                          {createSampleMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Collecting...
                            </>
                          ) : (
                            <>
                              <FlaskConical className="h-3 w-3 mr-1" />
                              {!sampleCollectionData.specimenType 
                                ? "Select Specimen Type" 
                                : `Collect ${sampleCollectionData.specimenType} Sample`}
                            </>
                          )}
                        </Button>
                        
                        {/* Show message if order is cancelled */}
                        {(openEHROrderStatus === "CANCELLED" || selectedOrder?.status === "CANCELLED") && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Cannot collect sample:</strong> This order has been cancelled.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOrderDetail(false)}
            >
              Close
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
              }

              // Use stored data or computed recommendations
              const displayRecommendations =
                selectedOrder.sampleRecommendations || computedRecommendations;

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
                        {selectedOrder.source === "openEHR"
                          ? selectedOrder.service_name
                          : selectedOrder.tests
                              ?.map((t: any) => t.testName)
                              .join(", ")}
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
              disabled={createSampleMutation.isPending}
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

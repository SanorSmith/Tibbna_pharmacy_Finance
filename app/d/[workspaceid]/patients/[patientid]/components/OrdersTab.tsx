"use client";
import React, { useCallback, useEffect, useRef, useReducer, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History } from "lucide-react";

// ---------- Types ----------
export interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description?: string;
  clinical_indication: string;
  urgency: string;
  requested_date?: string;
  requesting_provider?: string;
  receiving_provider?: string;
  request_status?: string;
  timing?: string;
  request_id?: string;
  narrative?: string;
}

type TestOrderForm = {
  service_name: string;
  service_type_code: string; // snomed code
  service_type_value: string; // human readable
  clinical_indication: string;
  urgency: "routine" | "urgent" | "stat" | "asap";
  requesting_provider: string;
  receiving_provider: string;
  narrative: string;
};

interface OrdersTabProps {
  workspaceid: string;
  patientid: string;
  fullName?: string;
}

// ---------- Test Types ----------
const TEST_TYPES: Record<string, { code: string; value: string; name: string }> = {
  "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)" },
  "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel" },
  "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test" },
  "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test" },
  "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test" },
  "309902002": { code: "309902002", value: "Urinalysis", name: "Urinalysis" },
  "245670007": { code: "245670007", value: "Radiographic imaging", name: "X-Ray" },
  "169093000": { code: "169093000", value: "Magnetic resonance imaging", name: "MRI" },
};

const DEFAULT_FORM: TestOrderForm = {
  service_name: "",
  service_type_code: "104177005",
  service_type_value: TEST_TYPES["104177005"].value,
  clinical_indication: "",
  urgency: "routine",
  requesting_provider: "",
  receiving_provider: "Clinical Laboratory",
  narrative: "",
};

// ---------- Reducer ----------
type Action =
  | { type: "SET_FIELD"; field: keyof TestOrderForm; value: string | number | undefined }
  | { type: "SET_TEST_TYPE"; code: string }
  | { type: "RESET"; keepRequester?: string };

function formReducer(state: TestOrderForm, action: Action): TestOrderForm {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_TEST_TYPE": {
      const t = TEST_TYPES[action.code];
      if (!t) return state;
      return {
        ...state,
        service_name: t.name,
        service_type_code: t.code,
        service_type_value: t.value,
      };
    }
    case "RESET":
      return {
        ...DEFAULT_FORM,
        requesting_provider: action.keepRequester ?? "",
      };
    default:
      return state;
  }
}

// ---------- Component ----------
export default function OrdersTab({ workspaceid, patientid, fullName }: OrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = React.useState(false);
  const [testOrderRecords, setTestOrderRecords] = React.useState<TestOrderRecord[]>([]);
  const [loadingTestOrders, setLoadingTestOrders] = React.useState(false);
  const [loadingMoreTestOrders, setLoadingMoreTestOrders] = React.useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = React.useState(false);
  const [selectedTestOrder, setSelectedTestOrder] = React.useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = React.useState(false);

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_v2_${patientid}`;

  // form reducer
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);

  // memoized test types list used in selects
  const testTypesOptions = useMemo(() => Object.entries(TEST_TYPES), []);

  // load cached test orders on mount (sessionStorage)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.testOrders?.length) {
          setTestOrderRecords(parsed.testOrders);
          testOrdersOffsetRef.current = parsed.offset || parsed.testOrders.length;
          setTestOrdersHasMore(parsed.hasMore || false);
          hasLoadedTestOrders.current = true;
        }
      }
    } catch (e) {
      console.error("Failed to parse cached test orders", e);
    }
  }, [CACHE_KEY]);

  // Load current user and populate requesting provider
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        const currentUser = data.user;
        const provider = currentUser?.name || currentUser?.email || "Unknown Provider";
        if (mounted) {
          dispatch({ type: "SET_FIELD", field: "requesting_provider", value: provider });
        }
      } catch (err) {
        console.error("Failed to load user info", err);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, []);

  // Load test orders
  const loadTestOrders = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoadingTestOrders(true);
        setTestOrderRecords([]);
        testOrdersOffsetRef.current = 0;
      } else {
        setLoadingMoreTestOrders(true);
      }

      const offset = testOrdersOffsetRef.current;
      const limit = reset ? 2 : 3;
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=${limit}&offset=${offset}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        console.error("Failed to load test orders", res.status);
        return;
      }
      const data = await res.json();

      if (reset) {
        setTestOrderRecords(data.testOrders || []);
        testOrdersOffsetRef.current = (data.testOrders || []).length;
        hasLoadedTestOrders.current = true;
        // cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ testOrders: data.testOrders || [], hasMore: data.hasMore || false, offset: testOrdersOffsetRef.current }));
      } else {
        setTestOrderRecords(prev => {
          const newRecords = [...prev, ...(data.testOrders || [])];
          testOrdersOffsetRef.current = newRecords.length;
          return newRecords;
        });
      }
      setTestOrdersHasMore(data.hasMore || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTestOrders(false);
      setLoadingMoreTestOrders(false);
    }
  }, [workspaceid, patientid, CACHE_KEY]);

  useEffect(() => {
    if (!hasLoadedTestOrders.current) loadTestOrders(true);
  }, [loadTestOrders]);

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // Save order
  const saveTestOrder = useCallback(async () => {
    if (!formState.service_name || !formState.clinical_indication) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      // ensure latest user info and override requesting_provider with actual user
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      const currentUser = userData.user;
      const requesting = currentUser?.name || currentUser?.email || "Unknown Provider";

      console.log("=== NEW CODE V2 ===");
      console.log("DEBUG: currentUser:", currentUser);
      console.log("DEBUG: requesting_provider being sent:", requesting);
      console.log("DEBUG: urgency being sent:", formState.urgency);
      console.log("DEBUG: formState.requesting_provider (BEFORE override):", formState.requesting_provider);

      // Always use the current user's name, ignore what's in the form
      const orderData = { ...formState, requesting_provider: requesting };

      console.log("DEBUG: Final orderData being sent:", orderData);
      console.log("=== END DEBUG ===");

      const response = await fetch(`/api/d/${workspaceid}/patients/${patientid}/test-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOrder: orderData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save test order");
      }

      const result = await response.json();
      console.log("Saved test order", result);

      setShowTestOrderForm(false);
      dispatch({ type: "RESET", keepRequester: requesting });

      // reload list and clear cache
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      // small delay to allow backend to persist
      setTimeout(() => loadTestOrders(true), 500);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save test order");
    }
  }, [formState, workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  // Handlers
  const onFieldChange = useCallback((field: keyof TestOrderForm, value: string | number | undefined) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const onTestTypeChange = useCallback((code: string) => {
    dispatch({ type: "SET_TEST_TYPE", code });
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">Laboratory Test Orders</CardTitle>
            <div className="flex items-center gap-2">
              <Button className="bg-blue-500 hover:bg-blue-700 text-white flex items-center gap-1" size="sm" onClick={() => setShowTestOrderForm(true)}>
                <Plus className="h-4 w-4" />
                New Test Order
              </Button>

              {testOrdersHasMore && (
                <Button onClick={() => loadTestOrders(false)} disabled={loadingMoreTestOrders} variant="outline" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-2">
                  {loadingMoreTestOrders ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4" />
                      History
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingTestOrders ? (
            <div className="text-center py-8 text-muted-foreground">Loading test orders...</div>
          ) : testOrderRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No test orders have been recorded yet</div>
              <Button size="sm" onClick={() => setShowTestOrderForm(true)}>Add First Test Order</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Test Name</th>
                    <th className="text-left p-3 font-medium">Test Type</th>
                    <th className="text-left p-3 font-medium">Clinical Indication</th>
                    <th className="text-left p-3 font-medium">Urgency</th>
                    <th className="text-left p-3 font-medium">Date Ordered</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testOrderRecords.map((order, index) => (
                    <tr key={order.composition_uid} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'} hover:bg-muted/50 transition-colors`}>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{order.service_name}</div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{order.service_type_value || '-'}</td>
                      <td className="p-3">
                        <div className="max-w-xs"><p className="text-sm line-clamp-2">{order.clinical_indication}</p></div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          order.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                          order.urgency === 'stat' ? 'bg-red-100 text-red-800' :
                          order.urgency === 'asap' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>{order.urgency || 'routine'}</span>
                      </td>
                      <td className="p-3 text-sm">{new Date(order.recorded_time).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTestOrder(order); setShowTestOrderDetails(true); }}>Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showTestOrderForm} onOpenChange={setShowTestOrderForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Laboratory Test</DialogTitle>
            <DialogDescription>Create a new laboratory test request based on openEHR service request template</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label htmlFor="service_name" className="text-sm font-medium">Test Name *</label>
              <input id="service_name" type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="e.g., Complete Blood Count (CBC)" value={formState.service_name} onChange={(e) => onFieldChange("service_name", e.target.value)} aria-label="Test name" title="Enter the name of the laboratory test" />
            </div>

            {/* Service Type */}
            <div>
              <label htmlFor="service_type" className="text-sm font-medium">Test Type (SNOMED-CT)</label>
              <select id="service_type" className="w-full mt-1 px-3 py-2 border rounded-md" value={formState.service_type_code} onChange={(e) => onTestTypeChange(e.target.value)} aria-label="Test type" title="Select the type of laboratory test">
                <option value="">Select test type (optional)</option>
                {testTypesOptions.map(([code, meta]) => (
                  <option key={code} value={code}>{meta.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Selecting a test type will auto-fill the test name and SNOMED-CT codes</p>
            </div>

            {/* Clinical Indication */}
            <div>
              <label htmlFor="clinical_indication" className="text-sm font-medium">Clinical Indication *</label>
              <textarea id="clinical_indication" className="w-full mt-1 px-3 py-2 border rounded-md" rows={3} placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia." value={formState.clinical_indication} onChange={(e) => onFieldChange("clinical_indication", e.target.value)} aria-label="Clinical indication" title="Describe the clinical reason for ordering this test" />
            </div>

            {/* Urgency */}
            <div>
              <label htmlFor="urgency" className="text-sm font-medium">Urgency</label>
              <select id="urgency" className="w-full mt-1 px-3 py-2 border rounded-md" value={formState.urgency} onChange={(e) => onFieldChange("urgency", e.target.value)} aria-label="Urgency" title="Select the urgency of the test request">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
                <option value="asap">ASAP</option>
              </select>
            </div>

            {/* Receiving Laboratory */}
            <div>
              <label htmlFor="receiving_provider" className="text-sm font-medium">Receiving Laboratory/Department</label>
              <input id="receiving_provider" type="text" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Clinical Laboratory" value={formState.receiving_provider} onChange={(e) => onFieldChange("receiving_provider", e.target.value)} aria-label="Receiving provider" title="Laboratory or department that will perform the test" />
            </div>

            {/* Narrative */}
            <div>
              <label htmlFor="narrative" className="text-sm font-medium">Narrative Summary</label>
              <textarea id="narrative" className="w-full mt-1 px-3 py-2 border rounded-md" rows={2} placeholder="Brief summary of the test order" value={formState.narrative} onChange={(e) => onFieldChange("narrative", e.target.value)} aria-label="Narrative summary" title="Brief narrative summary of the test order" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTestOrderForm(false)}>Cancel</Button>
              <Button className="bg-black hover:bg-black/80 text-white" onClick={saveTestOrder}>Order Test</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showTestOrderDetails} onOpenChange={setShowTestOrderDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>Complete information about this laboratory test order</DialogDescription>
          </DialogHeader>

          {selectedTestOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Test Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Test Name:</span>
                    <p className="font-medium">{selectedTestOrder.service_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Test Type:</span>
                    <p className="font-medium">{selectedTestOrder.service_type_value || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Test Type Code:</span>
                    <p className="font-medium">{selectedTestOrder.service_type_code || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Urgency:</span>
                    <p className="font-medium capitalize">{selectedTestOrder.urgency || 'routine'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Clinical Information</h4>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Clinical Indication:</span>
                  <p className="text-sm mt-1">{selectedTestOrder.clinical_indication || 'Not specified'}</p>
                </div>
                {selectedTestOrder.description && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">Description:</span>
                    <p className="text-sm mt-1">{selectedTestOrder.description}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium">Provider Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Requesting Provider:</span>
                    <p className="font-medium">{selectedTestOrder.requesting_provider || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Receiving Laboratory:</span>
                    <p className="font-medium">{selectedTestOrder.receiving_provider || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {selectedTestOrder.narrative && (
                <div>
                  <h4 className="font-medium">Narrative</h4>
                  <p className="text-sm mt-1">{selectedTestOrder.narrative}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Date Ordered:</span>
                    <p className="text-sm">{new Date(selectedTestOrder.recorded_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Request ID:</span>
                    <p className="text-sm">{selectedTestOrder.request_id || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestOrderDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


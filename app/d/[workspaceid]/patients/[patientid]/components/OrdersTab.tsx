"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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

// Test Orders interfaces
export interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requested_date: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  timing: string;
  request_id: string;
  narrative: string;
}

interface OrdersTabProps {
  workspaceid: string;
  patientid: string;
  fullName: string;
}

export function OrdersTab({ workspaceid, patientid, fullName }: OrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>(
    []
  );
  const [loadingTestOrders, setLoadingTestOrders] = useState(false);
  const [loadingMoreTestOrders, setLoadingMoreTestOrders] = useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = useState(false);
  const [selectedTestOrder, setSelectedTestOrder] = useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = useState(false);
  const testOrdersOffsetRef = useRef(0);
  const [testOrderForm, setTestOrderForm] = useState({
    service_name: "",
    service_type_code: "104177005",
    service_type_value: "Complete blood count (procedure)",
    clinical_indication: "",
    urgency: "routine",
    requesting_provider: "", // Will be populated with current user info
    receiving_provider: "Clinical Laboratory",
    narrative: "",
  });

  // Load current user info on component mount
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const userData = await response.json();
        const currentUser = userData.user;
        
        if (currentUser) {
          setTestOrderForm(prev => ({
            ...prev,
            requesting_provider: currentUser.name || currentUser.email || "Unknown Provider"
          }));
        }
      } catch (error) {
        console.error("Failed to load user info:", error);
      }
    };

    loadUserInfo();
  }, []);

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
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=10&offset=${offset}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("Test orders loaded:", data);
        
        if (reset) {
          setTestOrderRecords(data.testOrders || []);
          testOrdersOffsetRef.current = (data.testOrders || []).length;
        } else {
          setTestOrderRecords(prev => {
            const newRecords = [...prev, ...(data.testOrders || [])];
            testOrdersOffsetRef.current = newRecords.length;
            return newRecords;
          });
        }
        setTestOrdersHasMore(data.hasMore || false);
      } else {
        console.error("Failed to load test orders:", res.status);
      }
    } catch (error) {
      console.error("Error loading test orders:", error);
    } finally {
      setLoadingTestOrders(false);
      setLoadingMoreTestOrders(false);
    }
  }, [workspaceid, patientid]);

  // Load test orders when component mounts
  useEffect(() => {
    loadTestOrders(true);
  }, [loadTestOrders]);

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const saveTestOrder = async () => {
    if (!testOrderForm.service_name || !testOrderForm.clinical_indication) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      console.log("Saving test order with data:", testOrderForm);
      
      // Get current user info to ensure consistency
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      const currentUser = userData.user;
      
      const orderData = {
        ...testOrderForm,
        requesting_provider: currentUser?.name || currentUser?.email || "Unknown Provider"
      };

      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testOrder: orderData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save test order"
        );
      }

      const result = await response.json();
      console.log("Test order saved successfully:", result);

      setShowTestOrderForm(false);
      // Reset form but keep the user info
      setTestOrderForm({
        service_name: "",
        service_type_code: "104177005",
        service_type_value: "Complete blood count (procedure)",
        clinical_indication: "",
        urgency: "routine",
        requesting_provider: currentUser?.name || currentUser?.email || "Unknown Provider",
        receiving_provider: "Clinical Laboratory",
        narrative: "",
      });
      
      // Wait a moment for the composition to be available, then reload
      setTimeout(() => {
        loadTestOrders();
      }, 500);
    } catch (error) {
      console.error("Error saving test order:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save test order"
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">Laboratory Test Orders</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                className="bg-blue-500 hover:bg-blue-700 text-white flex items-center gap-1"
                size="sm" 
                onClick={() => setShowTestOrderForm(true)}
              >
                <Plus className="h-4 w-4" />
                New Test Order
              </Button>

              {testOrdersHasMore && (
                <Button
                  onClick={() => loadTestOrders(false)}
                  disabled={loadingMoreTestOrders}
                  variant="outline"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-2"
                >
                  {loadingMoreTestOrders ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
              <Button size="sm" onClick={() => setShowTestOrderForm(true)}>
                Add First Test Order
              </Button>
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
                          {order.service_type_value && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {order.service_type_value}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {order.service_type_code || '-'}
                      </td>
                      <td className="p-3">
                        <div className="max-w-xs">
                          <p className="text-sm line-clamp-2">{order.clinical_indication}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          order.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                          order.urgency === 'stat' ? 'bg-red-100 text-red-800' :
                          order.urgency === 'asap' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.urgency || 'routine'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(order.recorded_time).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTestOrder(order);
                            setShowTestOrderDetails(true);
                          }}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Order Form Dialog */}
      <Dialog open={showTestOrderForm} onOpenChange={setShowTestOrderForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Laboratory Test</DialogTitle>
            <DialogDescription>
              Create a new laboratory test request based on openEHR service request template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <label htmlFor="service_name" className="text-sm font-medium">
                Test Name *
              </label>
              <input
                id="service_name"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="e.g., Complete Blood Count (CBC)"
                value={testOrderForm.service_name}
                onChange={(e) =>
                  setTestOrderForm({
                    ...testOrderForm,
                    service_name: e.target.value,
                  })
                }
                aria-label="Test name"
                title="Enter the name of the laboratory test"
              />
            </div>

            {/* Service Type */}
            <div>
              <label htmlFor="service_type" className="text-sm font-medium">
                Test Type (SNOMED-CT)
              </label>
              <select
                id="service_type"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={testOrderForm.service_type_code}
                onChange={(e) => {
                  const selected = e.target.value;
                  const testTypes: Record<string, { code: string; value: string; name: string }> = {
                    "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)" },
                    "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel" },
                    "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test" },
                    "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test" },
                    "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test" },
                    "309902002": { code: "309902002", value: "Urinalysis", name: "Urinalysis" },
                    "245670007": { code: "245670007", value: "Radiographic imaging", name: "X-Ray" },
                    "169093000": { code: "169093000", value: "Magnetic resonance imaging", name: "MRI" },
                  };
                  
                  const selectedType = testTypes[selected];
                  if (selectedType) {
                    setTestOrderForm({
                      ...testOrderForm,
                      service_name: selectedType.name,
                      service_type_code: selectedType.code,
                      service_type_value: selectedType.value,
                    });
                  }
                }}
                aria-label="Test type"
                title="Select the type of laboratory test"
              >
                <option value="">Select test type (optional)</option>
                <option value="104177005">Complete Blood Count (CBC)</option>
                <option value="257051000">Comprehensive Metabolic Panel</option>
                <option value="116276005">Blood Glucose</option>
                <option value="271749007">Serum Cholesterol</option>
                <option value="271658002">Serum Triglycerides</option>
                <option value="309902002">Urinalysis</option>
                <option value="245670007">X-Ray</option>
                <option value="169093000">MRI</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a test type will auto-fill the test name and SNOMED-CT codes
              </p>
            </div>

            {/* Clinical Indication */}
            <div>
              <label htmlFor="clinical_indication" className="text-sm font-medium">
                Clinical Indication *
              </label>
              <textarea
                id="clinical_indication"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={3}
                placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia."
                value={testOrderForm.clinical_indication}
                onChange={(e) =>
                  setTestOrderForm({
                    ...testOrderForm,
                    clinical_indication: e.target.value,
                  })
                }
                aria-label="Clinical indication"
                title="Describe the clinical reason for ordering this test"
              />
            </div>

            {/* Urgency */}
            <div>
              <label htmlFor="urgency" className="text-sm font-medium">
                Urgency
              </label>
              <select
                id="urgency"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={testOrderForm.urgency}
                onChange={(e) =>
                  setTestOrderForm({
                    ...testOrderForm,
                    urgency: e.target.value,
                  })
                }
                aria-label="Urgency"
                title="Select the urgency of the test request"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
                <option value="asap">ASAP</option>
              </select>
            </div>

            {/* Requesting Provider */}
            <div>
              <label htmlFor="requesting_provider" className="text-sm font-medium">
                Requesting Provider
              </label>
              <input
                id="requesting_provider"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50"
                placeholder="Current user"
                value={testOrderForm.requesting_provider}
                readOnly
                aria-label="Requesting provider"
                title="Automatically set to current logged-in user"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Automatically set to current logged-in user
              </p>
            </div>

            {/* Receiving Laboratory */}
            <div>
              <label htmlFor="receiving_provider" className="text-sm font-medium">
                Receiving Laboratory/Department
              </label>
              <input
                id="receiving_provider"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="Clinical Laboratory"
                value={testOrderForm.receiving_provider}
                onChange={(e) =>
                  setTestOrderForm({
                    ...testOrderForm,
                    receiving_provider: e.target.value,
                  })
                }
                aria-label="Receiving provider"
                title="Laboratory or department that will perform the test"
              />
            </div>

            {/* Narrative */}
            <div>
              <label htmlFor="narrative" className="text-sm font-medium">
                Narrative Summary
              </label>
              <textarea
                id="narrative"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief summary of the test order"
                value={testOrderForm.narrative}
                onChange={(e) =>
                  setTestOrderForm({
                    ...testOrderForm,
                    narrative: e.target.value,
                  })
                }
                aria-label="Narrative summary"
                title="Brief narrative summary of the test order"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTestOrderForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-black hover:bg-black/80 text-white"
                onClick={saveTestOrder}
              >
                Order Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Order Details Dialog */}
      <Dialog open={showTestOrderDetails} onOpenChange={setShowTestOrderDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>
              Complete information about this laboratory test order
            </DialogDescription>
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
            <Button variant="outline" onClick={() => setShowTestOrderDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

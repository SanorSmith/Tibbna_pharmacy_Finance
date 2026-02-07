"use client";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History, Package, TestTube, Edit, Trash2, Printer } from "lucide-react";
import EnhancedLabOrderFormMultiple from "@/components/shared/EnhancedLabOrderFormMultiple";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  test_category?: string;
  is_package?: boolean;
  target_lab?: string;
}

interface EnhancedOrdersTabProps {
  workspaceid: string;
  patientid: string;
}

// ---------- Component ----------
export default function EnhancedOrdersTab({
  workspaceid,
  patientid,
}: EnhancedOrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>(
    []
  );
  const [olderTestOrders, setOlderTestOrders] = useState<TestOrderRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = useState(false);
  const [selectedTestOrder, setSelectedTestOrder] =
    useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = useState(false);
  const [savingTestOrder, setSavingTestOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TestOrderRecord | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<TestOrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEditNotSupportedDialog, setShowEditNotSupportedDialog] = useState(false);

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_enhanced_${patientid}`;

  // Use React Query for caching test orders
  const { data: testOrdersData, isLoading: loadingTestOrders, refetch } = useQuery({
    queryKey: ["test-orders", workspaceid, patientid, 4, 0],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=4&offset=0`
      );
      if (!res.ok) {
        throw new Error("Failed to load test orders");
      }
      const data = await res.json();
      return { testOrders: data.testOrders || [], hasMore: data.hasMore || false };
    },
  });

  // Set test order records from React Query data
  useEffect(() => {
    if (testOrdersData) {
      setTestOrderRecords(testOrdersData.testOrders);
      setTestOrdersHasMore(testOrdersData.hasMore);
      testOrdersOffsetRef.current = testOrdersData.testOrders.length;
      hasLoadedTestOrders.current = true;
    }
  }, [testOrdersData]);

  // Load history - toggle visibility and fetch if needed
  const loadTestOrders = useCallback(
    async (reset = true) => {
      if (reset) {
        refetch();
      } else {
        // Toggle history visibility
        if (showHistory) {
          setShowHistory(false);
        } else {
          // Load history if not already loaded
          if (olderTestOrders.length === 0) {
            setLoadingHistory(true);
            try {
              const offset = testOrdersOffsetRef.current;
              const limit = 20;
              const res = await fetch(
                `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=${limit}&offset=${offset}`
              );
              
              if (!res.ok) {
                console.error("Failed to load history", res.status);
                return;
              }
              
              const data = await res.json();
              setOlderTestOrders(data.testOrders || []);
              setTestOrdersHasMore(data.hasMore || false);
            } catch (err) {
              console.error("Error loading history:", err);
            } finally {
              setLoadingHistory(false);
            }
          }
          setShowHistory(true);
        }
      }
    },
    [refetch, workspaceid, patientid, showHistory, olderTestOrders.length]
  )

  // Save order - now receives data from EnhancedLabOrderFormMultiple
  const saveTestOrder = useCallback(async (submissionData: any) => {
    setSavingTestOrder(true);

    try {
      // The submissionData already comes formatted from EnhancedLabOrderFormMultiple
      // Just pass it to the API
      console.log("Creating test order - this may take up to 30 seconds...");
      console.log("Submission data:", submissionData);

      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testOrder: submissionData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save test order");
      }

      const result = await response.json();
      console.log("Saved test order", result);

      setShowTestOrderForm(false);

      // reload list
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 100);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save test order";

      // Provide more specific error messages
      if (errorMessage.includes("taking too long")) {
        alert(
          "The EHR system is responding slowly. Please try again in a moment."
        );
      } else {
        alert(errorMessage);
      }
    } finally {
      setSavingTestOrder(false);
    }
  }, [workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  // Handle edit order
  const handleEditOrder = useCallback((order: TestOrderRecord) => {
    // Transform order data to match form structure
    const formData = {
      // Preserve original order metadata
      composition_uid: order.composition_uid,
      recorded_time: order.recorded_time,
      
      // Form fields
      target_lab: order.target_lab || order.receiving_provider || "",
      selectedPackages: [], // We don't have this info from the order, so empty array
      selectedTests: [], // We don't have individual test IDs, so empty array
      clinical_indication: order.clinical_indication || "",
      urgency: order.urgency || "routine",
      requesting_provider: order.requesting_provider || "",
      narrative: order.narrative || "",
      sampleType: "",
      containerType: "",
      volume: "",
      volumeUnit: "mL",
      sampleRecommendations: {
        primarySampleType: "",
        primaryContainer: "",
        totalVolume: 0,
        volumeUnit: "mL",
        fastingRequired: false,
        recommendations: [],
        specialInstructions: [],
      },
    };
    
    setEditingOrder(formData as any);
    setShowEditForm(true);
  }, []);

  // Handle update order
  const handleUpdateOrder = useCallback(async (formData: any) => {
    if (!editingOrder) return;
    
    setSavingTestOrder(true);
    try {
      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders/${editingOrder.composition_uid}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testOrder: formData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update order");
      }

      setShowEditForm(false);
      setEditingOrder(null);
      
      // Reload list and clear cache
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 500);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update order");
    } finally {
      setSavingTestOrder(false);
    }
  }, [editingOrder, workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  // Handle cancel order
  const handleCancelOrder = useCallback(async () => {
    if (!orderToCancel) return;
    
    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders/${orderToCancel.composition_uid}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            reason: cancelReason || "Cancelled by doctor" 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel order");
      }

      setShowCancelDialog(false);
      setOrderToCancel(null);
      setCancelReason("");
      
      // Reload list and clear cache
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 500);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  }, [orderToCancel, cancelReason, workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  return (
    <>
       <Card className="bg-card-bg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">
              Laboratory Test Orders
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                size="sm"
                onClick={() => setShowTestOrderForm(true)}
              >
                <Plus className="h-4 w-4" />
                New Test Order
              </Button>

              {(testOrdersHasMore || olderTestOrders.length > 0) && (
                <Button
                  onClick={() => loadTestOrders(false)}
                  disabled={loadingHistory}
                  variant="outline"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 hover:text-white text-white border-none flex items-center gap-1 text-xs"
                >
                  {loadingHistory ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <History className="w-3 h-3" />
                  )}
                  {loadingHistory ? "Loading..." : showHistory ? "Hide History" : "Show History"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingTestOrders ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading test orders...
            </div>
          ) : testOrderRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No test orders have been recorded yet
              </div>
              <Button size="sm" onClick={() => setShowTestOrderForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                Add First Test Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-blue-100/90 text-blue-800">
                    <th className="text-left p-3 font-medium">Test Name</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Target Lab</th>
                    <th className="text-left p-3 font-medium">Urgency</th>
                    <th className="text-left p-3 font-medium">Date Ordered</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testOrderRecords.map((order, index) => (
                    <tr
                      key={`${order.composition_uid}-${index}`}
                      className={`border-b ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/25"
                      } hover:bg-muted/50 transition-colors`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {order.is_package ? (
                            <Package className="h-4 w-4 text-blue-500" />
                          ) : (
                            <TestTube className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {order.service_name}
                            </div>
                            {order.description && order.description.trim() ? (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {order.description}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {order.clinical_indication || "No additional details"}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {order.test_category && (
                          <Badge variant="outline" className="text-xs">
                            {order.test_category}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm">{order.target_lab || "-"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${
                            order.urgency === "urgent"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {order.urgency || "routine"}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(order.recorded_time).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTestOrder(order);
                              setShowTestOrderDetails(true);
                            }}
                            className="bg-blue-100/90 hover:bg-blue-200"
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            onClick={() => {
                              setOrderToCancel(order);
                              setShowCancelDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* History Section - Collapsible */}
          {showHistory && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-muted-foreground">Order History</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Hide History
                </Button>
              </div>
              
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading history...
                </div>
              ) : olderTestOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No older test orders found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-sm">Test Name</th>
                        <th className="text-left p-3 font-medium text-sm">Category</th>
                        <th className="text-left p-3 font-medium text-sm">Target Lab</th>
                        <th className="text-left p-3 font-medium text-sm">Urgency</th>
                        <th className="text-left p-3 font-medium text-sm">Date Ordered</th>
                        <th className="text-left p-3 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {olderTestOrders.map((order, index) => (
                        <tr
                          key={`${order.composition_uid}-history-${index}`}
                          className={`border-b ${
                            index % 2 === 0 ? "bg-background" : "bg-muted/25"
                          } hover:bg-muted/50 transition-colors`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {order.is_package ? (
                                <Package className="h-4 w-4 text-blue-500" />
                              ) : (
                                <TestTube className="h-4 w-4 text-green-500" />
                              )}
                              <div>
                                <div className="font-medium text-sm">
                                  {order.service_name}
                                </div>
                                {order.description && order.description.trim() ? (
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {order.description}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {order.clinical_indication || "No additional details"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {order.test_category && (
                              <Badge variant="outline" className="text-xs">
                                {order.test_category}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm">{order.target_lab || "-"}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full capitalize ${
                                order.urgency === "urgent"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {order.urgency || "routine"}
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
                              className="bg-blue-100/90 hover:bg-blue-200"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog - Using Multiple Selection Component */}
      <EnhancedLabOrderFormMultiple
        open={showEditForm || showTestOrderForm}
        onOpenChange={(open) => {
          if (showEditForm) {
            setShowEditForm(open);
            if (!open) setEditingOrder(null);
          } else {
            setShowTestOrderForm(open);
          }
        }}
        onSubmit={showEditForm ? handleUpdateOrder : saveTestOrder}
        editMode={showEditForm}
        initialData={editingOrder}
        workspaceid={workspaceid}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Test Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this test order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason for Cancellation (Optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancelling this order..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCancelReason(""); setOrderToCancel(null); }}>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Not Supported Dialog */}
      <AlertDialog open={showEditNotSupportedDialog} onOpenChange={setShowEditNotSupportedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Order Editing Not Supported</AlertDialogTitle>
            <AlertDialogDescription>
              Order editing is not currently supported due to OpenEHR composition complexity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 mb-3">
              To modify this order, please follow these steps:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Cancel the existing order</li>
              <li>Create a new order with the updated information</li>
            </ol>
            <p className="text-sm text-gray-600 mt-4 italic">
              This approach preserves the complete audit trail.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowEditNotSupportedDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Enhanced Details Dialog */}
      <Dialog
        open={showTestOrderDetails}
        onOpenChange={setShowTestOrderDetails}
      >
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>
              Complete information about this laboratory test order
            </DialogDescription>
          </DialogHeader>

          {selectedTestOrder && (
            <div id="printable-order-details-enhanced" className="space-y-3">
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-xs text-gray-500">Test Name</span><p className="font-medium">{selectedTestOrder.service_name}</p></div>
                <div><span className="text-xs text-gray-500">Category</span><p className="font-medium">{selectedTestOrder.test_category ? <Badge variant="outline" className="text-xs">{selectedTestOrder.test_category}</Badge> : "—"}</p></div>
                <div><span className="text-xs text-gray-500">Target Lab</span><p className="font-medium">{selectedTestOrder.target_lab || "—"}</p></div>
                <div><span className="text-xs text-gray-500">Urgency</span><p><span className={`px-2 py-0.5 text-xs rounded-full capitalize ${selectedTestOrder.urgency === "urgent" ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}>{selectedTestOrder.urgency || "routine"}</span></p></div>
                <div><span className="text-xs text-gray-500">Date Ordered</span><p>{new Date(selectedTestOrder.recorded_time).toLocaleString()}</p></div>
                <div><span className="text-xs text-gray-500">Request ID</span><p className="truncate">{selectedTestOrder.request_id || "—"}</p></div>
              </div>

              {selectedTestOrder.description && (() => {
                const parts: Record<string, string> = {};
                selectedTestOrder.description.split('|').forEach((part: string) => {
                  const trimmed = part.trim();
                  const colonIdx = trimmed.indexOf(':');
                  if (colonIdx > 0) {
                    parts[trimmed.slice(0, colonIdx).trim()] = trimmed.slice(colonIdx + 1).trim();
                  }
                });
                const entries = Object.entries(parts);
                return entries.length > 1 ? (
                  <div className="bg-blue-50 px-3 py-2.5 rounded">
                    <span className="text-xs font-medium text-blue-900">Test Details</span>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-1">
                      {entries.map(([key, val]) => (
                        <div key={key}><span className="text-xs text-blue-700">{key}</span><p className="text-sm font-medium text-blue-900">{val}</p></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 px-3 py-2.5 rounded text-sm">
                    <span className="text-xs font-medium text-blue-900">Test Details:</span>
                    <p className="text-blue-800 mt-1 whitespace-pre-wrap">{selectedTestOrder.description}</p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-xs text-gray-500">Clinical Indication</span><p>{selectedTestOrder.clinical_indication || "—"}</p></div>
                {selectedTestOrder.narrative && <div className="col-span-2"><span className="text-xs text-gray-500">Narrative</span><p>{selectedTestOrder.narrative}</p></div>}
                <div><span className="text-xs text-gray-500">Requesting Provider</span><p className="font-medium">{selectedTestOrder.requesting_provider || "—"}</p></div>
                <div><span className="text-xs text-gray-500">Receiving Laboratory</span><p className="font-medium">{selectedTestOrder.receiving_provider || "—"}</p></div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedTestOrder) return;
                const { generateLabOrderHTML } = await import('@/lib/lims/lab-order-html');
                const html = generateLabOrderHTML({
                  facilityName: selectedTestOrder.receiving_provider || 'Laboratory',
                  serviceName: selectedTestOrder.service_name,
                  serviceTypeValue: selectedTestOrder.service_type_value,
                  serviceTypeCode: selectedTestOrder.service_type_code,
                  testCategory: selectedTestOrder.test_category,
                  targetLab: selectedTestOrder.target_lab,
                  urgency: selectedTestOrder.urgency,
                  clinicalIndication: selectedTestOrder.clinical_indication,
                  narrative: selectedTestOrder.narrative,
                  description: selectedTestOrder.description,
                  requestingProvider: selectedTestOrder.requesting_provider,
                  receivingProvider: selectedTestOrder.receiving_provider,
                  recordedTime: selectedTestOrder.recorded_time,
                  requestId: selectedTestOrder.request_id,
                  requestStatus: selectedTestOrder.request_status,
                });
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(html);
                  printWindow.document.close();
                }
              }}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Order
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTestOrderDetails(false)}
              className="bg-blue-200/90 hover:bg-blue-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

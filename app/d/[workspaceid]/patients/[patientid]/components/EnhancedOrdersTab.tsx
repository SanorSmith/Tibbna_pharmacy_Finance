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
import { Plus, History, Package, TestTube, Edit, Trash2, Printer, ShieldAlert, Ban, Loader2 } from "lucide-react";
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
  status?: string;
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
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<TestOrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [showNotAuthorizedDialog, setShowNotAuthorizedDialog] = useState(false);
  const [notAuthorizedCreator, setNotAuthorizedCreator] = useState<string>("");
  const [showAlreadyCancelledDialog, setShowAlreadyCancelledDialog] = useState(false);

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_enhanced_${patientid}`;

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        const u = data.user;
        setCurrentUserName(u?.name || u?.email || null);
      })
      .catch(() => {});
  }, []);

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

  // Handle edit order - fetch full details from OpenEHR and reverse-match to catalog
  const handleEditOrder = useCallback(async (order: TestOrderRecord) => {
    setEditingOrder(order);
    setIsLoadingEdit(true);

    try {
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders/${order.composition_uid}`
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("GET order details failed:", res.status, errBody);
        throw new Error(errBody.error || "Failed to fetch order details");
      }

      const data = await res.json();
      const o = data.order;

      // Build form data matching TestOrderForm shape for EnhancedLabOrderFormMultiple
      setEditFormData({
        target_lab: o.matched_lab_id || "",
        selectedPackages: o.matched_package_ids || [],
        selectedTests: o.matched_test_ids || [],
        clinical_indication: o.clinical_indication || "",
        urgency: o.urgency || "routine",
        requesting_provider: o.requesting_provider || "",
        narrative: o.narrative || "",
        sampleType: "",
        containerType: "",
        volume: "",
        volumeUnit: "mL",
      });
      // Only open form AFTER data is ready (avoids Radix Dialog conflict)
      setShowEditForm(true);
    } catch (err) {
      console.error("Error loading order for edit:", err);
      alert("Failed to load order details for editing");
      setEditingOrder(null);
    } finally {
      setIsLoadingEdit(false);
    }
  }, [workspaceid, patientid]);

  // Handle update order - receives full submission data from EnhancedLabOrderFormMultiple
  const handleUpdateOrder = useCallback(async (submissionData: any) => {
    if (!editingOrder) return;

    try {
      const response = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders/${editingOrder.composition_uid}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testOrder: {
              service_name: submissionData.service_name,
              description: submissionData.description,
              clinical_indication: submissionData.clinical_indication,
              requesting_provider: submissionData.requesting_provider,
              receiving_provider: submissionData.receiving_provider,
              narrative: submissionData.narrative,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update order");
      }

      setShowEditForm(false);
      setEditingOrder(null);
      setEditFormData(null);

      // Reload list and clear cache
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 500);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update order");
      throw error;
    }
  }, [editingOrder, workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  // Check if current user is authorized to cancel
  const handleCancelClick = useCallback((order: TestOrderRecord) => {
    // Check if order is already cancelled
    if (order.narrative && order.narrative.includes("[CANCELLED]")) {
      setShowAlreadyCancelledDialog(true);
      return;
    }

    const creator = (order.requesting_provider || "").toLowerCase().trim();
    const sessionName = (currentUserName || "").toLowerCase().trim();
    const isOwner = creator && sessionName && creator === sessionName;

    if (!isOwner) {
      setNotAuthorizedCreator(creator || "another provider");
      setShowNotAuthorizedDialog(true);
      return;
    }

    setOrderToCancel(order);
    setShowCancelDialog(true);
  }, [currentUserName]);

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
        // If server says not authorized, show the proper dialog
        if (response.status === 403 && errorData.error?.includes("Cancellation not permitted")) {
          setShowCancelDialog(false);
          setNotAuthorizedCreator(orderToCancel.requesting_provider || "another provider");
          setShowNotAuthorizedDialog(true);
          return;
        }
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
                    <th className="text-left p-3 font-medium">Requested Tests</th>
                    <th className="text-left p-3 font-medium">Urgency</th>
                    <th className="text-left p-3 font-medium">Date Ordered</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testOrderRecords.filter(o => {
                    const orderStatus = o.request_status || o.status || (o.description?.match(/Status:\s*(CANCELLED)/)?.[1]) || "";
                    return orderStatus !== "CANCELLED";
                  }).map((order, index) => (
                    <tr
                      key={`${order.composition_uid}-${index}`}
                      className={`border-b ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/25"
                      } hover:bg-muted/50 transition-colors`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {order.is_package ? (
                            <Package className="h-4 w-4 text-orange-500" />
                          ) : (
                            <TestTube className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {(() => {
                                const desc = order.description || "";
                                const selectedTestsMatch = desc.match(/Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i);
                                if (selectedTestsMatch) {
                                  const testNames = selectedTestsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
                                  if (testNames.length > 0) return testNames.join(', ');
                                }
                                return order.service_name;
                              })()}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${
                                  (order.request_status || order.status) === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {order.request_status || order.status || "REQUESTED"}
                              </span>
                              {order.test_category && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {order.test_category}
                                </Badge>
                              )}
                              {order.service_name && (
                                <span className="text-[10px] text-muted-foreground">
                                  {order.service_name}
                                </span>
                              )}
                              {order.service_type_code && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {order.service_type_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
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
                            disabled={isLoadingEdit && editingOrder?.composition_uid === order.composition_uid}
                          >
                            {isLoadingEdit && editingOrder?.composition_uid === order.composition_uid ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>
                            ) : (
                              <><Edit className="h-3 w-3 mr-1" /> Edit</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            onClick={() => handleCancelClick(order)}
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
                        <th className="text-left p-3 font-medium text-sm">Requested Tests</th>
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
                                <Package className="h-4 w-4 text-orange-500" />
                              ) : (
                                <TestTube className="h-4 w-4 text-green-500" />
                              )}
                              <div>
                                <div className="font-medium text-sm">
                                  {(() => {
                                    const desc = order.description || "";
                                    const selectedTestsMatch = desc.match(/Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i);
                                    if (selectedTestsMatch) {
                                      const testNames = selectedTestsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
                                      if (testNames.length > 0) return testNames.join(', ');
                                    }
                                    return order.service_name;
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${
                                      (order.request_status || order.status) === "CANCELLED"
                                        ? "bg-red-100 text-red-800"
                                        : (order.request_status || order.status) === "COMPLETED"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {order.request_status || order.status || "REQUESTED"}
                                  </span>
                                  {order.test_category && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {order.test_category}
                                    </Badge>
                                  )}
                                  {order.service_name && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {order.service_name}
                                    </span>
                                  )}
                                  {order.service_type_code && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {order.service_type_code}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
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

      {/* Create Order Form Dialog */}
      <EnhancedLabOrderFormMultiple
        open={showTestOrderForm}
        onOpenChange={setShowTestOrderForm}
        onSubmit={saveTestOrder}
        workspaceid={workspaceid}
      />

      {/* Edit Order Dialog - Full form with test catalog */}
      {editFormData && (
        <EnhancedLabOrderFormMultiple
          open={showEditForm}
          onOpenChange={(open) => {
            setShowEditForm(open);
            if (!open) {
              setEditingOrder(null);
              setEditFormData(null);
            }
          }}
          onSubmit={handleUpdateOrder}
          editMode={true}
          initialData={editFormData}
          workspaceid={workspaceid}
        />
      )}

      {/* Already Cancelled Dialog */}
      <AlertDialog open={showAlreadyCancelledDialog} onOpenChange={setShowAlreadyCancelledDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Order Already Cancelled
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This test order has already been cancelled and cannot be cancelled again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Not Authorized to Cancel Dialog */}
      <AlertDialog open={showNotAuthorizedDialog} onOpenChange={setShowNotAuthorizedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
              <ShieldAlert className="h-5 w-5" />
              Cancellation Not Permitted
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You cannot cancel this order because it was created by <strong className="text-foreground">{notAuthorizedCreator}</strong>.
              Only the ordering provider can discontinue this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Please contact the ordering provider or the lab to request cancellation.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

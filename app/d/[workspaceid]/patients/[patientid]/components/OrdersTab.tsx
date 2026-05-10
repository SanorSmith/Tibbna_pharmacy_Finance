"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Plus, History, Edit, Trash2, Printer, ShieldAlert, Ban, Loader2 } from "lucide-react";
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
}

interface OrdersTabProps {
  workspaceid: string;
  patientid: string;
}

// ---------- Component ----------
export default function OrdersTab({ workspaceid, patientid }: OrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>([]);
  const [loadingTestOrders, setLoadingTestOrders] = useState(false);
  const [loadingMoreTestOrders, setLoadingMoreTestOrders] = useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = useState(false);
  const [selectedTestOrder, setSelectedTestOrder] = useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const CACHE_KEY = `test_orders_v2_${patientid}`;

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

  // Save order using shared modal
  const handleSubmitOrder = useCallback(async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Get current user
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      const currentUser = userData.user;
      const requesting = currentUser?.name || currentUser?.email || "Unknown Provider";

      // Always use the current user's name
      const orderData = { ...formData, requesting_provider: requesting };

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

      // reload list and clear cache
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 500);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save test order");
      throw err;
    } finally {
      setIsSubmitting(false);
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

    const creator = order.requesting_provider || "";
    const isOwner = currentUserName && creator &&
      creator.toLowerCase().trim() === currentUserName.toLowerCase().trim();

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
        `/api/d/${workspaceid}/patients/${patientid}/test-orders/${orderToCancel.composition_uid}?reason=${encodeURIComponent(cancelReason || "Cancelled by doctor")}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => { setSelectedTestOrder(order); setShowTestOrderDetails(true); }}
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
        </CardContent>
      </Card>

      {/* Create Order Form Dialog */}
      <EnhancedLabOrderFormMultiple
        open={showTestOrderForm}
        onOpenChange={setShowTestOrderForm}
        onSubmit={handleSubmitOrder}
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

      {/* Details Dialog */}
      <Dialog open={showTestOrderDetails} onOpenChange={setShowTestOrderDetails}>
        <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>Complete information about this laboratory test order</DialogDescription>
          </DialogHeader>

          {selectedTestOrder && (
            <div id="printable-order-details" className="space-y-4">
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
                {selectedTestOrder.narrative && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">Description:</span>
                    <p className="text-sm mt-1">{selectedTestOrder.narrative}</p>
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
            <Button variant="outline" onClick={() => setShowTestOrderDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


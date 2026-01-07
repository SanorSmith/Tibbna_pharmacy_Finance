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
import { Plus, History } from "lucide-react";
import LabOrderFormModal from "@/components/shared/LabOrderFormModal";

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

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_v2_${patientid}`;

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

      {/* Form Dialog - Using Shared Component */}
      <LabOrderFormModal
        open={showTestOrderForm}
        onOpenChange={setShowTestOrderForm}
        onSubmit={handleSubmitOrder}
        isSubmitting={isSubmitting}
      />

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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestOrderDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


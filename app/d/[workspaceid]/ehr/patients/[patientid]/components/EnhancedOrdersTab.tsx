"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Plus,
  History,
  Package,
  TestTube,
  Edit,
  Trash2,
  Printer,
  ShieldAlert,
  Ban,
  Loader2,
} from "lucide-react";
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
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  patientPhone?: string;
  patientNationalId?: string;
  patientAddress?: string;
}

// ---------- Component ----------
export default function EnhancedOrdersTab({
  workspaceid,
  patientid,
  patientName,
  patientDob,
  patientGender,
  patientPhone,
  patientNationalId,
  patientAddress,
}: EnhancedOrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>(
    [],
  );
  const [olderTestOrders, setOlderTestOrders] = useState<TestOrderRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = useState(false);
  const [selectedTestOrder, setSelectedTestOrder] =
    useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = useState(false);
  const [savingTestOrder, setSavingTestOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TestOrderRecord | null>(
    null,
  );
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<TestOrderRecord | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [showNotAuthorizedDialog, setShowNotAuthorizedDialog] = useState(false);
  const [notAuthorizedCreator, setNotAuthorizedCreator] = useState<string>("");
  const [showAlreadyCancelledDialog, setShowAlreadyCancelledDialog] =
    useState(false);

  const [testNameToGroups, setTestNameToGroups] = useState<
    Record<string, string[]>
  >({});
  const [labCatalog, setLabCatalog] = useState<Record<string, any>>({});
  const [testCatalogIndividual, setTestCatalogIndividual] = useState<
    Record<string, any>
  >({});
  const [workspaceInfo, setWorkspaceInfo] = useState<{
    name?: string;
    address?: string;
    phone?: string;
  }>({});

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_enhanced_${patientid}`;

  // Fetch test catalog to map test names to their groups + lab info
  useEffect(() => {
    fetch(`/api/test-catalog?workspaceid=${workspaceid}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch test catalog: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && data.testPackages && data.individualTests) {
          const mapping: Record<string, string[]> = {};
          Object.values(data.testPackages).forEach((pkg: any) => {
            const groupName = pkg.name;
            (pkg.tests || []).forEach((testId: string) => {
              const test = data.individualTests[testId];
              if (test?.name) {
                if (!mapping[test.name]) mapping[test.name] = [];
                if (!mapping[test.name].includes(groupName)) {
                  mapping[test.name].push(groupName);
                }
              }
            });
          });
          setTestNameToGroups(mapping);
          if (data.laboratories) setLabCatalog(data.laboratories);
          if (data.individualTests)
            setTestCatalogIndividual(data.individualTests);
        }
      })
      .catch(() => {});
  }, [workspaceid]);

  // Fetch workspace info for hospital name
  useEffect(() => {
    fetch(`/api/d/${workspaceid}/workspace-info`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch workspace info: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.workspace) {
          setWorkspaceInfo({
            name: data.workspace.name || "",
            address: data.workspace.description || "",
          });
        }
      })
      .catch(() => {});
  }, [workspaceid]);

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch session: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const u = data.user;
        setCurrentUserName(u?.name || u?.email || null);
      })
      .catch(() => {});
  }, []);

  // Use React Query for caching test orders
  const {
    data: testOrdersData,
    isLoading: loadingTestOrders,
    refetch,
  } = useQuery({
    queryKey: ["test-orders", workspaceid, patientid, 4, 0],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=4&offset=0`,
      );
      if (!res.ok) {
        throw new Error("Failed to load test orders");
      }
      const data = await res.json();
      return {
        testOrders: data.testOrders || [],
        hasMore: data.hasMore || false,
      };
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
                `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=${limit}&offset=${offset}`,
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
    [refetch, workspaceid, patientid, showHistory, olderTestOrders.length],
  );

  // Save order - now receives data from EnhancedLabOrderFormMultiple
  const saveTestOrder = useCallback(
    async (submissionData: any) => {
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
          },
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
            "The EHR system is responding slowly. Please try again in a moment.",
          );
        } else {
          alert(errorMessage);
        }
      } finally {
        setSavingTestOrder(false);
      }
    },
    [workspaceid, patientid, CACHE_KEY, loadTestOrders],
  );

  // Handle edit order - fetch full details from OpenEHR and reverse-match to catalog
  const handleEditOrder = useCallback(
    async (order: TestOrderRecord) => {
      setEditingOrder(order);
      setIsLoadingEdit(true);

      try {
        const res = await fetch(
          `/api/d/${workspaceid}/patients/${patientid}/test-orders/${order.composition_uid}`,
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
    },
    [workspaceid, patientid],
  );

  // Handle update order - receives full submission data from EnhancedLabOrderFormMultiple
  const handleUpdateOrder = useCallback(
    async (submissionData: any) => {
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
          },
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
        alert(
          error instanceof Error ? error.message : "Failed to update order",
        );
        throw error;
      }
    },
    [editingOrder, workspaceid, patientid, CACHE_KEY, loadTestOrders],
  );

  // Check if current user is authorized to cancel
  const handleCancelClick = useCallback(
    (order: TestOrderRecord) => {
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
    },
    [currentUserName],
  );

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
            reason: cancelReason || "Cancelled by doctor",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If server says not authorized, show the proper dialog
        if (
          response.status === 403 &&
          errorData.error?.includes("Cancellation not permitted")
        ) {
          setShowCancelDialog(false);
          setNotAuthorizedCreator(
            orderToCancel.requesting_provider || "another provider",
          );
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
  }, [
    orderToCancel,
    cancelReason,
    workspaceid,
    patientid,
    CACHE_KEY,
    loadTestOrders,
  ]);

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
                  {loadingHistory
                    ? "Loading..."
                    : showHistory
                      ? "Hide History"
                      : "Show History"}
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
              <Button
                size="sm"
                onClick={() => setShowTestOrderForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add First Test Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm w-52">
                      Test ID
                    </th>
                    <th className="text-left p-3 font-medium text-sm">
                      Requested Tests
                    </th>
                    <th className="text-left p-3 font-medium text-sm w-32">
                      Urgency
                    </th>
                    <th className="text-left p-3 font-medium text-sm w-32">
                      Date Ordered
                    </th>
                    <th className="text-right p-3 font-medium text-sm w-48">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {testOrderRecords
                    .filter((o) => {
                      const orderStatus =
                        o.request_status ||
                        o.status ||
                        o.description?.match(/Status:\s*(CANCELLED)/)?.[1] ||
                        "";
                      return orderStatus !== "CANCELLED";
                    })
                    .map((order, index) => (
                      <tr
                        key={`${order.composition_uid}-${index}`}
                        className={`border-b ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/25"
                        } hover:bg-muted/50 transition-colors`}
                      >
                        <td className="p-3">
                          <span className="text-sm font-normal text-gray-700 break-all">
                            {order.request_id ||
                              order.composition_uid?.substring(0, 20) ||
                              "—"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className=" tex-sm font-normal">
                                {(() => {
                                  const desc = order.description || "";
                                  const selectedTestsMatch = desc.match(
                                    /Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i,
                                  );
                                  if (selectedTestsMatch) {
                                    const testNames = selectedTestsMatch[1]
                                      .split(",")
                                      .map((s: string) => s.trim())
                                      .filter(Boolean);
                                    if (testNames.length > 0)
                                      return testNames.join(", ");
                                  }
                                  return order.service_name;
                                })()}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 text-[10px] rounded-full capitalize text-black ${
                                    (order.request_status || order.status) ===
                                    "COMPLETED"
                                      ? "bg-green-200"
                                      : "bg-blue-200"
                                  }`}
                                >
                                  {order.request_status ||
                                    order.status ||
                                    "REQUESTED"}
                                </span>

                                {order.test_category && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {order.test_category}
                                  </Badge>
                                )}
                                {(() => {
                                  const desc = order.description || "";
                                  const groupMatch = desc.match(
                                    /Test Groups?\s*:\s*([^|]+)/i,
                                  );
                                  const allGroups: string[] = [];
                                  if (groupMatch) {
                                    groupMatch[1]
                                      .split(",")
                                      .map((s: string) => s.trim())
                                      .filter(Boolean)
                                      .forEach((g: string) => {
                                        if (!allGroups.includes(g))
                                          allGroups.push(g);
                                      });
                                  }
                                  if (order.service_name) {
                                    order.service_name
                                      .split(",")
                                      .map((s: string) => s.trim())
                                      .filter(Boolean)
                                      .forEach((g: string) => {
                                        if (!allGroups.includes(g))
                                          allGroups.push(g);
                                      });
                                  }
                                  return allGroups.length > 0
                                    ? allGroups.map((g: string, i: number) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800"
                                        >
                                          {g}
                                        </Badge>
                                      ))
                                    : null;
                                })()}
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
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
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
                              disabled={
                                isLoadingEdit &&
                                editingOrder?.composition_uid ===
                                  order.composition_uid
                              }
                            >
                              {isLoadingEdit &&
                              editingOrder?.composition_uid ===
                                order.composition_uid ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </>
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
                <h3 className="text-lg font-semibold text-muted-foreground">
                  Order History
                </h3>
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
                        <th className="text-left p-3 font-medium text-sm w-52">
                          Test ID
                        </th>
                        <th className="text-left p-3 font-medium text-sm">
                          Requested Tests
                        </th>
                        <th className="text-left p-3 font-medium text-sm w-32">
                          Urgency
                        </th>
                        <th className="text-left p-3 font-medium text-sm w-32">
                          Date Ordered
                        </th>
                        <th className="text-right p-3 font-medium text-sm w-48">
                          Actions
                        </th>
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
                            <span className="text-xs font-mono font-semibold text-gray-700 break-all">
                              {order.request_id ||
                                order.composition_uid?.substring(0, 20) ||
                                "\u2014"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-sm">
                                  {(() => {
                                    const desc = order.description || "";
                                    const selectedTestsMatch = desc.match(
                                      /Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i,
                                    );
                                    if (selectedTestsMatch) {
                                      const testNames = selectedTestsMatch[1]
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .filter(Boolean);
                                      if (testNames.length > 0)
                                        return testNames.join(", ");
                                    }
                                    return order.service_name;
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${
                                      (order.request_status || order.status) ===
                                      "CANCELLED"
                                        ? "bg-red-100 text-red-800"
                                        : (order.request_status ||
                                              order.status) === "COMPLETED"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {order.request_status ||
                                      order.status ||
                                      "REQUESTED"}
                                  </span>
                                  {order.test_category && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {order.test_category}
                                    </Badge>
                                  )}
                                  {(() => {
                                    const desc = order.description || "";
                                    const groupMatch = desc.match(
                                      /Test Groups?\s*:\s*([^|]+)/i,
                                    );
                                    const allGroups: string[] = [];
                                    if (groupMatch) {
                                      groupMatch[1]
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .filter(Boolean)
                                        .forEach((g: string) => {
                                          if (!allGroups.includes(g))
                                            allGroups.push(g);
                                        });
                                    }
                                    if (order.service_name) {
                                      order.service_name
                                        .split(",")
                                        .map((s: string) => s.trim())
                                        .filter(Boolean)
                                        .forEach((g: string) => {
                                          if (!allGroups.includes(g))
                                            allGroups.push(g);
                                        });
                                    }
                                    return allGroups.length > 0
                                      ? allGroups.map(
                                          (g: string, i: number) => (
                                            <Badge
                                              key={i}
                                              variant="secondary"
                                              className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800"
                                            >
                                              {g}
                                            </Badge>
                                          ),
                                        )
                                      : null;
                                  })()}
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
                          <td className="p-3 text-right">
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
      <AlertDialog
        open={showAlreadyCancelledDialog}
        onOpenChange={setShowAlreadyCancelledDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Order Already Cancelled
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This test order has already been cancelled and cannot be cancelled
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Not Authorized to Cancel Dialog */}
      <AlertDialog
        open={showNotAuthorizedDialog}
        onOpenChange={setShowNotAuthorizedDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
              <ShieldAlert className="h-5 w-5" />
              Cancellation Not Permitted
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You cannot cancel this order because it was created by{" "}
              <strong className="text-foreground">
                {notAuthorizedCreator}
              </strong>
              . Only the ordering provider can discontinue this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Please contact the ordering provider or the lab to request
            cancellation.
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
              Are you sure you want to cancel this test order? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">
              Reason for Cancellation (Optional)
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancelling this order..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelReason("");
                setOrderToCancel(null);
              }}
            >
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
            <DialogTitle className="text-xl font-bold">
              Test Order Details
            </DialogTitle>
            <DialogDescription className=" font-semibold">
              {selectedTestOrder?.request_id ||
                selectedTestOrder?.composition_uid?.substring(0, 20) ||
                ""}
            </DialogDescription>
          </DialogHeader>

          {selectedTestOrder &&
            (() => {
              const desc = selectedTestOrder.description || "";

              // Parse grouped tests: "GroupName[test1, test2]; GroupName2[test3]"
              const groupedTestsMatch = desc.match(
                /Grouped Tests\s*:\s*([^|]+)/i,
              );
              let finalGroupedMap: Record<string, string[]> = {};

              if (groupedTestsMatch) {
                const groupedStr = groupedTestsMatch[1].trim();
                const groupRegex = /([^[\];]+)\[([^\]]*)\]/g;
                let m;
                while ((m = groupRegex.exec(groupedStr)) !== null) {
                  const gName = m[1].trim();
                  const gTests = m[2]
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  if (gName && gTests.length > 0)
                    finalGroupedMap[gName] = gTests;
                }
              }

              // If no Grouped Tests data, use catalog mapping to assign tests to groups
              if (Object.keys(finalGroupedMap).length === 0) {
                const selectedTestsMatch = desc.match(
                  /Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i,
                );
                const allTestNames = selectedTestsMatch
                  ? selectedTestsMatch[1]
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                  : [];

                // Get group names from description or service_name
                const groupMatch = desc.match(/Test Groups?\s*:\s*([^|]+)/i);
                const orderGroups: string[] = [];
                if (groupMatch) {
                  groupMatch[1]
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .forEach((g: string) => {
                      if (!orderGroups.includes(g)) orderGroups.push(g);
                    });
                }
                if (selectedTestOrder.service_name) {
                  selectedTestOrder.service_name
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .forEach((g: string) => {
                      if (!orderGroups.includes(g)) orderGroups.push(g);
                    });
                }

                if (
                  allTestNames.length > 0 &&
                  Object.keys(testNameToGroups).length > 0
                ) {
                  // Use catalog mapping: assign each test to its matching group
                  const assigned = new Set<string>();
                  orderGroups.forEach((group) => {
                    const groupTests = allTestNames.filter((testName) => {
                      const groups = testNameToGroups[testName] || [];
                      return groups.includes(group);
                    });
                    if (groupTests.length > 0) {
                      finalGroupedMap[group] = groupTests;
                      groupTests.forEach((t) => assigned.add(t));
                    }
                  });
                  // Any unassigned tests go under "Other Tests"
                  const unassigned = allTestNames.filter(
                    (t) => !assigned.has(t),
                  );
                  if (unassigned.length > 0) {
                    finalGroupedMap["Other Tests"] = unassigned;
                  }
                } else if (allTestNames.length > 0 && orderGroups.length > 0) {
                  // No catalog available — show all tests once under a combined heading
                  finalGroupedMap[orderGroups.join(", ")] = allTestNames;
                } else if (allTestNames.length > 0) {
                  finalGroupedMap["Tests"] = allTestNames;
                }
              }

              const patientAge = patientDob
                ? `${Math.floor((Date.now() - new Date(patientDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
                : "—";

              return (
                <div
                  id="printable-order-details-enhanced"
                  className="space-y-4"
                >
                  {/* Row 1 & 2: Compact, left-aligned */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg px-4 py-3 bg-gray-50">
                    {/* LEFT COLUMN — Patient Info */}
                    <div className="space-y-2">
                      {/* Name + Badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-sm">
                          {patientName || "—"}
                        </p>

                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                            selectedTestOrder.urgency === "urgent"
                              ? "bg-red-200 text-red-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {selectedTestOrder.urgency || "routine"}
                        </span>

                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                            (selectedTestOrder.request_status ||
                              selectedTestOrder.status) === "COMPLETED"
                              ? "bg-green-200 text-green-800"
                              : (selectedTestOrder.request_status ||
                                    selectedTestOrder.status) === "CANCELLED"
                                ? "bg-red-200 text-red-800"
                                : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {selectedTestOrder.request_status ||
                            selectedTestOrder.status ||
                            "REQUESTED"}
                        </span>
                      </div>

                      {/* Demographics */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                        <span>
                          {patientAge}
                          {patientGender ? ` / ${patientGender}` : ""}
                        </span>
                        <span>{patientPhone || "—"}</span>
                      </div>

                      {/* Ordered Date */}
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-gray-500 uppercase tracking-wide">
                          Ordered:
                        </span>{" "}
                        {selectedTestOrder.ordered_date
                          ? new Date(
                              selectedTestOrder.ordered_date,
                            ).toLocaleDateString()
                          : new Date(
                              selectedTestOrder.recorded_time,
                            ).toLocaleDateString()}
                      </div>
                    </div>

                    {/* RIGHT COLUMN — To / From */}
                    <div className="grid grid-cols-2 border rounded-lg p-3 bg-white text-xs space-y-3">
                      <div>
                        <span className="text-gray-600 uppercase tracking-wide block">
                          From:
                        </span>
                        <span className="font-medium text-sm text-gray-800">
                          {selectedTestOrder.requesting_provider || "—"}
                        </span>
                      </div>
                     <div>
                        <span className="text-gray-500 uppercase tracking-wide block">
                          To:
                        </span>
                        <span className="font-medium text-sm text-gray-800">
                          {selectedTestOrder.target_lab ||
                            selectedTestOrder.receiving_provider ||
                            "—"}
                        </span>
                      </div>

                     
                    </div>
                  </div>

                  {/* Tests Ordered Section — separated by group */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-700">
                      Tests Ordered
                    </h4>
                    {Object.keys(finalGroupedMap).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(finalGroupedMap).map(
                          ([group, tests], i) => (
                            <div
                              key={i}
                              className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                            >
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-800 text-xs mb-1.5"
                              >
                                {group}
                              </Badge>
                              <div className="ml-1 flex flex-wrap gap-x-3 gap-y-1">
                                {tests.map((test: string, j: number) => (
                                  <span
                                    key={j}
                                    className="text-sm text-gray-700"
                                  >
                                    • {test}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">
                        {selectedTestOrder.service_name || "—"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Clinical Indication Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-gray-700">
                        Clinical Indication
                      </h4>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {selectedTestOrder.clinical_indication || "—"}
                      </p>
                    </div>

                    {/* Supplementary Info Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-gray-700">
                        Supplementary Info
                      </h4>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {selectedTestOrder.narrative || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedTestOrder) return;
                const { generateLabOrderHTML } =
                  await import("@/lib/lims/lab-order-html");
                // Find lab info from catalog based on target_lab
                const targetLabKey = (selectedTestOrder.target_lab || "")
                  .toLowerCase()
                  .replace(/\s+/g, "-");
                const labInfo = labCatalog[targetLabKey] || {};

                // Build tests array with specimen info from catalog
                // Parse test names from description to resolve sampleType/containerType from DB
                const desc = selectedTestOrder.description || "";
                const selMatch = desc.match(
                  /Selected Tests\s*\(\d+\)\s*:\s*([^|]+)/i,
                );
                const testNamesList = selMatch
                  ? selMatch[1]
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                  : [];

                // Build name-based lookup from catalog
                const catalogByName: Record<string, any> = {};
                Object.values(testCatalogIndividual).forEach((t: any) => {
                  if (t?.name) catalogByName[t.name.toLowerCase()] = t;
                });

                const testsWithSpecimen = testNamesList.map((name: string) => {
                  const cat = catalogByName[name.toLowerCase()];
                  return {
                    testName: name,
                    testCode: cat?.code || cat?.id || name,
                    specimenType: cat?.sampleType || cat?.material || "",
                    sampleType: cat?.sampleType || cat?.material || "",
                    containerType: cat?.containerType || "",
                  };
                });

                const html = generateLabOrderHTML({
                  facilityName:
                    selectedTestOrder.receiving_provider || "Laboratory",
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
                  // Hospital / FROM info
                  hospitalName: workspaceInfo.name,
                  hospitalAddress: workspaceInfo.address,
                  hospitalPhone: workspaceInfo.phone,
                  // Lab / TO info
                  labName: labInfo.name || selectedTestOrder.target_lab,
                  labAddress: labInfo.address,
                  labPhone: labInfo.phone,
                  // Patient info
                  patientName: patientName,
                  patientNationalId: patientNationalId,
                  patientAddress: patientAddress,
                  patientPhone: patientPhone,
                  patientId: patientid,
                                  });
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(html);
                  printWindow.document.close();
                }
              }}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTestOrderDetails(false)}
              className="bg-gray-100 hover:bg-gray-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrderDetailsModal from "./components/OrderDetailsModal";
import CreateOrderModal from "./components/CreateOrderModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Pill,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  XCircle,
  PauseCircle,
  RefreshCw,
  Edit,
} from "lucide-react";

type Order = {
  orderid: string;
  patientid: string | null;
  status: string;
  source: string;
  priority: string;
  notes: string | null;
  openehrorderid: string | null;
  createdat: string;
  updatedat: string;
  patientfirst: string | null;
  patientlast: string | null;
  prescriberid: string | null;
  prescribername: string | null;
  items: { drugname: string; quantity: number; unitprice: string | null }[];
  totalAmount: number;
  paymentStatus: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: Package },
  DISPENSED: { label: "Dispensed", variant: "outline", icon: CheckCircle2 },
  PARTIALLY_DISPENSED: { label: "Partial", variant: "secondary", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
  ON_HOLD: { label: "On Hold", variant: "secondary", icon: PauseCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "bg-gray-100 text-gray-700",
  urgent: "bg-orange-100 text-orange-700",
  stat: "bg-red-100 text-red-700 font-semibold",
};

export default function PharmacyOrdersPage({
  workspaceid,
  userName,
  userId,
}: {
  workspaceid: string;
  userName: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Use React Query to cache orders
  const { data: orders = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["pharmacy-orders", workspaceid, statusFilter],
    queryFn: async () => {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.orders || [];
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const handleSync = () => {
    setSyncMessage(null);
    syncMutation.mutate();
  };

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/sync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      setSyncMessage(`Synced ${data.synced} new, ${data.skipped} existing`);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", workspaceid] });
    },
    onError: () => {
      setSyncMessage("Network error during sync");
    },
  });

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch =
        !search ||
        `${o.patientfirst} ${o.patientlast}`.toLowerCase().includes(search.toLowerCase()) ||
        o.orderid.toLowerCase().includes(search.toLowerCase());
      
      // Date filtering
      const orderDate = new Date(o.createdat);
      let matchesDate = true;
      if (dateFilter === "day") {
        matchesDate = orderDate >= today;
      } else if (dateFilter === "week") {
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === "month") {
        matchesDate = orderDate >= monthAgo;
      }
      
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, statusFilter, dateFilter, search]);

  const counts = {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    IN_PROGRESS: orders.filter((o) => o.status === "IN_PROGRESS").length,
    DISPENSED: orders.filter((o) => o.status === "DISPENSED").length,
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-4 pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6" />
              Pharmacy Orders
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage medication orders, dispensing, and billing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncMessage && (
              <span className="text-xs text-muted-foreground">{syncMessage}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync from OpenEHR"}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            >
              Add an Order
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-sm bg-purple-100 border-purple-200">
            <CardContent className="py-4 px-4 text-center">
              <p className="text-sm font-semibold text-purple-900">Total orders {counts.all}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-green-100 border-green-200">
            <CardContent className="py-4 px-4 text-center">
              <p className="text-sm font-semibold text-green-900">Complete orders {counts.DISPENSED}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-yellow-100 border-yellow-200">
            <CardContent className="py-4 px-4 text-center">
              <p className="text-sm font-semibold text-yellow-900">Pending orders {counts.PENDING}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DISPENSED">Dispensed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Loading orders...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Pill className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="bg-muted/50">Order ID</TableHead>
                  <TableHead className="bg-muted/50">Patient</TableHead>
                  <TableHead className="bg-muted/50">Prescriber</TableHead>
                  <TableHead className="bg-muted/50">Products</TableHead>
                  <TableHead className="bg-muted/50">Date</TableHead>
                  <TableHead className="bg-muted/50">Payment Status</TableHead>
                  <TableHead className="bg-muted/50">Order Status</TableHead>
                  <TableHead className="text-right bg-muted/50">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow 
                      key={order.orderid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrder(order.orderid);
                        setIsModalOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {order.orderid.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.patientfirst && order.patientlast
                          ? `${order.patientfirst} ${order.patientlast}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.prescribername || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {order.items && order.items.length > 0 ? (
                          <div className="text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-muted-foreground">
                                {item.drugname} ({item.quantity})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdat).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={order.paymentStatus === "PAID" ? "default" : "secondary"}
                          className={order.paymentStatus === "PAID" ? "bg-green-600" : ""}
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order.orderid);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        workspaceid={workspaceid}
        orderid={selectedOrder || ""}
        open={isModalOpen && selectedOrder !== null}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        workspaceid={workspaceid}
        userName={userName}
        userId={userId}
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", workspaceid] });
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}

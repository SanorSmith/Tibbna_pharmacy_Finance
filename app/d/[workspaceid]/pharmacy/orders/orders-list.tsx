"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
}: {
  workspaceid: string;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, statusFilter]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.synced} new, ${data.skipped} existing`);
        await fetchOrders();
      } else {
        setSyncMessage(data.error || "Sync failed");
      }
    } catch {
      setSyncMessage("Network error during sync");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = `${o.patientfirst || ""} ${o.patientlast || ""}`.toLowerCase();
    return (
      name.includes(s) ||
      o.orderid.toLowerCase().includes(s) ||
      (o.openehrorderid || "").toLowerCase().includes(s)
    );
  });

  const counts = {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    IN_PROGRESS: orders.filter((o) => o.status === "IN_PROGRESS").length,
    DISPENSED: orders.filter((o) => o.status === "DISPENSED").length,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from OpenEHR"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{counts.all}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-orange-200" onClick={() => setStatusFilter("PENDING")}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{counts.PENDING}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200" onClick={() => setStatusFilter("IN_PROGRESS")}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{counts.IN_PROGRESS}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200" onClick={() => setStatusFilter("DISPENSED")}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{counts.DISPENSED}</div>
            <p className="text-xs text-muted-foreground">Dispensed</p>
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

      {/* Orders Table */}
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
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medication / Notes</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={order.orderid}>
                      <TableCell className="font-mono text-xs">
                        {order.orderid.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.patientfirst && order.patientlast
                          ? `${order.patientfirst} ${order.patientlast}`
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {order.notes ? (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {order.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.source === "openehr" ? "OpenEHR" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.routine}`}>
                          {order.priority.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdat).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/d/${workspaceid}/pharmacy/orders/${order.orderid}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
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
  );
}

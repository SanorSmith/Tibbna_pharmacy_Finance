"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  PackageX,
  CalendarClock,
  RefreshCw,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

interface BatchInfo {
  batchid: string;
  lotnumber: string;
  expirydate: string;
  purchaseprice: string | null;
  sellingprice: string | null;
}

interface LocationStock {
  locationid: string;
  locationname: string;
  locationtype: string;
  quantity: number;
  batchid: string | null;
}

interface InventoryItem {
  drugid: string;
  name: string;
  genericname: string | null;
  form: string;
  strength: string;
  unit: string;
  barcode: string | null;
  manufacturer: string | null;
  isactive: boolean;
  totalStock: number;
  batches: BatchInfo[];
  locations: LocationStock[];
  expiringBatches: number;
  expiredBatches: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  hasExpiring: boolean;
  hasExpired: boolean;
  status: "ok" | "low" | "outofstock" | "expiring";
  reorderSuggested: boolean;
  suggestedReorderQty: number;
}

interface Summary {
  totalDrugs: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  reorderNeeded: number;
  threshold: number;
}

interface Movement {
  movementid: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdat: string;
  drugname: string;
  locationname: string;
}

interface InventoryData {
  inventory: InventoryItem[];
  summary: Summary;
  recentMovements: Movement[];
}

export default function InventoryManagement({ workspaceid }: { workspaceid: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedForReorder, setSelectedForReorder] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<InventoryData>({
    queryKey: ["pharmacy-inventory", workspaceid, search, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-inventory?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const reorderMutation = useMutation({
    mutationFn: async (drugids: string[]) => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugids }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      return res.json();
    },
    onSuccess: () => {
      setSelectedForReorder(new Set());
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
  });

  const toggleReorder = (drugid: string) => {
    setSelectedForReorder((prev) => {
      const next = new Set(prev);
      if (next.has(drugid)) next.delete(drugid);
      else next.add(drugid);
      return next;
    });
  };

  const selectAllLowStock = () => {
    if (!data) return;
    const lowIds = data.inventory.filter((d) => d.reorderSuggested).map((d) => d.drugid);
    setSelectedForReorder(new Set(lowIds));
  };

  const handleAutoReorder = () => {
    if (selectedForReorder.size === 0) return;
    reorderMutation.mutate(Array.from(selectedForReorder));
  };

  const summary = data?.summary;

  const statusBadge = (item: InventoryItem) => {
    if (item.isOutOfStock) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if (item.isLowStock) return <Badge className="text-[10px] bg-amber-500">Low Stock</Badge>;
    if (item.hasExpired) return <Badge variant="destructive" className="text-[10px]">Expired Batch</Badge>;
    if (item.hasExpiring) return <Badge className="text-[10px] bg-orange-400">Expiring Soon</Badge>;
    return <Badge className="text-[10px] bg-green-500">In Stock</Badge>;
  };

  const movementIcon = (type: string) => {
    switch (type) {
      case "RECEIVE": return <ArrowDown className="h-3 w-3 text-green-500" />;
      case "DISPENSE": return <ArrowUp className="h-3 w-3 text-red-500" />;
      default: return <RefreshCw className="h-3 w-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Drugs" value={summary?.totalDrugs ?? 0} icon={<Package className="h-4 w-4 text-teal-500" />} />
        <SummaryCard label="Low Stock" value={summary?.lowStock ?? 0} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} alert={!!summary?.lowStock} />
        <SummaryCard label="Out of Stock" value={summary?.outOfStock ?? 0} icon={<PackageX className="h-4 w-4 text-red-500" />} alert={!!summary?.outOfStock} />
        <SummaryCard label="Expiring Soon" value={summary?.expiringSoon ?? 0} icon={<CalendarClock className="h-4 w-4 text-orange-500" />} alert={!!summary?.expiringSoon} />
        <SummaryCard label="Reorder Needed" value={summary?.reorderNeeded ?? 0} icon={<ShoppingCart className="h-4 w-4 text-blue-500" />} alert={!!summary?.reorderNeeded} />
      </div>

      {/* Filters + Auto-reorder */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search drug name, generic, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="outofstock">Out of Stock</SelectItem>
            <SelectItem value="expiring">Expiring/Expired</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={selectAllLowStock}>
            Select All Low Stock
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs bg-teal-600 hover:bg-teal-700"
            onClick={handleAutoReorder}
            disabled={selectedForReorder.size === 0 || reorderMutation.isPending}
          >
            {reorderMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ShoppingCart className="h-3 w-3 mr-1" />
            )}
            Auto-Reorder ({selectedForReorder.size})
          </Button>
        </div>
      </div>

      {/* Reorder success message */}
      {reorderMutation.isSuccess && reorderMutation.data && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">{reorderMutation.data.message}</span>
        </div>
      )}

      {/* Inventory table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs"></TableHead>
                  <TableHead className="text-xs">Drug Name</TableHead>
                  <TableHead className="text-xs">Form / Strength</TableHead>
                  <TableHead className="text-xs">Manufacturer</TableHead>
                  <TableHead className="text-xs text-center">Stock</TableHead>
                  <TableHead className="text-xs">Batches</TableHead>
                  <TableHead className="text-xs">Nearest Expiry</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-center">Reorder Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.inventory.map((item) => {
                    const nearestExpiry = item.batches.length > 0
                      ? item.batches.reduce((earliest, b) => {
                          const d = new Date(b.expirydate);
                          return d < earliest ? d : earliest;
                        }, new Date(item.batches[0].expirydate))
                      : null;

                    const isExpired = nearestExpiry && nearestExpiry < new Date();
                    const daysToExpiry = nearestExpiry
                      ? Math.ceil((nearestExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <TableRow
                        key={item.drugid}
                        className={`${item.isOutOfStock ? "bg-red-50/50" : item.isLowStock ? "bg-amber-50/50" : ""}`}
                      >
                        <TableCell className="text-center">
                          {item.reorderSuggested && (
                            <input
                              type="checkbox"
                              checked={selectedForReorder.has(item.drugid)}
                              onChange={() => toggleReorder(item.drugid)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.genericname && (
                              <p className="text-[11px] text-muted-foreground">{item.genericname}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.form} / {item.strength}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.manufacturer || "—"}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${
                            item.isOutOfStock ? "text-red-600" :
                            item.isLowStock ? "text-amber-600" :
                            "text-green-600"
                          }`}>
                            {item.totalStock}
                          </span>
                          <p className="text-[10px] text-muted-foreground">{item.unit}s</p>
                        </TableCell>
                        <TableCell className="text-sm">{item.batches.length}</TableCell>
                        <TableCell>
                          {nearestExpiry ? (
                            <div>
                              <p className={`text-sm ${isExpired ? "text-red-600 font-medium" : daysToExpiry !== null && daysToExpiry <= 90 ? "text-orange-600" : ""}`}>
                                {nearestExpiry.toLocaleDateString()}
                              </p>
                              {daysToExpiry !== null && (
                                <p className={`text-[10px] ${isExpired ? "text-red-500" : daysToExpiry <= 30 ? "text-red-500" : daysToExpiry <= 90 ? "text-orange-500" : "text-muted-foreground"}`}>
                                  {isExpired ? "EXPIRED" : `${daysToExpiry}d left`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-center">
                          {item.reorderSuggested ? (
                            <span className="text-sm font-medium text-blue-600">{item.suggestedReorderQty}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent movements */}
      {data?.recentMovements && data.recentMovements.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Recent Stock Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.recentMovements.map((m) => (
                <div key={m.movementid} className="flex items-center justify-between py-1 border-b last:border-0 text-xs">
                  <div className="flex items-center gap-2">
                    {movementIcon(m.type)}
                    <span className="font-medium">{m.drugname}</span>
                    <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{m.locationname}</span>
                    <span className={`font-medium ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </span>
                    <span>{new Date(m.createdat).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low stock threshold info */}
      <p className="text-[11px] text-muted-foreground text-center">
        Low stock threshold: {summary?.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD} units. Items below this level are flagged for reorder.
      </p>
    </div>
  );
}

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

function SummaryCard({ label, value, icon, alert }: { label: string; value: number; icon: React.ReactNode; alert?: boolean }) {
  return (
    <Card className={`shadow-sm ${alert ? "border-red-200" : ""}`}>
      <CardContent className="py-3 px-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

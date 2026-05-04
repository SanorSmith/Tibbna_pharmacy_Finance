/**
 * Client Component: PharmacyDashboard
 * - Pharmacy dashboard with tabs matching the design mockup
 * - Tabs: Dashboard, Orders, Drug registration, HR, Inventory, Billing, Insurance, To Do
 */
"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  ListTodo,
  BarChart3,
  PackageSearch,
  BellRing,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserCheck,
  DollarSign,
  Loader2,
  FlaskConical,
  Warehouse,
  Shield,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import PharmacyOrdersPage from "../orders/orders-list";
import DrugRegistration from "./components/DrugRegistration";
import DrugInteractions from "./components/DrugInteractions";
import PharmacyInventoryPage from "../../pharmacy-inventory/page";

const PRIMARY = "#618FF5";

interface DashboardStats {
  lowStock: { count: number; threshold: number; items: { drugid: string; drugname: string; strength: string; form: string; totalQuantity: number }[] };
  orders: { total: number; pending: number; inProgress: number; dispensed: number; todayCount: number };
  customers: { todayVisits: number };
  sales: { totalRevenue: number; todayRevenue: number; totalInvoices: number; paidInvoices: number };
  overdue: { count: number; orders: { orderid: string; priority: string; createdat: string }[] };
  notifications: { count: number; items: { orderid: string; priority: string; status: string; notes: string | null; createdat: string; source: string }[] };
  topSellers?: { drugid: string; drugname: string; genericname: string | null; strength: string; form: string; totalquantity: number }[];
}

export default function PharmacyDashboard({
  workspaceid,
  userName,
  userId,
}: {
  workspaceid: string;
  userName: string;
  userId: string;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([tabParam]));
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "instock" | "lowstock" | "outofstock">("all");
  const [pharmacyStats, setPharmacyStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    expiringSoon: 0,
    criticalItems: 0
  });

  useEffect(() => {
    const tab = searchParams.get("tab") || "dashboard";
    setActiveTab(tab);
    setLoadedTabs((prev) => new Set(prev).add(tab));
  }, [searchParams]);

  // Fetch pharmacy summary data
  useEffect(() => {
    const fetchPharmacyStats = async () => {
      try {
        console.log('[PharmacyDashboard] Fetching stats for workspace:', workspaceid);
        // Add cache-busting to force fresh data
        const cacheBuster = Date.now();
        const res = await fetch(`/api/pharmacy/summary?workspaceId=${workspaceid}&_cb=${cacheBuster}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            setPharmacyStats(data);
          }
        }
      } catch (error) {
        console.error("Error fetching pharmacy stats:", error);
      }
    };

    fetchPharmacyStats();
  }, [workspaceid]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["pharmacy-dashboard", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-dashboard`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 0, // Always fetch fresh data (disable cache)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Only fetch on initial mount
    enabled: !!workspaceid, // Only run query when workspaceid is available
  });

  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value);
        handleTabChange(value);
      }}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-shrink-0 px-4 pt-2 pb-1">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto bg-transparent p-0">
          <TabsTrigger
            value="dashboard"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <ClipboardList className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger
            value="pos"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <ShoppingCart className="h-4 w-4" />
            Point of Sale
          </TabsTrigger>
          <TabsTrigger
            value="drug-registration"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <Pill className="h-4 w-4" />
            Drug registration
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <Warehouse className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="insurance"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <Shield className="h-4 w-4" />
            Insurance
          </TabsTrigger>
          <TabsTrigger
            value="todo"
            className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
          >
            <ListTodo className="h-4 w-4" />
            To Do
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Dashboard Tab */}
      <TabsContent value="dashboard" className="mt-3 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#618FF5]" />
          </div>
        ) : (
          <div className="space-y-4">
                {/* Top summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Orders</p>
                          <p className="text-2xl font-bold">{stats?.orders.total ?? 0}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-[#618FF5]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="text-[#618FF5] font-medium">{stats?.orders.todayCount ?? 0}</span> today
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Customer Visits</p>
                          <p className="text-2xl font-bold">{stats?.customers.todayVisits ?? 0}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-[#618FF5]" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Unique patients today</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Today&apos;s Sales</p>
                          <p className="text-2xl font-bold">{(stats?.sales.todayRevenue ?? 0).toLocaleString()} IQD</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Total: <span className="font-medium">{(stats?.sales.totalRevenue ?? 0).toLocaleString()} IQD</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Pending Orders</p>
                          <p className="text-2xl font-bold">{stats?.orders.pending ?? 0}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="font-medium">{stats?.orders.inProgress ?? 0}</span> in progress
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom detail cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Low Stock Medicines */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <PackageSearch className="h-4 w-4 text-orange-500" />
                        Low Stock Medicines
                        {(stats?.lowStock.count ?? 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {stats?.lowStock.count}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {/* Pharmacy Inventory Summary */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div 
                          className="text-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => {
                            setInventoryStockFilter("all");
                            setActiveTab("inventory");
                            setLoadedTabs((prev) => new Set(prev).add("inventory"));
                          }}
                        >
                          <p className="text-lg font-bold text-blue-600">{pharmacyStats.totalItems}</p>
                          <p className="text-xs text-muted-foreground">Total Items</p>
                        </div>
                        <div 
                          className="text-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => {
                            setInventoryStockFilter("lowstock");
                            setActiveTab("inventory");
                            setLoadedTabs((prev) => new Set(prev).add("inventory"));
                          }}
                        >
                          <p className="text-lg font-bold text-amber-600">{pharmacyStats.lowStock}</p>
                          <p className="text-xs text-muted-foreground">Low Stock</p>
                        </div>
                        <div 
                          className="text-center p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                          onClick={() => {
                            setInventoryStockFilter("outofstock");
                            setActiveTab("inventory");
                            setLoadedTabs((prev) => new Set(prev).add("inventory"));
                          }}
                        >
                          <p className="text-lg font-bold text-red-600">{pharmacyStats.outOfStock}</p>
                          <p className="text-xs text-muted-foreground">Out of Stock</p>
                        </div>
                      </div>

                      {(stats?.lowStock.count ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">All medicines are in stock</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stats?.lowStock.items.map((item) => (
                            <div key={item.drugid} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium">{item.drugname}</p>
                                <p className="text-[11px] text-muted-foreground">{item.strength} &middot; {item.form}</p>
                              </div>
                              <Badge variant={item.totalQuantity === 0 ? "destructive" : "outline"} className="text-xs">
                                {item.totalQuantity} left
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Doctor Notifications & Urgent Orders */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-[#618FF5]" />
                        Doctor Notifications
                        {(stats?.notifications.count ?? 0) > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-[#618FF5]">
                            {stats?.notifications.count}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {(stats?.notifications.count ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No urgent notifications</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stats?.notifications.items.map((n) => (
                            <div key={n.orderid} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium flex items-center gap-1">
                                  {n.priority === "stat" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                  Order {n.orderid.slice(0, 8)}...
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {n.notes || `${n.source} order`} &middot; {new Date(n.createdat).toLocaleTimeString()}
                                </p>
                              </div>
                              <Badge
                                className={`text-[10px] ${n.priority === "stat" ? "bg-red-500" : "bg-orange-500"}`}
                              >
                                {n.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Sellers */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Top Selling Medicines
                        <Badge className="text-[10px] px-1.5 py-0 bg-green-500">
                          This Month
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {(!stats?.topSellers || stats.topSellers.length === 0) ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No sales data available</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stats.topSellers.map((item: any, index: number) => (
                            <div key={item.itemid || index} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5">#{index + 1}</span>
                                <div>
                                  <p className="text-sm font-medium">{item.itemname || item.drugname}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.genericname || item.strength}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">{item.totalquantity || item.quantity}</p>
                                <p className="text-[10px] text-muted-foreground">units sold</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Overdue Orders */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Overdue Orders
                        {(stats?.overdue.count ?? 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {stats?.overdue.count}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {(stats?.overdue.count ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No overdue orders</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stats?.overdue.orders.map((o) => (
                            <div key={o.orderid} className="flex items-center justify-between py-1.5 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium">Order {o.orderid.slice(0, 8)}...</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Created {new Date(o.createdat).toLocaleDateString()} {new Date(o.createdat).toLocaleTimeString()}
                                </p>
                              </div>
                              <Badge variant={o.priority === "stat" ? "destructive" : "outline"} className="text-xs">
                                {o.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Status Breakdown */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#618FF5]" />
                        Order Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3 pt-2">
                        <StatusBar label="Pending" value={stats?.orders.pending ?? 0} total={stats?.orders.total || 1} color="bg-amber-400" />
                        <StatusBar label="In Progress" value={stats?.orders.inProgress ?? 0} total={stats?.orders.total || 1} color="bg-blue-400" />
                        <StatusBar label="Dispensed" value={stats?.orders.dispensed ?? 0} total={stats?.orders.total || 1} color="bg-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
      </TabsContent>

      {/* Orders Tab */}
      <TabsContent value="orders" className="mt-0 flex-1 flex flex-col overflow-hidden px-4">
        {loadedTabs.has("orders") && (
          <div className="flex-1 overflow-hidden">
            <PharmacyOrdersPage 
              workspaceid={workspaceid}
              userName={userName}
              userId={userId}
            />
          </div>
        )}
      </TabsContent>

      {/* Point of Sale Tab */}
      <TabsContent value="pos" className="mt-4 px-4">
        {loadedTabs.has("pos") && (
          <div className="text-center py-8">
            <div className="mb-6">
              <ShoppingCart className="h-16 w-16 text-[#618FF5] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Point of Sale</h2>
              <p className="text-gray-600 mb-6">Complete POS system for pharmacy sales and transactions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/d/${workspaceid}/pos`}>
                <CardContent className="p-6 text-center">
                  <ShoppingCart className="h-8 w-8 text-[#618FF5] mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">POS Terminal</h3>
                  <p className="text-sm text-gray-600">Main sales interface with search, cart, and checkout</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/d/${workspaceid}/pos/shifts`}>
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 text-[#618FF5] mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Shift Management</h3>
                  <p className="text-sm text-gray-600">Open/close shifts and reconcile cash drawer</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/d/${workspaceid}/pos/reports`}>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-8 w-8 text-[#618FF5] mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Sales Reports</h3>
                  <p className="text-sm text-gray-600">Daily sales analytics and performance metrics</p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
              <Button 
                className="bg-[#618FF5] text-white hover:bg-[#4a7ae0] font-semibold px-6 py-2"
                onClick={() => window.location.href = `/d/${workspaceid}/pos`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Open POS Terminal
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Drug Registration Tab */}
      <TabsContent value="drug-registration" className="mt-4 px-4">
        {loadedTabs.has("drug-registration") && (
          <DrugRegistration workspaceid={workspaceid} />
        )}
      </TabsContent>


      {/* Inventory Tab */}
      <TabsContent value="inventory" className="mt-4 px-4">
        {loadedTabs.has("inventory") && (
          <PharmacyInventoryPage initialStockFilter={inventoryStockFilter} />
        )}
      </TabsContent>

      {/* Insurance Tab */}
      <TabsContent value="insurance" className="mt-4 px-4">
        {loadedTabs.has("insurance") && (
          <PlaceholderTab title="Insurance" description="Insurance management — coming soon" icon={<Shield className="h-12 w-12 text-gray-300" />} />
        )}
      </TabsContent>

      {/* To Do Tab */}
      <TabsContent value="todo" className="mt-4 px-4">
        {loadedTabs.has("todo") && (
          <PlaceholderTab title="To Do" description="Task management and reminders" icon={<ListTodo className="h-12 w-12 text-gray-300" />} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlaceholderTab({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16">
        {icon}
        <h3 className="text-lg font-semibold mt-4 mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Client Component: PharmacyDashboard
 * - Pharmacy dashboard with tabs matching the design mockup
 * - Tabs: Dashboard, Orders, Drug registration, HR, Inventory, Billing, Insurance, To Do
 */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  Users,
  Package,
  Receipt,
  Shield,
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
} from "lucide-react";
import PharmacyOrdersPage from "../orders/orders-list";
import PrescriptionManagement from "./components/PrescriptionManagement";
import InventoryManagement from "./components/InventoryManagement";
import DrugRegistration from "./components/DrugRegistration";

const TEAL = "#2BBCB3";

interface DashboardStats {
  lowStock: { count: number; threshold: number; items: { drugid: string; drugname: string; strength: string; form: string; totalQuantity: number }[] };
  orders: { total: number; pending: number; inProgress: number; dispensed: number; todayCount: number };
  customers: { todayVisits: number };
  sales: { totalRevenue: number; todayRevenue: number; totalInvoices: number; paidInvoices: number };
  overdue: { count: number; orders: { orderid: string; priority: string; createdat: string }[] };
  notifications: { count: number; items: { orderid: string; priority: string; status: string; notes: string | null; createdat: string; source: string }[] };
}

export default function PharmacyDashboard({
  workspaceid,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userName,
}: {
  workspaceid: string;
  userName: string;
}) {
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["dashboard"]));

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["pharmacy-dashboard", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-dashboard`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Tabs */}
      <div className="px-6 pt-4 pb-2">
        <Tabs
          defaultValue="dashboard"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="flex w-full flex-wrap gap-1.5 h-auto bg-transparent p-0">
            <TabsTrigger
              value="dashboard"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <ClipboardList className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="drug-registration"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <Pill className="h-4 w-4" />
              Drug registration
            </TabsTrigger>
            <TabsTrigger
              value="hr"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <Users className="h-4 w-4" />
              HR
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <Receipt className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="insurance"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <Shield className="h-4 w-4" />
              Insurance
            </TabsTrigger>
            <TabsTrigger
              value="todo"
              className="rounded-md data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-[#2BBCB3] text-white border-0 font-semibold px-4 py-2 flex items-center gap-1.5 text-sm"
            >
              <ListTodo className="h-4 w-4" />
              To Do
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Orders</p>
                          <p className="text-2xl font-bold">{stats?.orders.total ?? 0}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-teal-600" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="text-teal-600 font-medium">{stats?.orders.todayCount ?? 0}</span> today
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
                          <UserCheck className="h-5 w-5 text-blue-600" />
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
                          <p className="text-2xl font-bold">${(stats?.sales.todayRevenue ?? 0).toFixed(2)}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Total: <span className="font-medium">${(stats?.sales.totalRevenue ?? 0).toFixed(2)}</span>
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
                        <BellRing className="h-4 w-4 text-blue-500" />
                        Doctor Notifications
                        {(stats?.notifications.count ?? 0) > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500">
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
                        <TrendingUp className="h-4 w-4 text-teal-500" />
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

                {/* Drug Interaction card */}
                <Card
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer text-white"
                  style={{ backgroundColor: TEAL }}
                >
                  <CardContent className="flex items-center justify-center py-6">
                    <FlaskConical className="h-6 w-6 text-white/80 mr-3" />
                    <span className="text-white font-semibold text-base">Check drug interaction</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            {loadedTabs.has("orders") && (
              <div className="space-y-6">
                <PrescriptionManagement workspaceid={workspaceid} />
                <div className="border-t pt-6">
                  <PharmacyOrdersPage workspaceid={workspaceid} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Placeholder Tabs */}
          <TabsContent value="drug-registration" className="mt-4">
            {loadedTabs.has("drug-registration") && (
              <DrugRegistration workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="hr" className="mt-4">
            {loadedTabs.has("hr") && (
              <PlaceholderTab title="HR" description="Manage pharmacy staff and human resources" icon={<Users className="h-12 w-12 text-gray-300" />} />
            )}
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            {loadedTabs.has("inventory") && (
              <InventoryManagement workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            {loadedTabs.has("billing") && (
              <PlaceholderTab title="Billing" description="Manage billing, invoices, and payment records" icon={<Receipt className="h-12 w-12 text-gray-300" />} />
            )}
          </TabsContent>

          <TabsContent value="insurance" className="mt-4">
            {loadedTabs.has("insurance") && (
              <PlaceholderTab title="Insurance" description="Manage insurance claims and coverage verification" icon={<Shield className="h-12 w-12 text-gray-300" />} />
            )}
          </TabsContent>

          <TabsContent value="todo" className="mt-4">
            {loadedTabs.has("todo") && (
              <PlaceholderTab title="To Do" description="Task management and reminders" icon={<ListTodo className="h-12 w-12 text-gray-300" />} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
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

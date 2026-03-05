/**
 * Client Component: LabTechDashboard
 * - Lab technician dashboard with tabs for different sections
 * - Orders, Work-list, Validation, Sample Management, etc.
 */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  ClipboardList, 
  ListChecks, 
  CheckCircle2, 
  TestTube2, 
  Bell,
  Users,
  ListTodo,
  Home,
  ScanBarcode,
  ClipboardCheck,
} from "lucide-react";
import OrdersTab from "./components/OrdersTab";
import RegisterSample from "./components/RegisterSample";
import WorklistsTab from "./components/WorklistsTab";
import ValidationTab from "./components/ValidationTab";
import SampleManagementTab from "./components/SampleManagementTab";
import NotificationTab from "./components/NotificationTab";
import ContactsTab from "./components/ContactsTab";
import ToDoTab from "./components/ToDoTab";
import QCCalibrationTab from "./components/QCCalibrationTab";

export default function LabTechDashboard({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(["orders"])
  );

  // Fetch unread notification count
  const { data: unreadCountData } = useQuery({
    queryKey: ["unread-notification-count", workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/notifications?workspaceid=${workspaceid}&unreadOnly=true&countOnly=true`);
      if (!response.ok) return { count: 0 };
      const data = await response.json();
      return { count: data.count || 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadCountData?.count || 0;

  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden pt-3">
    

      <Tabs
        defaultValue="orders"
        className="w-full flex-1 flex flex-col min-h-0"
        onValueChange={handleTabChange}
      >
        <TabsList className="flex w-full flex-wrap gap-1 h-auto bg-transparent p-0">
          <TabsTrigger
            value="orders"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ClipboardList className="h-4 w-4" />
            Orders
          </TabsTrigger>

          <TabsTrigger
            value="accessioning"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ScanBarcode className="h-4 w-4" />
            Register Sample
          </TabsTrigger>

          <TabsTrigger
            value="worklist"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ListChecks className="h-4 w-4" />
            Work-list
          </TabsTrigger>

          <TabsTrigger
            value="validation"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Validation
          </TabsTrigger>

          <TabsTrigger
            value="samplestore"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <TestTube2 className="h-4 w-4" />
            Sample Management
          </TabsTrigger>

          <TabsTrigger
            value="qc"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ClipboardCheck className="h-4 w-4" />
            QC & Calibration
          </TabsTrigger>

          <TabsTrigger
            value="notification"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <div className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span>Notification</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs min-w-[20px] h-5 px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="contacts"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>

          <TabsTrigger
            value="todo"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ListTodo className="h-4 w-4" />
            To Do
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-2 flex-1 min-h-0">
          <OrdersTab workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="accessioning" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("accessioning") && (
            <RegisterSample workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="worklist" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("worklist") && (
            <WorklistsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="qc" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("qc") && (
            <QCCalibrationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="validation" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("validation") && (
            <ValidationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="samplestore" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("samplestore") && (
            <SampleManagementTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="notification" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("notification") && (
            <NotificationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("contacts") && (
            <ContactsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="todo" className="mt-2 flex-1 min-h-0">
          {loadedTabs.has("todo") && (
            <ToDoTab workspaceid={workspaceid} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

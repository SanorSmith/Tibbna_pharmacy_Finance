/**
 * Client Component: LabTechDashboard
 * - Lab technician dashboard with tabs for different sections
 * - Orders, Work-list, Validation, Sample store, Lab Management, Test Analysis, etc.
 */
"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ClipboardList, 
  ListChecks, 
  CheckCircle2, 
  TestTube2, 
  Settings, 
  FlaskConical,
  Shield,
  CreditCard,
  Bell,
  Users,
  ListTodo,
  Home,
  ScanBarcode
} from "lucide-react";
import OrdersTab from "./components/OrdersTab";
import AccessioningTab from "./components/AccessioningTab";
import WorklistsTab from "./components/WorklistsTab";
import ValidationTab from "./components/ValidationTab";
import SampleStoreTab from "./components/SampleStoreTab";
import LabManagementTab from "./components/LabManagementTab";
import TestAnalysisTab from "./components/TestAnalysisTab";
import InsuranceTab from "./components/InsuranceTab";
import BillingTab from "./components/BillingTab";
import NotificationTab from "./components/NotificationTab";
import ContactsTab from "./components/ContactsTab";
import ToDoTab from "./components/ToDoTab";

export default function LabTechDashboard({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(["orders"])
  );

  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <Link href={`/d/${workspaceid}/lab-tech`}>
            <Button
              variant="outline"
              size="icon"
              aria-label="Home"
              className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-md font-medium text-muted-foreground">Laboratory Information Management System</h1>
            <p className="mt-1">
              
            </p>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="orders"
        className="w-full"
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
            Accessioning
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
            Sample store
          </TabsTrigger>

          <TabsTrigger
            value="labmanagement"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Settings className="h-4 w-4" />
            Lab Management
          </TabsTrigger>

          <TabsTrigger
            value="testanalysis"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <FlaskConical className="h-4 w-4" />
            Test Analysis
          </TabsTrigger>

          <TabsTrigger
            value="insurance"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Shield className="h-4 w-4" />
            Insurance
          </TabsTrigger>

          <TabsTrigger
            value="billing"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>

          <TabsTrigger
            value="notification"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Bell className="h-4 w-4" />
            Notification
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

        <TabsContent value="orders" className="mt-4">
          <OrdersTab workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="accessioning" className="mt-4">
          {loadedTabs.has("accessioning") && (
            <AccessioningTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="worklist" className="mt-4">
          {loadedTabs.has("worklist") && (
            <WorklistsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="validation" className="mt-4">
          {loadedTabs.has("validation") && (
            <ValidationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="samplestore" className="mt-4">
          {loadedTabs.has("samplestore") && (
            <SampleStoreTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="labmanagement" className="mt-4">
          {loadedTabs.has("labmanagement") && (
            <LabManagementTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="testanalysis" className="mt-4">
          {loadedTabs.has("testanalysis") && (
            <TestAnalysisTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="insurance" className="mt-4">
          {loadedTabs.has("insurance") && (
            <InsuranceTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          {loadedTabs.has("billing") && (
            <BillingTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="notification" className="mt-4">
          {loadedTabs.has("notification") && (
            <NotificationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          {loadedTabs.has("contacts") && (
            <ContactsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="todo" className="mt-4">
          {loadedTabs.has("todo") && (
            <ToDoTab workspaceid={workspaceid} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";
import FinanceOverview from "./components/finance-overview";
import ChartOfAccounts from "./components/chart-of-accounts";
import JournalEntries from "./components/journal-entries";
import AccountsPayable from "./components/accounts-payable";
import AccountsReceivable from "./components/accounts-receivable";
import FinanceReports from "./components/finance-reports";
import FinanceSettings from "./components/finance-settings";

interface Props {
  workspaceid: string;
  userName: string;
  userId: string;
}

const TABS = [
  { value: "overview", label: "Dashboard", icon: LayoutDashboard },
  { value: "coa", label: "Chart of Accounts", icon: BookOpen },
  { value: "journals", label: "Journal Entries", icon: FileText },
  { value: "ap", label: "Accounts Payable", icon: Receipt },
  { value: "ar", label: "Accounts Receivable", icon: CreditCard },
  { value: "reports", label: "Reports", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings },
];

export default function FinanceDashboard({ workspaceid, userName, userId }: Props) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([tabParam]));

  useEffect(() => {
    const tab = searchParams.get("tab") || "overview";
    setActiveTab(tab);
    setLoadedTabs((prev) => new Set(prev).add(tab));
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLoadedTabs((prev) => new Set(prev).add(value));
    window.history.replaceState(null, "", `?tab=${value}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Financial management, accounting &amp; reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="border-b bg-white px-6">
          <TabsList className="h-12 bg-transparent gap-2 -mb-px">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none rounded-none px-4 gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <TabsContent value="overview" className="mt-0">
            {loadedTabs.has("overview") && (
              <FinanceOverview workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="coa" className="mt-0">
            {loadedTabs.has("coa") && (
              <ChartOfAccounts workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="journals" className="mt-0">
            {loadedTabs.has("journals") && (
              <JournalEntries workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="ap" className="mt-0">
            {loadedTabs.has("ap") && (
              <AccountsPayable workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="ar" className="mt-0">
            {loadedTabs.has("ar") && (
              <AccountsReceivable workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            {loadedTabs.has("reports") && (
              <FinanceReports workspaceid={workspaceid} />
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            {loadedTabs.has("settings") && (
              <FinanceSettings workspaceid={workspaceid} />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

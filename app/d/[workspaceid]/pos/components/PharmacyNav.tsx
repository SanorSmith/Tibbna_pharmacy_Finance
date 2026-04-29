"use client";

import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Pill,
  Warehouse,
  Shield,
  ListTodo,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { label: "Dashboard", value: "dashboard", icon: LayoutDashboard },
  { label: "Orders", value: "orders", icon: ClipboardList },
  { label: "Point of Sale", value: "pos", icon: ShoppingCart },
  { label: "Drug registration", value: "drug-registration", icon: Pill },
  { label: "Inventory", value: "inventory", icon: Warehouse },
  { label: "Insurance", value: "insurance", icon: Shield },
  { label: "To Do", value: "todo", icon: ListTodo },
];

export function PharmacyNav({
  workspaceid,
  activeTab,
}: {
  workspaceid: string;
  activeTab: string;
}) {
  const router = useRouter();
  const dashboardBase = `/d/${workspaceid}/pharmacy/dashboard`;

  const handleTabChange = (value: string) => {
    if (value === "pos") {
      router.push(`/d/${workspaceid}/pos`);
    } else {
      router.push(`${dashboardBase}?tab=${value}`);
    }
  };

  return (
    <div className="flex-shrink-0 px-4 pt-2 pb-1">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex w-full flex-wrap gap-1 h-auto bg-transparent p-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-3 py-1.5 flex items-center gap-1 text-xs"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}

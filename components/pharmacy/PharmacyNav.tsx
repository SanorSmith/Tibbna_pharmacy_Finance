"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Pill,
  Warehouse,
  Bell,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Reminder {
  reminderid: string;
  reminderdate: string | null;
  isread: boolean;
  completed: boolean;
}

const TABS = [
  { label: "Dashboard", value: "dashboard", icon: LayoutDashboard },
  { label: "Orders", value: "orders", icon: ClipboardList },
  { label: "Point of Sale", value: "pos", icon: ShoppingCart },
  { label: "Drug registration", value: "drug-registration", icon: Pill },
  { label: "Inventory", value: "inventory", icon: Warehouse },
  { label: "Reminders", value: "todo", icon: Bell },
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

  const { data } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ["patient-reminders", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patient-reminders`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
  });

  const todayStr = new Date().toDateString();
  const unreadTodayCount = (data?.reminders || []).filter((r) => {
    if (r.isread || r.completed || !r.reminderdate) return false;
    return new Date(r.reminderdate).toDateString() === todayStr;
  }).length;

  const handleTabChange = (value: string) => {
    if (value === "pos") {
      router.push(`/d/${workspaceid}/pos`);
    } else if (value === "inventory") {
      router.push(`/d/${workspaceid}/pharmacy-inventory`);
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
                className="relative rounded-md data-[state=active]:bg-[#4a6fd4] data-[state=active]:text-white bg-[#618FF5] text-white border-0 font-semibold px-4 py-2.5 flex items-center gap-1.5 text-sm"
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
                {tab.value === "todo" && unreadTodayCount > 0 && (
                  <Badge className="ml-0.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] border-0">
                    {unreadTodayCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}

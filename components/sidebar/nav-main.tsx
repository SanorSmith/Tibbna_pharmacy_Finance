"use client";

import {
  ChevronRight,
  SquareTerminal,
  Bot,
  BookOpen,
  Settings,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";

export function NavMain() {
  const { ttt } = useLanguage();

  const data = {
    navMain: [
      {
        title: ttt("My transactions"),
        url: "/d/transactions",
        icon: SquareTerminal,
        isActive: true,
      },
      {
        title: ttt("Invoices"),
        url: "#",
        icon: Bot,
        items: [
          {
            title: ttt("Invoices"),
            url: "#",
          },
          {
            title: ttt("Offers"),
            url: "#",
          },
          {
            title: ttt("Customers"),
            url: "#",
          },
        ],
      },
      {
        title: ttt("Salaries"),
        url: "#",
        icon: BookOpen,
        items: [
          {
            title: ttt("Salaries"),
            url: "#",
          },
          {
            title: ttt("Employees"),
            url: "#",
          },
          {
            title: ttt("Outlays"),
            url: "#",
          },
        ],
      },
      {
        title: ttt("Settings"),
        url: "#",
        icon: Settings,
      },
    ],
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{ttt("Workspace")}</SidebarGroupLabel>
        <SidebarMenu>
          {data.navMain.map((item) => {
            // Regular items with potential sub-items
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}

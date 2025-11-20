"use client";

import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
} from "lucide-react";

import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { User } from "@/lib/db/tables/user";
import { useLanguage } from "@/hooks/use-language";
import { UserSettingsModal } from "./user-settings-modal";
import { useRouter } from "next/navigation";

export function NavUser({ user, roleLabel }: { user: User; roleLabel?: string }) {
  const { isMobile } = useSidebar();
  const { ttt } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              {user.image && (
                <AvatarImage src={user.image} alt={user.name ?? ""} />
              )}
              <AvatarFallback className="rounded-lg">
                {user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {roleLabel || user.permissions?.join(", ") || "User"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {now.toLocaleDateString()} • {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image && (
                  <AvatarImage src={user.image} alt={user.name ?? ""} />
                )}
                <AvatarFallback className="rounded-lg">
                  {user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setIsSettingsOpen(true)}
              className="cursor-pointer"
            >
              <Settings />
              {ttt("Account Settings")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle />
              {ttt("Help")}
            </DropdownMenuItem>
            {user.permissions?.includes("admin") && (
              <DropdownMenuItem onClick={() => router.push("/d/admin")}>
                <Shield />
                {ttt("Admin Panel")}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer"
          >
            <LogOut />
            {ttt("Log out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

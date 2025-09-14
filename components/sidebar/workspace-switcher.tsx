"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  WorkspaceIcon,
  WorkspaceIconWithBg,
  getWorkspaceLabel,
} from "@/components/shared/workspace-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/hooks/use-workspace";

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { ttt } = useLanguage();
  const { workspace, workspaces } = useWorkspace();

  const handleCreateWorkspace = () => {
    router.push("/d/new");
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    router.push(`/d/${workspaceId}`);
  };

  if (!workspace) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={handleCreateWorkspace}
            className="text-sidebar-foreground/70"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {ttt("Create Workspace")}
              </span>
              <span className="truncate text-xs">No workspaces yet</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  console.log(workspace);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <WorkspaceIconWithBg
                type={workspace.workspace.type}
                className="flex aspect-square size-8 items-center justify-center rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {workspace.workspace.name}
                </span>
                <span className="truncate text-xs">
                  {getWorkspaceLabel(workspace.workspace.type, ttt)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {ttt("Workspaces")}
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => {
              return (
                <DropdownMenuItem
                  key={workspace.workspace.workspaceid}
                  onClick={() =>
                    handleWorkspaceSelect(workspace.workspace.workspaceid)
                  }
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <WorkspaceIcon
                      type={workspace.workspace.type}
                      className="size-3.5 shrink-0"
                    />
                  </div>
                  {workspace.workspace.name || "Unnamed Workspace"}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

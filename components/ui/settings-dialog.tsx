"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { LucideIcon } from "lucide-react";

export interface SettingsSection {
  name: string;
  icon: LucideIcon;
  component?: React.ReactNode;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  sections: SettingsSection[];
  defaultSection?: SettingsSection;
  className?: string;
  maxHeight?: string;
  maxWidth?: string;
  mobileFullHeight?: boolean;
}

export function SettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  sections,
  defaultSection,
  className = "",
  maxHeight = "md:max-h-[500px]",
  maxWidth = "md:max-w-[700px] lg:max-w-[800px]",
  mobileFullHeight = false,
}: SettingsDialogProps) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = React.useState(
    defaultSection || sections[0]
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // Update active section if defaultSection changes
  React.useEffect(() => {
    if (defaultSection) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection]);

  const dialogContentClassName = `overflow-hidden p-0 ${maxHeight} ${maxWidth} ${
    mobileFullHeight
      ? "max-h-[100vh] md:max-h-[500px] top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%] h-full md:h-auto"
      : ""
  } ${className}`;

  const mainClassName = `flex ${
    mobileFullHeight ? "h-full md:h-[480px]" : "h-[480px]"
  } flex-1 flex-col overflow-hidden`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClassName}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar
            collapsible="none"
            className={`${
              isMobile ? (mobileSidebarOpen ? "flex w-48" : "hidden") : "flex"
            }`}
          >
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sections.map((section) => (
                      <SidebarMenuItem key={section.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={section.name === activeSection.name}
                          onClick={() => {
                            setActiveSection(section);
                            if (isMobile) {
                              setMobileSidebarOpen(false);
                            }
                          }}
                        >
                          <a href="#">
                            <section.icon />
                            <span>{section.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className={mainClassName}>
            <header className="flex h-12 shrink-0 items-center border-b pr-12 px-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 -ml-2"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              )}
              {(!isMobile || !mobileSidebarOpen) && (
                <h2 className="text-lg font-semibold">{activeSection.name}</h2>
              )}
            </header>
            <div
              onClick={() => {
                if (isMobile) {
                  setMobileSidebarOpen(false);
                }
              }}
              className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0"
            >
              <div
                className={`${isMobile && mobileSidebarOpen ? "hidden" : ""}`}
              >
                {activeSection.component || (
                  <div className="flex items-center justify-center h-32" />
                )}
              </div>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}

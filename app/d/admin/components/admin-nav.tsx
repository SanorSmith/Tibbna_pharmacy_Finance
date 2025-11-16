"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

import { Users, Building2, Heart, ArrowLeft} from "lucide-react";

const navItems = [
  {
    href: "/d/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/d/admin/workspaces",
    label: "Workspaces",
    icon: Building2,
  },
  {
    href: "/d/admin/openehr",
    label: "OpenEHR",
    icon: Heart,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  // Get workspace ID from URL
  const params = useParams();
  const workspaceId= params?.workspaceid; 
const backHref = workspaceId ? `/d/${workspaceId}` : "/d";

return (
    <nav className="flex items-center space-x-4 border-b pb-4 mb-6">
      <Link
        href={backHref}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-white hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Link>
      <div className="h-6 w-px bg-border mx-1" />
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-white"
                : "text-muted-foreground hover:text-white hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
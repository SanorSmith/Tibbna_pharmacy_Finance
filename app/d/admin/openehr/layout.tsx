"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Users } from "lucide-react";

const navItems = [
  {
    href: "/d/admin/openehr/templates",
    label: "Templates",
    icon: FileText,
  },
  {
    href: "/d/admin/openehr/ehrs",
    label: "EHRs",
    icon: Users,
  },
];

export default function OpenEHRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex space-x-4 border-b pb-4">
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
      {children}
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLanguage } from "@/hooks/use-language";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isLast?: boolean;
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const { ttt } = useLanguage();

  // Define breadcrumb configurations for specific routes
  const getBreadcrumbConfig = (path: string): BreadcrumbItem[] => {
    switch (path) {
      case "/d":
        return [{ label: ttt("Dashboard"), isLast: true }];

      case "/d/page1":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Page 1"), isLast: true },
        ];

      case "/d/page2":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Page 2"), isLast: true },
        ];

      case "/d/settings":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Settings"), isLast: true },
        ];

      case "/d/settings/profile":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Settings"), href: "/d/settings" },
          { label: ttt("Profile"), isLast: true },
        ];

      case "/d/users":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Users"), isLast: true },
        ];

      case "/d/projects":
        return [
          { label: ttt("Dashboard"), href: "/d" },
          { label: ttt("Projects"), isLast: true },
        ];

      default:
        return [{ label: ttt("Dashboard"), isLast: true, href: "/d" }];
    }
  };

  const breadcrumbItems = getBreadcrumbConfig(pathname);

  if (breadcrumbItems.length <= 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href!}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

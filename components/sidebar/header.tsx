"use client";

import Link from "next/link";

export function Header({
  middleSlot,
  rightSlot,
  userRole,
  workspaceid,
}: {
  middleSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  userRole?: string;
  workspaceid?: string;
}) {
  const headerBg = "bg-[#618FF5]";

  const headerTitle =
    userRole === "admin" || userRole === "administrator"
      ? "Tibbna-Admin"
      : userRole === "lab_technician"
      ? "Tibbna-LIMs"
      : userRole === "pharmacist"
      ? "Tibbna-PIs"
      : "Tibbna-EHR";

  const dashboardPath = 
    userRole === "lab_technician"
      ? `/d/${workspaceid}/lims`
      : userRole === "pharmacist"
      ? `/d/${workspaceid}/pharmacy`
      : `/d/${workspaceid}/doctor`;

  return (
    <header className={`flex h-16 shrink-0 items-center ${headerBg} text-white justify-between mt-8 gap-4 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12`}>
      <div className="flex items-center flex-1 min-w-0">
        {/* <SidebarTrigger className="-ml-1" /> */}
        <Link href={dashboardPath} className="cursor-pointer hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-bold whitespace-nowrap mr-8">
            {headerTitle}
          </h1>
        </Link>
        {middleSlot && (
          <div className="flex-1 max-w-xl ml-16">
            {middleSlot}
          </div>
        )}
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}

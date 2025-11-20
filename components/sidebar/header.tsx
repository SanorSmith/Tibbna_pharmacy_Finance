import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/sidebar/breadcrumb";

export function Header({
  rightSlot,
}: {
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        {/* <SidebarTrigger className="-ml-1" /> */}
        <h1 className="text-lg font-semibold">Tibbna EHR</h1>
        {/* <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        /> */}
        {/* <DynamicBreadcrumb /> */}
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}

/**
 * Page: Staff Roles & Permissions
 * - Displays staff members with their roles and permissions in a table format
 * - Route: /d/[workspaceid]/staff/roles
 */
import { Header } from "@/components/sidebar/header";
import RolesTable from "./roles-table";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function StaffRolesPage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage staff roles and their associated permissions
            </p>
          </div>
        </div>
        <div className="bg-background rounded-xl border">
          <RolesTable workspaceid={workspaceid} />
        </div>
      </div>
    </>
  );
}

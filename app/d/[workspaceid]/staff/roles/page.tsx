/**
 * Page: Staff Roles & Permissions
 * - Displays staff members with their roles and permissions in a table format
 * - Route: /d/[workspaceid]/staff/roles
 */
import { Header } from "@/components/sidebar/header";
import RolesTable from "./roles-table";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function StaffRolesPage({ params }: PageProps) {
  const user = await getUser();
  if (!user) redirect("/");
  
  const { workspaceid } = await params;
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  if (!membership) redirect("/d/empty");

  return (
    <>
      <Header userRole={membership.role} />
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

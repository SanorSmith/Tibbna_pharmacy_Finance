/**
 * Page: /d/[workspaceid]/staff
 * - Lists staff for the workspace; shows "Add Staff" button for admins
 * - Delegates data fetching/rendering to client component StaffList
 */
import { Header } from "@/components/sidebar/header";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import StaffList from "./staff-list";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function StaffPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  let isAdmin = false;
  if (user) {
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
    const isWorkspaceAdmin = membership?.role === "administrator";
    const normalizePerms = (perms: unknown): string[] => {
      try {
        if (Array.isArray(perms)) return perms as string[];
        if (typeof perms === "string") {
          const trimmed = perms.trim();
          const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
            ? trimmed.slice(1, -1)
            : trimmed;
          const parsed = JSON.parse(dequoted);
          if (Array.isArray(parsed)) return parsed as string[];
        }
      } catch {}
      return [];
    };
    const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
    isAdmin = isWorkspaceAdmin || isGlobalAdmin;
  }

  return (
    <>
      {/* <Header /> */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Staff</h1>
        </div>
        <div className="flex items-center justify-between">
  {/* existing title / actions */}
  <Link href={`/d/${workspaceid}/doctor`}>
    <Button variant="outline" size="sm">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  </Link>
</div>
        <div className="bg-muted/50 rounded-xl p-4">
          <StaffList workspaceid={workspaceid} isAdmin={isAdmin} />
        </div>
      </div>
    </>
  );
}

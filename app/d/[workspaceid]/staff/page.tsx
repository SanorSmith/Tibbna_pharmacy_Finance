/**
 * Page: /d/[workspaceid]/staff
 * - Lists staff for the workspace; shows "Add Staff" button for admins
 * - Delegates data fetching/rendering to client component StaffList
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import StaffList from "./staff-list";
interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function StaffPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  let isAdmin = false;
  if (user) {
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );
    const isWorkspaceAdmin = membership?.role === "administrator";
    const normalizePerms = (perms: unknown): string[] => {
      try {
        if (Array.isArray(perms)) return perms as string[];
        if (typeof perms === "string") {
          const trimmed = perms.trim();
          const dequoted =
            trimmed.startsWith("'") && trimmed.endsWith("'")
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
    <div className="container mx-auto py-6">
      <StaffList workspaceid={workspaceid} isAdmin={isAdmin} />
       </div>
  );
}

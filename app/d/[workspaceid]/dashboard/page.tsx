/**
 * Page: Administrator Dashboard
 * - Overview of key metrics and statistics
 * - Quick access to important features
 * - Route: /d/[workspaceid]/dashboard
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect("/");
  }

  // Check if user is administrator
  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const isAdmin = membership?.role === "administrator";

  // Check global admin permissions
  function normalizePerms(p: unknown): string[] {
    if (Array.isArray(p)) return p.map(String);
    if (typeof p === "string") return [p];
    return [];
  }
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");

  if (!isAdmin && !isGlobalAdmin) {
    redirect(`/d/${workspaceid}`);
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administrator Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Overview of your workspace statistics and quick actions
            </p>
          </div>
        </div>
        <DashboardContent workspaceid={workspaceid} />
      </div>
    </>
  );
}

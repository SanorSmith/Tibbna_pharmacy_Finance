import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/sidebar/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardProviders } from "@/contexts/dashboardproviders";
import { WorkspaceProvider } from "@/contexts/workspaceprovider";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export default async function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceid: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  const { workspaceid } = await params;
  const workspaces = await getUserWorkspaces(user.userid);
  const workspace = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid
  );

  if (!workspace) {
    redirect("/d/empty");
  }

  return (
    <WorkspaceProvider workspaces={workspaces} workspaceid={workspaceid}>
      <DashboardProviders user={user}>
        <SidebarProvider>
          <AppSidebar user={user} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </DashboardProviders>
    </WorkspaceProvider>
  );
}

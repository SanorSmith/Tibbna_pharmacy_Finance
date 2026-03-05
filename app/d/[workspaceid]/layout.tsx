import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Header } from "@/components/sidebar/header";
import { NavUser } from "@/components/sidebar/nav-user";
import { HeaderActions } from "@/components/sidebar/header-actions";
import { PatientSearch } from "@/components/patients/patient-search";
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

  const roleLabel = workspace.role
    ? workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)
    : undefined;

  return (
    <WorkspaceProvider workspaces={workspaces} workspaceid={workspaceid}>
      <DashboardProviders user={user}>
        <SidebarProvider>
          {/*  <AppSidebar user={user} /> */}
          <SidebarInset>
            <Header
              middleSlot={workspace.role !== 'lab_technician' ? <PatientSearch workspaceid={workspaceid} /> : null}
              rightSlot={
                <>
                  <HeaderActions />
                  <NavUser user={user} roleLabel={roleLabel} />
                </>
              }
              userRole={workspace.role}
            />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </DashboardProviders>
    </WorkspaceProvider>
  );
}

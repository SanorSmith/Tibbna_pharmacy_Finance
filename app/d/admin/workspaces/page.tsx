import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUsers } from "@/lib/db/queries/admin/user";
import { getAllWorkspaces } from "@/lib/db/queries/admin/workspace";
import { WorkspaceManagementClient } from "./components/workspace-management-client";

export default async function AdminWorkspacesPage() {
  const [users, workspaces] = await Promise.all([
    getAllUsers(100, 0),
    getAllWorkspaces(100, 0),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Management</CardTitle>
      </CardHeader>
      <CardContent>
        <WorkspaceManagementClient
          initialWorkspaces={workspaces}
          allUsers={users}
        />
      </CardContent>
    </Card>
  );
}

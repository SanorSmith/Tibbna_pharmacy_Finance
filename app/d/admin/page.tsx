import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2 } from "lucide-react";
import { getAllUsers } from "@/lib/db/queries/admin/user";
import { getAllWorkspaces } from "@/lib/db/queries/admin/workspace";
import { UserManagementClient } from "./components/user-management-client";
import { WorkspaceManagementClient } from "./components/workspace-management-client";

export default async function AdminPage() {
  const [users, workspaces] = await Promise.all([
    getAllUsers(100, 0),
    getAllWorkspaces(100, 0),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger
            value="workspaces"
            className="flex items-center space-x-2"
          >
            <Building2 className="h-4 w-4" />
            <span>Workspaces</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagementClient initialUsers={users} allWorkspaces={workspaces} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Management</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspaceManagementClient initialWorkspaces={workspaces} allUsers={users} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

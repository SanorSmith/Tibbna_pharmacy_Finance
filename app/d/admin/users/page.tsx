import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllUsers } from "@/lib/db/queries/admin/user";
import { getAllWorkspaces } from "@/lib/db/queries/admin/workspace";
import { UserManagementClient } from "./components/user-management-client";

export default async function AdminUsersPage() {
  const [users, workspaces] = await Promise.all([
    getAllUsers(100, 0),
    getAllWorkspaces(100, 0),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <UserManagementClient initialUsers={users} allWorkspaces={workspaces} />
      </CardContent>
    </Card>
  );
}

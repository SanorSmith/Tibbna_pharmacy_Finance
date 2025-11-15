/**
 * Operations/Operative Procedures Page
 * - List and manage surgical operations
 * - Book new operations
 * - Accessible to doctors and administrators
 */
import { Header } from "@/components/sidebar/header";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import OperationsList from "./operations-list";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function OperationsPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) redirect("/d");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  // Only doctors and administrators can access
  const allowed = role === "doctor" || role === "administrator";
  if (!allowed) redirect(`/d/${workspaceid}`);

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Operative Procedures</h1>
        </div>
        <OperationsList workspaceid={workspaceid} userRole={role} userId={user.userid} />
      </div>
    </>
  );
}

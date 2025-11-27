/**
 * Operations/Operative Procedures Page
 * - List and manage surgical operations
 * - Book new operations
 * - Accessible to doctors and administrators
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import OperationsList from "./operations-list";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
      {/* <Header /> */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Operations </h1>
        </div>
        <div className="flex items-center justify-between">
  {/* existing title / actions */}
  <Link href={`/d/${workspaceid}/doctor`}>
    <Button
      variant="outline"
      size="icon"
      aria-label="Back to Doctor Dashboard"
      className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
    >
      <Home className="h-4 w-4" />
    </Button>
  </Link>
</div>
        <OperationsList workspaceid={workspaceid} userId={user.userid} />
      </div>
    </>
  );
}

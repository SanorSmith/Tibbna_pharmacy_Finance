/**
 * Finance Module — Server Page
 * Accessible to administrators and finance roles.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import FinanceDashboard from "./finance-dashboard";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function FinancePage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid
  );

  if (
    !membership ||
    (membership.role !== "administrator" &&
      membership.role !== "pharmacist")
  ) {
    redirect(`/d/${workspaceid}`);
  }

  return (
    <FinanceDashboard
      workspaceid={workspaceid}
      userName={user.name || user.email || "User"}
      userId={user.userid}
    />
  );
}

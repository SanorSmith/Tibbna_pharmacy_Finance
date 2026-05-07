/**
 * POS Returns Process — Server Page
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import ProcessReturnClientPage from "./process-return-page";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function ProcessReturnServerPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid
  );

  if (
    !membership ||
    (membership.role !== "pharmacist" && membership.role !== "administrator")
  ) {
    redirect(`/d/${workspaceid}`);
  }

  return (
    <ProcessReturnClientPage
      workspaceid={workspaceid}
      userName={user.name || user.email || "User"}
      userId={user.userid}
    />
  );
}

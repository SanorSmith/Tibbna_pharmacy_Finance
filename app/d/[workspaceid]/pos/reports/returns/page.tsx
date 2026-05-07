import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import ReturnsReportPage from "./returns-report-page";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function ReturnsReportServerPage({ params }: PageProps) {
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

  return <ReturnsReportPage workspaceid={workspaceid} />;
}

/**
 * Lab Technician Dashboard Page
 * - Main dashboard for lab technicians
 * - Shows tabs for Orders, Work-list, Validation, Sample store, etc.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import LabTechDashboard from "./lab-tech-dashboard";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LabTechPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  
  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership) redirect("/d/empty");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden px-4 pb-2">
      <LabTechDashboard workspaceid={workspaceid} />
    </div>
  );
}

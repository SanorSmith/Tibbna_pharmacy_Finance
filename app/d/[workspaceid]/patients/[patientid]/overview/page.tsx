/**
 * Patient Overview Page
 * - Comprehensive view of patient information
 * - Shows chronic diseases, visit history, lab results, pharmacy notes, doctor notes
 * - Displays patient status and notifications
 */
import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { Header } from "@/components/sidebar/header";
import PatientOverviewContent from "./patient-overview-content";

interface PageProps {
  params: Promise<{ workspaceid: string; patientid: string }>;
}

export default async function PatientOverviewPage({ params }: PageProps) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();
  if (!user) redirect("/d");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  // Allow doctors, nurses, and administrators to view patient overview
  const allowed = role === "doctor" || role === "nurse" || role === "administrator";
  if (!allowed) redirect(`/d/${workspaceid}`);

  return (
    <>
      <Header userRole={role} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <PatientOverviewContent 
          workspaceid={workspaceid} 
          patientid={patientid}
        />
      </div>
    </>
  );
}

/**
 * Page: /d/[workspaceid]/schedule
 * - Doctor's schedule view (day) with side panel for In Progress and Checked In.
 * - Access: workspace role doctor or administrator.
 * - Awaits dynamic params (Promise) per project convention and renders client view.
 */
import { Header } from "@/components/sidebar/header";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import ScheduleView from "./schedule-view";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) redirect("/d");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  const allowed = role === "doctor" || role === "administrator";
  if (!allowed) redirect(`/d/${workspaceid}`);

  return (
    <>
      <Header userRole={role} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Appointments</h1>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <ScheduleView workspaceid={workspaceid} userRole={role} />
        </div>
      </div>
    </>
  );
}

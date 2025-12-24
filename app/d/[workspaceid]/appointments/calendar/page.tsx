/**
 * Page: Appointments Calendar View
 * - Display appointments in a monthly calendar format
 * - Route: /d/[workspaceid]/appointments/calendar
 */
//import { Header } from "@/components/sidebar/header";
import CalendarView from "./calendar-view";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function AppointmentsCalendarPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const userRole = membership?.role;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Appointments Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View appointments in a monthly calendar format
            </p>
          </div>
        </div>
        <div className="bg-background rounded-xl border p-4">
          <CalendarView workspaceid={workspaceid} userRole={userRole} />
        </div>
      </div>
    </>
  );
}

/**
 * Page: All Appointments List
 * - Display all appointments for a workspace in a table format
 * - Route: /d/[workspaceid]/appointments
 */
import { Header } from "@/components/sidebar/header";
import AppointmentsList from "./appointments-list";
import { Home } from "lucide-react";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function AppointmentsPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const userRole = membership?.role;

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">All Appointments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all appointments in the workspace
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Doctor Dashboard"
            className="bg-icon-color border-blue-400 text-white hover:bg-icon-color hover:border-blue-900"
            onClick={() => (window.location.href = `/d/${workspaceid}/doctor`)}
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-background rounded-xl border">
          <AppointmentsList workspaceid={workspaceid} userRole={userRole} />
        </div>
      </div>
    </>
  );
}

/**
 * Page: All Appointments List
 * - Display all appointments for a workspace in a table format
 * - Route: /d/[workspaceid]/appointments
 */
import { Header } from "@/components/sidebar/header";
import AppointmentsList from "./appointments-list";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function AppointmentsPage({ params }: PageProps) {
  const { workspaceid } = await params;

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
        </div>
        <div className="bg-background rounded-xl border">
          <AppointmentsList workspaceid={workspaceid} />
        </div>
      </div>
    </>
  );
}

/**
 * Page: Appointments Calendar View
 * - Display appointments in a monthly calendar format
 * - Route: /d/[workspaceid]/appointments/calendar
 */
import { Header } from "@/components/sidebar/header";
import CalendarView from "./calendar-view";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function AppointmentsCalendarPage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <>
      <Header />
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
          <CalendarView workspaceid={workspaceid} />
        </div>
      </div>
    </>
  );
}

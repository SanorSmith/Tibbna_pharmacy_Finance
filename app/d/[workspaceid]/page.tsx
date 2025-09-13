import { Header } from "@/components/sidebar/header";

interface CompanyDashboardProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function Dashboard({ params }: CompanyDashboardProps) {
  const { workspaceid } = await params;
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div
          className="grid auto-rows-min gap-4 md:grid-cols-3"
          title={workspaceid}
        >
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    </>
  );
}

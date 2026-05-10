import { getUser } from "@/lib/user";
import NotificationsList from "./notifications-list";

type Props = {
  params: Promise<{ workspaceid: string }>;
};

export default async function DoctorNotificationsPage({ params }: Props) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }
  return (
    <div className="container mx-auto py-6">
      <NotificationsList workspaceid={workspaceid} />
    </div>
  );
}

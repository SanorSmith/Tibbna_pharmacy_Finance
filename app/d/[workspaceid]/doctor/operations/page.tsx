/**
 * Doctor Operations Page
 * - Shows operations for the current doctor
 * - Table view with details popup
 * - Filter by status and date
 */
import { getUser } from "@/lib/user";
import OperationsList from "./operations-list";

type Props = {
  params: Promise<{ workspaceid: string }>;
};

export default async function DoctorOperationsPage({ params }: Props) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }
  return (
    <div className="container mx-auto py-6">
      <OperationsList workspaceid={workspaceid} userid={user.userid} />
    </div>
  );
}

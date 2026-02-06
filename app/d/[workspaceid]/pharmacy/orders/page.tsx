/**
 * Pharmacy Orders List — Server Page
 * Only accessible to users with the "pharmacist" role.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import PharmacyOrdersPage from "./orders-list";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function PharmacyOrdersServerPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);

  if (!membership || (membership.role !== "pharmacist" && membership.role !== "administrator")) {
    redirect(`/d/${workspaceid}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <PharmacyOrdersPage workspaceid={workspaceid} />
    </div>
  );
}

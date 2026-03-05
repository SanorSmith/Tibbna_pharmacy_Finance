/**
 * Pharmacy Dispense / Scanning — Server Page
 * Only accessible to users with the "pharmacist" role.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import PharmacyDispensePage from "./dispense-page";

interface PageProps {
  params: Promise<{ workspaceid: string; orderid: string }>;
}

export default async function PharmacyDispenseServerPage({ params }: PageProps) {
  const { workspaceid, orderid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);

  if (!membership || (membership.role !== "pharmacist" && membership.role !== "administrator")) {
    redirect(`/d/${workspaceid}`);
  }

  return <PharmacyDispensePage workspaceid={workspaceid} orderid={orderid} />;
}

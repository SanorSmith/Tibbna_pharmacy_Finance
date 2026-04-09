import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

interface EHRLandingProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function EHRLanding({ params }: EHRLandingProps) {
  const { workspaceid } = await params;
  
  // Verify user has access
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid
  );

  if (!membership) {
    redirect("/d/empty");
  }

  // Redirect based on role
  const userRole = membership.role?.toLowerCase();
  
  if (userRole === "doctor") {
    redirect(`/d/${workspaceid}/ehr/doctor`);
  } else if (userRole === "nurse") {
    redirect(`/d/${workspaceid}/ehr/patients`);
  } else {
    // Default to patients list for other roles
    redirect(`/d/${workspaceid}/ehr/patients`);
  }
}

import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

interface LIMSLandingProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LIMSLanding({ params }: LIMSLandingProps) {
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
  
  if (userRole === "lab_technician") {
    redirect(`/d/${workspaceid}/lims/lab-tech`);
  } else if (userRole === "admin" || userRole === "administrator") {
    redirect(`/d/${workspaceid}/lims/management`);
  } else {
    // Default to dashboard for other roles
    redirect(`/d/${workspaceid}/lims/dashboard`);
  }
}

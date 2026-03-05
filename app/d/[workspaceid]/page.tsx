import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

interface CompanyDashboardProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function Dashboard({ params }: CompanyDashboardProps) {
  const { workspaceid } = await params;
  
  // Get user and their role in this workspace
  const user = await getUser();
  
  if (!user) {
    redirect("/");
  }

  // Get user's workspaces to find their role
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid
  );

  if (!membership) {
    redirect("/d/empty");
  }

  // Role-based routing
  const userRole = membership.role?.toLowerCase();

  switch (userRole) {
    case "doctor":
      redirect(`/d/${workspaceid}/doctor`);
      break;
    case "nurse":
      redirect(`/d/${workspaceid}/nurse`);
      break;
    case "admin":
    case "administrator":
      // Admins go to the admin dashboard
      redirect(`/d/${workspaceid}/dashboard`);
      break;
    case "receptionist":
      redirect(`/d/${workspaceid}/reception`);
      break;
    case "pharmacist":
      redirect(`/d/${workspaceid}/pharmacy/dashboard`);
      break;
    case "lab_technician":
      redirect(`/d/${workspaceid}/lab-tech`);
      break;
    default:
      // Default dashboard for unknown roles
      redirect(`/d/${workspaceid}/dashboard`);
  }
}

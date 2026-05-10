import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const workspaces = await getUserWorkspaces(user.userid);

  // If user has no workspaces, redirect to new workspace creation
  if (!workspaces || workspaces.length === 0) {
    if (user.permissions?.includes("admin")) {
      redirect("/d/admin");
    } else {
      redirect("/d/empty");
    }
  }

  // If user has workspaces, redirect to the first workspace's dashboard
  const firstWorkspace = workspaces[0];
  redirect(`/d/${firstWorkspace.workspace.workspaceid}`);
}

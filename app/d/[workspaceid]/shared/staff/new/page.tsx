import { Header } from "@/components/sidebar/header";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import StaffForm from "./staff-form";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function NewStaffPage({ params }: PageProps) {
  const user = await getUser();
  if (!user) redirect("/");
  const { workspaceid } = await params;
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  if (!membership) redirect("/d/empty");
  const isWorkspaceAdmin = membership.role === "administrator";
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isWorkspaceAdmin && !isGlobalAdmin) redirect(`/d/${workspaceid}`);

  return (
    <>
      <Header userRole={membership.role} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Register Staff</h1>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <Suspense>
            <StaffForm workspaceid={workspaceid} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

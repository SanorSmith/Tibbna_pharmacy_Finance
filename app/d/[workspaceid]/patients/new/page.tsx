/**
 * Page: /d/[workspaceid]/patients/new
 * - Server component that renders the patient registration page.
 * - Awaits dynamic params (Promise) per project convention.
 * - Access control: workspace administrators, global admins, and doctors can access; others are redirected.
 * - Renders the client-side PatientForm which posts to /api/d/[workspaceid]/patients.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import PatientForm from "./patient-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function NewPatientPage({ params }: PageProps) {
  const user = await getUser();
  if (!user) redirect("/");
  const { workspaceid } = await params;
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  if (!membership) redirect("/d/empty");
  const isWorkspaceAdmin = membership.role === "administrator";
  const isDoctor = membership.role === "doctor";
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
  if (!isWorkspaceAdmin && !isGlobalAdmin && !isDoctor) redirect(`/d/${workspaceid}/patients`);

  return (
  <>
    <div className="flex items-center justify-start mt-4 p-4 pb-0">
      {/* Home Button */}
      <Link href={`/d/${workspaceid}/doctor`}>
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to Doctor Dashboard"
          className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
        >
          <Home className="h-4 w-4" />
        </Button>
      </Link>

      {/* Title on the right */}
      <h1 className="text-xl ml-4 font-semibold">Register Patient</h1>
    </div>

    <div className="p-4 pt-0 mt-4">
      <div className="bg-muted/50 rounded-xl p-4">
        <Suspense>
          <PatientForm workspaceid={workspaceid} />
        </Suspense>
      </div>
    </div>
  </>
);

}

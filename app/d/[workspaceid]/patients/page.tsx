/**
 * Page: /d/[workspaceid]/patients
 * - Server component that renders the Patients list page.
 * - Awaits dynamic params (Promise) per project convention.
 * - Determines admin visibility (workspace admin or global admin) to show the "Register Patient" link.
 * - Delegates data fetching/rendering to a client component (PatientsList).
 */
import { Header } from "@/components/sidebar/header";
import Link from "next/link";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import PatientsList from "./patients-list";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function PatientsPage({ params }: PageProps) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  const user = await getUser();
  let isAdmin = false;
  if (user) {
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
    // Admin if role is workspace administrator...
    const isWorkspaceAdmin = membership?.role === "administrator";
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
    // ...or has global "admin" permission
    const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
    isAdmin = isWorkspaceAdmin || isGlobalAdmin;
  }

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Patients</h1>
          {/* Show create link only to admins */}
          {isAdmin && (
            <Link className="text-sm text-primary underline" href={`/d/${workspaceid}/patients/new`}>
              Register Patient
            </Link>
          )}
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          {/* Fetch and render list client-side to avoid server relative-URL issues */}
          <PatientsList workspaceid={workspaceid} />
        </div>
      </div>
    </>
  );
}

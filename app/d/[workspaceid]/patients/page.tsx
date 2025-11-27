/**
 * Page: /d/[workspaceid]/patients
 * - Server component that renders the Patients list page.
 * - Awaits dynamic params (Promise) per project convention.
 * - Determines admin visibility (workspace admin or global admin) to show the "Register Patient" link.
 * - Delegates data fetching/rendering to a client component (PatientsList).
 */
import Link from "next/link";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import PatientsList from "./patients-list";
import { Button } from "@/components/ui/button";
import { Plus, Home } from "lucide-react";
interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function PatientsPage({ params }: PageProps) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  const user = await getUser();
  let isAdmin = false;
  let userRole: "doctor" | "nurse" | "receptionist" | "administrator" = "receptionist";
  
  if (user) {
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
    
    if (membership) {
      userRole = membership.role;
    }
    
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          {/* Show register button only to admins */}
          {isAdmin && (
            <Link href={`/d/${workspaceid}/patients/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Register Patient
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center">
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
           <h1 className="text-lg ml-2 font-semibold">Patients</h1>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          {/* Fetch and render list client-side to avoid server relative-URL issues */}
          <PatientsList workspaceid={workspaceid} userRole={userRole} />
        </div>
      </div>
    </>
  );
}

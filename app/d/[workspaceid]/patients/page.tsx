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
  let userRole: "doctor" | "nurse" | "lab_technician" | "pharmacist" | "receptionist" | "administrator" =
    "receptionist";

  if (user) {
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

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
          const dequoted =
            trimmed.startsWith("'") && trimmed.endsWith("'")
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
      <div className="container mx-auto py-6">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            {/* Left side: Home button + Patients text */}
            <div className="flex items-center gap-4">
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
              <div>
                <h1 className="text-2xl font-bold">Patients</h1>
              </div>
            </div>
            {/* Right side: Register button */}
            {(isAdmin || userRole === "doctor") && (
              <Link href={`/d/${workspaceid}/patients/new`}>
                <Button className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Patient
                </Button>
              </Link>
            )}
          </div>
        </div>
       <p className="pl-4 mx-auto text-sm text-muted-foreground mt-1">
                  View and manage patient records
                </p>

        {/* Fetch and render list client-side to avoid server relative-URL issues */}
        {isAdmin && (
          <PatientsList workspaceid={workspaceid} userRole={userRole} />
        )}
      </div>
    </>
  );
}

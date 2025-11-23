/**
 * Page: /d/[workspaceid]/patients/[patientid]
 * - Patient dashboard showing comprehensive patient information
 * - Accessible to doctors and nurses only (not administrators)
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PatientDashboard from "./patient-dashboard";

interface PageProps {
  params: Promise<{ workspaceid: string; patientid: string }>;
}

export default async function PatientPage({ params }: PageProps) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect("/");
  }

  // Check if user has access to this workspace
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership) {
    redirect(`/d/${workspaceid}`);
  }

  // Only doctors and nurses can view patient details
  if (membership.role !== "doctor" && membership.role !== "nurse") {
    redirect(`/d/${workspaceid}/patients`);
  }

  // Fetch patient data
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.patientid, patientid))
    .limit(1);

  if (!patient) {
    redirect(`/d/${workspaceid}/patients`);
  }

  return (
    <>
      {/* <Header /> */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 m-8">
        <PatientDashboard 
          workspaceid={workspaceid} 
          patient={patient}
        />
      </div>
    </>
  );
}

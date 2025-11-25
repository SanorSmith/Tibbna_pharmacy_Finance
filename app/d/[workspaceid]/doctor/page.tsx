/**
 * Page: /d/[workspaceid]/doctor
 * - Doctor dashboard showing appointments, patients, and operations
 * - Accessible only to users with doctor role
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import DoctorDashboard from "./doctor-dashboard";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function DoctorPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();
  
  if (!user) {
    redirect("/");
  }

  // Check if user is a doctor in this workspace
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);
  
  if (!membership || membership.role !== "doctor") {
    redirect(`/d/${workspaceid}`);
  }

  // Fetch doctor's staff information if available
  let staffInfo = null;
  try {
    const staffRecords = await db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.workspaceid, workspaceid),
          eq(staff.role, "doctor")
        )
      );
    
    // Try to match by email or name
    staffInfo = staffRecords.find(
      (s) =>
        s.email === user.email ||
        (user.name && `${s.firstname} ${s.lastname}`.toLowerCase().includes(user.name.toLowerCase()))
    );
  } catch (e) {
    console.error("Failed to fetch staff info:", e);
  }

  const doctorInfo = {
    name: user.name || user.email || "Doctor",
    email: user.email || "",
    staffInfo: staffInfo
      ? {
          unit: staffInfo.unit,
          specialty: staffInfo.specialty,
        }
      : undefined,
  };

  return (
    <>
    {/*  <Header /> */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold"></h1>
        </div>
        <DoctorDashboard
          workspaceid={workspaceid}
          doctorid={user.userid}
          doctorInfo={doctorInfo}
        />
      </div>
    </>
  );
}

import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import AppointmentsList from "./appointments-list";

export default async function DoctorAppointmentsPage({
  params,
}: {
  params: Promise<{ workspaceid: string }>;
}) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  // Verify workspace membership and doctor role
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);

  if (!membership || membership.role !== "doctor") {
    redirect(`/d/${workspaceid}`);
  }

  // Get doctor's staff record
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
    staffRecords.find(
      (s) =>
        s.email === user.email ||
        (user.name && `${s.firstname} ${s.lastname}`.toLowerCase().includes(user.name.toLowerCase()))
    );
  } catch (e) {
    console.error("Failed to fetch staff info:", e);
  }

  // Note: appointments.doctorid references users.userid, not staff.staffid
  return (
    <div className="container mx-auto py-6">
      <AppointmentsList 
        workspaceid={workspaceid} 
        doctorid={user.userid}
      />
    </div>
  );
}

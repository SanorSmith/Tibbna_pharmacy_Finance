import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { seedDepartments } from "@/lib/db/seed-departments";

/**
 * POST /api/d/[workspaceid]/departments/seed
 * Seeds default departments for a workspace
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

    // Check workspace access and ensure user is admin
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow workspace owners/admins to seed departments
    // For now, allow any authenticated workspace member to seed
    // You can add role checking here if needed

    const seededDepartments = await seedDepartments(workspaceid);

    return NextResponse.json(
      {
        success: true,
        message: `Seeded ${seededDepartments.length} departments`,
        departments: seededDepartments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error seeding departments:", error);
    return NextResponse.json(
      { error: "Failed to seed departments" },
      { status: 500 }
    );
  }
}

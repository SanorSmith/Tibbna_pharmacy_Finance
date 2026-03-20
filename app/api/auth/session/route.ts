import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user workspaces
    const workspaces = await getUserWorkspaces(user.userid);
    
    // Return user with workspace information
    return NextResponse.json({
      userid: user.userid,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaces: workspaces
    });

  } catch (error) {
    console.error("Error fetching user session:", error);
    return NextResponse.json(
      { error: "Failed to fetch user session" },
      { status: 500 }
    );
  }
}

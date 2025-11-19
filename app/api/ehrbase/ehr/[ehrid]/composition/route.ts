import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { getOpenEHRCompositions } from "@/lib/openehr/openehr";

interface RouteParams {
  params: Promise<{
    ehrid: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ehrid } = await params;

    return NextResponse.json(await getOpenEHRCompositions(ehrid));
  } catch (error) {
    console.error("Error fetching compositions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ehrid } = await params;

    return NextResponse.json(
      { message: `Coming soon: Create composition for EHR ${ehrid}` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

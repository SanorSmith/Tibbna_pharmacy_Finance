import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { getOpenEHRComposition } from "@/lib/openehr/openehr";

interface RouteParams {
  params: Promise<{
    ehrid: string;
    compositionid: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ehrid, compositionid } = await params;

    return NextResponse.json(await getOpenEHRComposition(ehrid, compositionid));
  } catch (error) {
    console.error("Error fetching composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ehrid, compositionid } = await params;

    return NextResponse.json(
      {
        message: `Coming soon: Update composition ${compositionid} for EHR ${ehrid}`,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error updating composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ehrid, compositionid } = await params;

    return NextResponse.json(
      {
        message: `Coming soon: Delete composition ${compositionid} for EHR ${ehrid}`,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error deleting composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

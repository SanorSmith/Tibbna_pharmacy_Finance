import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { updateOpenEHREHR } from "@/lib/openehr/openehr";

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

    return NextResponse.json(
      { message: `Coming soon: Get EHR ${ehrid}` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error fetching EHR:", error);
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

    const { ehrid } = await params;
    const body = await request.json();
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    const updatedEhrId = await updateOpenEHREHR(ehrid, subjectId);

    return NextResponse.json({ ehr_id: updatedEhrId });
  } catch (error) {
    console.error("Error updating EHR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

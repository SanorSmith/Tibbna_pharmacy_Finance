import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { getUser } from "@/lib/user";
import {
  getOpenEHREHRs,
  createOpenEHREHR,
  updateOpenEHREHR,
} from "@/lib/openehr/openehr";

export async function GET() {
  try {
    // Allow authenticated users (doctors, nurses, admins) to view EHRs
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getOpenEHREHRs());
  } catch (error) {
    console.error("Error fetching OpenEHR EHRs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    const ehrId = await createOpenEHREHR(subjectId);

    return NextResponse.json({ ehr_id: ehrId }, { status: 201 });
  } catch (error) {
    console.error("Error creating OpenEHR EHR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ehrId, subjectId } = body;

    if (!ehrId || !subjectId) {
      return NextResponse.json(
        { error: "ehrId and subjectId are required" },
        { status: 400 }
      );
    }

    const updatedEhrId = await updateOpenEHREHR(ehrId, subjectId);

    return NextResponse.json({ ehr_id: updatedEhrId }, { status: 200 });
  } catch (error) {
    console.error("Error updating OpenEHR EHR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

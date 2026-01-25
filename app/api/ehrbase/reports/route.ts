import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import {
  listLaboratoryReports,
} from "@/lib/openehr/laboratory";

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ehrId = searchParams.get("ehrId");

    if (!ehrId) {
      return NextResponse.json(
        { error: "ehrId query parameter is required" },
        { status: 400 }
      );
    }

    const reports = await listLaboratoryReports(ehrId);

    return NextResponse.json({
      success: true,
      reports: reports,
    });
  } catch (error) {
    console.error("Error fetching laboratory report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

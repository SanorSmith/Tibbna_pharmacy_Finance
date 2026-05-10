import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import {
  buildLaboratoryReport,
  createLaboratoryReport,
  LaboratoryReportData,
  getLaboratoryReport,
} from "@/lib/openehr/laboratory";

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ehrId, composition } = body;

    if (!ehrId) {
      return NextResponse.json({ error: "ehrId is required" }, { status: 400 });
    }

    if (!composition) {
      return NextResponse.json(
        { error: "composition is required" },
        { status: 400 }
      );
    }

    const compObject = buildLaboratoryReport(composition as LaboratoryReportData);
    const compositionUid = await createLaboratoryReport(
      ehrId,
      compObject
    );

    return NextResponse.json(
      {
        success: true,
        compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating clinical encounter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ehrId = searchParams.get("ehrId");
    const compositionId = searchParams.get("compositionId");

    if (!ehrId) {
      return NextResponse.json(
        { error: "ehrId query parameter is required" },
        { status: 400 }
      );
    }

    if (!compositionId) {
      return NextResponse.json(
        { error: "compositionId query parameter is required" },
        { status: 400 }
      );
    }

    const report = await getLaboratoryReport(ehrId, compositionId);

    return NextResponse.json({
      success: true,
      report: report,
    });
  } catch (error) {
    console.error("Error fetching laboratory report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

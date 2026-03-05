import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { OpenEHRResultSubmissionService } from "@/lib/lims/openehr-result-submission";

/**
 * GET /api/lims/samples/[sampleid]/hl7-oru
 * 
 * Generate HL7 ORU^R01 message for external systems
 * Returns HL7 message string for integration with external lab systems
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Optional parameters for HL7 message
    const sendingApplication = searchParams.get("sendingApplication") || undefined;
    const sendingFacility = searchParams.get("sendingFacility") || undefined;
    const receivingApplication = searchParams.get("receivingApplication") || undefined;
    const receivingFacility = searchParams.get("receivingFacility") || undefined;

    // Generate HL7 ORU message
    const result = await OpenEHRResultSubmissionService.generateHL7ORUMessage({
      sampleid,
      sendingApplication,
      sendingFacility,
      receivingApplication,
      receivingFacility,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate HL7 message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      messageType: "ORU^R01",
    });
  } catch (error) {
    console.error("Error generating HL7 ORU message:", error);
    return NextResponse.json(
      { error: "Failed to generate HL7 message" },
      { status: 500 }
    );
  }
}

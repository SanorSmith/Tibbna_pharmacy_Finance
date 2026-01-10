import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    await db.execute(sql`DELETE FROM test_reference_ranges`);

    return NextResponse.json({
      success: true,
      message: "All test reference ranges cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing test reference ranges:", error);
    return NextResponse.json(
      { error: "Failed to clear test reference ranges", details: error },
      { status: 500 }
    );
  }
}

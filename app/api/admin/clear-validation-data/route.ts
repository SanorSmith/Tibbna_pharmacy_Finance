import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validationStates, testResults } from "@/lib/db/schema";

export async function POST() {
  try {
    // Delete all test results
    const deletedResults = await db.delete(testResults);
    
    // Delete all validation states
    const deletedStates = await db.delete(validationStates);
    
    return NextResponse.json({
      success: true,
      message: "All validation data cleared successfully",
      deletedResults: "All test results deleted",
      deletedStates: "All validation states deleted",
    });
  } catch (error) {
    console.error("Clear validation data error:", error);
    return NextResponse.json(
      { error: "Failed to clear validation data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { samples, validationStates, testResults } from "@/lib/db/schema";

export async function POST() {
  try {
    // Delete all test results first (foreign key constraint)
    await db.delete(testResults);
    
    // Delete all validation states
    await db.delete(validationStates);
    
    // Delete all samples
    await db.delete(samples);
    
    return NextResponse.json({
      success: true,
      message: "All samples, validation states, and test results cleared successfully",
    });
  } catch (error) {
    console.error("Clear all samples error:", error);
    return NextResponse.json(
      { error: "Failed to clear samples", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

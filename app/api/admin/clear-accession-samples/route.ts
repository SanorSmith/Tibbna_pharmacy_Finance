import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessionSamples, sampleStatusHistory, sampleAccessionAuditLog } from "@/lib/db/schema";

export async function POST() {
  try {
    // Delete in order of foreign key dependencies
    // 1. Delete sample status history
    await db.delete(sampleStatusHistory);
    
    // 2. Delete sample accession audit log
    await db.delete(sampleAccessionAuditLog);
    
    // 3. Delete all accessioned samples
    await db.delete(accessionSamples);
    
    return NextResponse.json({
      success: true,
      message: "All accessioned samples and related data cleared successfully",
    });
  } catch (error) {
    console.error("Clear accession samples error:", error);
    return NextResponse.json(
      { error: "Failed to clear accession samples", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { seedValidationData } from "@/lib/db/seed-validation-data";

/**
 * POST /api/lims/seed
 * Seed the database with sample validation data for testing
 * 
 * This endpoint should only be used in development/testing environments
 * In production, remove or protect this endpoint
 */
export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run seed function
    await seedValidationData();

    return NextResponse.json({
      success: true,
      message: "Validation data seeded successfully",
    });
  } catch (error) {
    console.error("[API] Error seeding validation data:", error);
    return NextResponse.json(
      { 
        error: "Failed to seed validation data",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

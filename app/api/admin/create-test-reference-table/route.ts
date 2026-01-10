import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Create test_reference_ranges table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "test_reference_ranges" (
        "rangeid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspaceid" uuid NOT NULL,
        "testcode" varchar(50) NOT NULL,
        "testname" varchar(255) NOT NULL,
        "category" varchar(100) NOT NULL,
        "unit" varchar(100) NOT NULL,
        "agegroup" varchar(20) DEFAULT 'ALL' NOT NULL,
        "sex" varchar(10) DEFAULT 'ANY' NOT NULL,
        "referencemin" numeric(10, 4),
        "referencemax" numeric(10, 4),
        "referencetext" text,
        "paniclow" numeric(10, 4),
        "panichigh" numeric(10, 4),
        "panictext" text,
        "notes" text,
        "isactive" varchar(1) DEFAULT 'Y' NOT NULL,
        "createdby" uuid NOT NULL,
        "createdat" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedby" uuid,
        "updatedat" timestamp with time zone
      );
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "test_ref_ranges_workspace_idx" ON "test_reference_ranges" ("workspaceid");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "test_ref_ranges_testcode_idx" ON "test_reference_ranges" ("testcode");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "test_ref_ranges_category_idx" ON "test_reference_ranges" ("category");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "test_ref_ranges_agegroup_idx" ON "test_reference_ranges" ("agegroup");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "test_ref_ranges_active_idx" ON "test_reference_ranges" ("isactive");`);

    return NextResponse.json({
      success: true,
      message: "test_reference_ranges table created successfully",
    });
  } catch (error) {
    console.error("Error creating test_reference_ranges table:", error);
    return NextResponse.json(
      { error: "Failed to create table", details: error },
      { status: 500 }
    );
  }
}

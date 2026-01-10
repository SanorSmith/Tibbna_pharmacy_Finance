-- Create test_reference_ranges table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "test_ref_ranges_workspace_idx" ON "test_reference_ranges" ("workspaceid");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_testcode_idx" ON "test_reference_ranges" ("testcode");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_category_idx" ON "test_reference_ranges" ("category");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_agegroup_idx" ON "test_reference_ranges" ("agegroup");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_active_idx" ON "test_reference_ranges" ("isactive");

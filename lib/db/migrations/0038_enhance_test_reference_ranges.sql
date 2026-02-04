-- Enhance test_reference_ranges table with additional properties
ALTER TABLE "test_reference_ranges" ADD COLUMN "labtype" varchar(100);
ALTER TABLE "test_reference_ranges" ADD COLUMN "grouptests" varchar(255);
ALTER TABLE "test_reference_ranges" ADD COLUMN "sampletype" varchar(100);
ALTER TABLE "test_reference_ranges" ADD COLUMN "containertype" varchar(100);
ALTER TABLE "test_reference_ranges" ADD COLUMN "bodysite" varchar(100);
ALTER TABLE "test_reference_ranges" ADD COLUMN "clinicalindication" text;
ALTER TABLE "test_reference_ranges" ADD COLUMN "additionalinformation" text;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS "test_ref_ranges_labtype_idx" ON "test_reference_ranges" ("labtype");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_sampletype_idx" ON "test_reference_ranges" ("sampletype");
CREATE INDEX IF NOT EXISTS "test_ref_ranges_bodysite_idx" ON "test_reference_ranges" ("bodysite");

DROP INDEX IF EXISTS "test_ref_ranges_category_idx";--> statement-breakpoint
ALTER TABLE "lims_order_tests" ALTER COLUMN "testid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lims_order_tests" ADD COLUMN "testcode" text;--> statement-breakpoint
ALTER TABLE "lims_order_tests" ADD COLUMN "testname" text;--> statement-breakpoint
ALTER TABLE "test_reference_ranges" DROP COLUMN IF EXISTS "category";
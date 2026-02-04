-- Remove redundant category column (labtype serves the same purpose)
ALTER TABLE "test_reference_ranges" DROP COLUMN IF EXISTS "category";

-- Drop the category index if it exists
DROP INDEX IF EXISTS "test_ref_ranges_category_idx";

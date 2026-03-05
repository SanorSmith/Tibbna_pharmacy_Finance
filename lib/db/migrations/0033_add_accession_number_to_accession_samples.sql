-- Migration: Add accession number field to accession_samples
-- Stores a scanned/manual accession number and links it to the auto-generated sample ID

ALTER TABLE "accession_samples"
ADD COLUMN "accessionnumber" text;

CREATE UNIQUE INDEX IF NOT EXISTS "accession_samples_accessionnumber_unique" ON "accession_samples" ("accessionnumber")
WHERE "accessionnumber" IS NOT NULL;

COMMENT ON COLUMN "accession_samples"."accessionnumber" IS 'Accession number scanned/manually entered; unique when present';

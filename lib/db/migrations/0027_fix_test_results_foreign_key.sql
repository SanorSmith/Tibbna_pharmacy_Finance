-- Migration: Fix test_results foreign key to reference accession_samples
-- Drop the old foreign key constraint
ALTER TABLE "test_results" DROP CONSTRAINT IF EXISTS "test_results_sampleid_samples_sampleid_fk";

-- Add the new foreign key constraint to accession_samples
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_sampleid_accession_samples_sampleid_fk" 
  FOREIGN KEY ("sampleid") REFERENCES "accession_samples"("sampleid") ON DELETE CASCADE;

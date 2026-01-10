ALTER TABLE "validation_states" DROP CONSTRAINT "validation_states_sampleid_samples_sampleid_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

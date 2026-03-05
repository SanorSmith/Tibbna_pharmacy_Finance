ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_sampleid_samples_sampleid_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

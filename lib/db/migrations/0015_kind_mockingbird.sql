ALTER TABLE "accession_samples" ALTER COLUMN "accessionedby" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "accession_samples" ALTER COLUMN "correctedby" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sample_accession_audit_log" ALTER COLUMN "userid" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sample_status_history" ALTER COLUMN "changedby" SET DATA TYPE uuid;
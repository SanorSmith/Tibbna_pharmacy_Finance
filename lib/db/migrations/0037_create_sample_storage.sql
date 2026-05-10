-- Create sample_storage table for tracking finished samples in storage with retention periods
CREATE TABLE IF NOT EXISTS "sample_storage" (
	"storageid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"locationid" uuid NOT NULL,
	"storagedate" timestamp with time zone DEFAULT now() NOT NULL,
	"expirydate" timestamp with time zone NOT NULL,
	"retentiondays" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'stored' NOT NULL,
	"retrieveddate" timestamp with time zone,
	"retrievedby" uuid,
	"retrievalreason" text,
	"disposeddate" timestamp with time zone,
	"disposedby" uuid,
	"disposalmethod" text,
	"disposalnotes" text,
	"storagenotes" text,
	"storedby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	"workspaceid" text NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "sample_storage_workspace_idx" ON "sample_storage" ("workspaceid");
CREATE INDEX IF NOT EXISTS "sample_storage_sample_idx" ON "sample_storage" ("sampleid");
CREATE INDEX IF NOT EXISTS "sample_storage_location_idx" ON "sample_storage" ("locationid");
CREATE INDEX IF NOT EXISTS "sample_storage_status_idx" ON "sample_storage" ("status");
CREATE INDEX IF NOT EXISTS "sample_storage_expiry_idx" ON "sample_storage" ("expirydate");
CREATE INDEX IF NOT EXISTS "sample_storage_date_idx" ON "sample_storage" ("storagedate");

-- Add foreign key constraints
ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "accession_samples"("sampleid") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_locationid_storage_locations_locationid_fk" FOREIGN KEY ("locationid") REFERENCES "storage_locations"("locationid") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_storedby_users_userid_fk" FOREIGN KEY ("storedby") REFERENCES "users"("userid") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_retrievedby_users_userid_fk" FOREIGN KEY ("retrievedby") REFERENCES "users"("userid") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_disposedby_users_userid_fk" FOREIGN KEY ("disposedby") REFERENCES "users"("userid") ON DELETE no action ON UPDATE no action;

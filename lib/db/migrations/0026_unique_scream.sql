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
--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "labtype" varchar(100);--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "grouptests" varchar(255);--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "sampletype" varchar(100);--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "containertype" varchar(100);--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "bodysite" varchar(100);--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "clinicalindication" text;--> statement-breakpoint
ALTER TABLE "test_reference_ranges" ADD COLUMN "additionalinformation" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_locationid_storage_locations_locationid_fk" FOREIGN KEY ("locationid") REFERENCES "public"."storage_locations"("locationid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_retrievedby_users_userid_fk" FOREIGN KEY ("retrievedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_disposedby_users_userid_fk" FOREIGN KEY ("disposedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_storage" ADD CONSTRAINT "sample_storage_storedby_users_userid_fk" FOREIGN KEY ("storedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_workspace_idx" ON "sample_storage" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_sample_idx" ON "sample_storage" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_location_idx" ON "sample_storage" USING btree ("locationid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_status_idx" ON "sample_storage" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_expiry_idx" ON "sample_storage" USING btree ("expirydate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_storage_date_idx" ON "sample_storage" USING btree ("storagedate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_labtype_idx" ON "test_reference_ranges" USING btree ("labtype");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_sampletype_idx" ON "test_reference_ranges" USING btree ("sampletype");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_bodysite_idx" ON "test_reference_ranges" USING btree ("bodysite");
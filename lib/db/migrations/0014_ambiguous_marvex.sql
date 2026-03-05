CREATE TABLE IF NOT EXISTS "accession_samples" (
	"sampleid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"samplenumber" text NOT NULL,
	"sampletype" text NOT NULL,
	"containertype" text NOT NULL,
	"volume" numeric(10, 2),
	"volumeunit" text,
	"collectiondate" timestamp with time zone NOT NULL,
	"collectorid" text,
	"collectorname" text,
	"orderid" text NOT NULL,
	"patientid" text,
	"ehrid" text,
	"subjectidentifier" text,
	"barcode" text NOT NULL,
	"qrcode" text NOT NULL,
	"openehrcompositionuid" text,
	"currentstatus" text DEFAULT 'RECEIVED' NOT NULL,
	"currentlocation" text,
	"accessionedby" text NOT NULL,
	"accessionedat" timestamp with time zone DEFAULT now() NOT NULL,
	"workspaceid" text NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	"correctedat" timestamp with time zone,
	"correctedby" text,
	"correctionreason" text,
	CONSTRAINT "accession_samples_samplenumber_unique" UNIQUE("samplenumber"),
	CONSTRAINT "accession_samples_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sample_accession_audit_log" (
	"auditid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"action" text NOT NULL,
	"userid" text NOT NULL,
	"userrole" text,
	"previousdata" text,
	"newdata" text,
	"reason" text,
	"metadata" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"ipaddress" text,
	"sessionid" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sample_status_history" (
	"historyid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"previousstatus" text,
	"newstatus" text NOT NULL,
	"previouslocation" text,
	"newlocation" text,
	"changedby" text NOT NULL,
	"changedat" timestamp with time zone DEFAULT now() NOT NULL,
	"changereason" text,
	"metadata" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accession_samples" ADD CONSTRAINT "accession_samples_accessionedby_users_userid_fk" FOREIGN KEY ("accessionedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accession_samples" ADD CONSTRAINT "accession_samples_correctedby_users_userid_fk" FOREIGN KEY ("correctedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_accession_audit_log" ADD CONSTRAINT "sample_accession_audit_log_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_accession_audit_log" ADD CONSTRAINT "sample_accession_audit_log_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_status_history" ADD CONSTRAINT "sample_status_history_sampleid_accession_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_status_history" ADD CONSTRAINT "sample_status_history_changedby_users_userid_fk" FOREIGN KEY ("changedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accession_samples_workspace_idx" ON "accession_samples" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accession_samples_status_idx" ON "accession_samples" USING btree ("currentstatus");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accession_samples_order_idx" ON "accession_samples" USING btree ("orderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accession_samples_patient_idx" ON "accession_samples" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accession_samples_barcode_idx" ON "accession_samples" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_accession_audit_sample_idx" ON "sample_accession_audit_log" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_accession_audit_action_idx" ON "sample_accession_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_accession_audit_user_idx" ON "sample_accession_audit_log" USING btree ("userid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_accession_audit_timestamp_idx" ON "sample_accession_audit_log" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_status_history_sample_idx" ON "sample_status_history" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sample_status_history_status_idx" ON "sample_status_history" USING btree ("newstatus");
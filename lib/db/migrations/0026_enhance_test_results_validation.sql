-- Enhance test_results table with validation workflow fields
-- Add columns for multi-level validation, status tracking, and audit trail

-- Add new columns to test_results table
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "accessionsampleid" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "worklistid" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "resultnumeric" numeric(15, 4);
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "resulttext" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "resultcode" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "isabormal" boolean DEFAULT false NOT NULL;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "interpretation" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "enteredby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "entereddate" timestamp with time zone;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "entrymethod" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "instrumentid" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "technicalvalidatedby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "technicalvalidateddate" timestamp with time zone;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "technicalvalidationcomment" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "medicalvalidatedby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "medicalvalidateddate" timestamp with time zone;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "medicalvalidationcomment" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "releasedby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "releaseddate" timestamp with time zone;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "isqc" boolean DEFAULT false NOT NULL;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "qclevel" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "qcstatus" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "isrepeat" boolean DEFAULT false NOT NULL;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "repeatreason" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "originalresultid" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "comment" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "techniciannotes" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "alerts" text;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "createdby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "updatedby" uuid;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "workspaceid" text;

-- Update existing rows to have default workspaceid if null
UPDATE "test_results" SET "workspaceid" = 'default' WHERE "workspaceid" IS NULL;

-- Make workspaceid NOT NULL after setting defaults
ALTER TABLE "test_results" ALTER COLUMN "workspaceid" SET NOT NULL;

-- Create result_validation_history table
CREATE TABLE IF NOT EXISTS "result_validation_history" (
	"historyid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resultid" uuid NOT NULL,
	"action" text NOT NULL,
	"previousstatus" text,
	"newstatus" text NOT NULL,
	"previousvalue" text,
	"newvalue" text,
	"validatedby" uuid NOT NULL,
	"validateddate" timestamp with time zone DEFAULT now() NOT NULL,
	"validationlevel" text,
	"comment" text,
	"rejectionreason" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"workspaceid" text NOT NULL
);

-- Create indexes for test_results new columns
CREATE INDEX IF NOT EXISTS "test_results_accessionsampleid_idx" ON "test_results" ("accessionsampleid");
CREATE INDEX IF NOT EXISTS "test_results_worklistid_idx" ON "test_results" ("worklistid");
CREATE INDEX IF NOT EXISTS "test_results_testcode_idx" ON "test_results" ("testcode");
CREATE INDEX IF NOT EXISTS "test_results_status_idx" ON "test_results" ("status");
CREATE INDEX IF NOT EXISTS "test_results_workspaceid_idx" ON "test_results" ("workspaceid");
CREATE INDEX IF NOT EXISTS "test_results_entereddate_idx" ON "test_results" ("entereddate");

-- Create indexes for result_validation_history
CREATE INDEX IF NOT EXISTS "result_validation_history_resultid_idx" ON "result_validation_history" ("resultid");
CREATE INDEX IF NOT EXISTS "result_validation_history_validatedby_idx" ON "result_validation_history" ("validatedby");
CREATE INDEX IF NOT EXISTS "result_validation_history_validateddate_idx" ON "result_validation_history" ("validateddate");

-- Add foreign key constraints for test_results
DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_accessionsampleid_accession_samples_sampleid_fk" FOREIGN KEY ("accessionsampleid") REFERENCES "public"."accession_samples"("sampleid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_worklistid_worklists_worklistid_fk" FOREIGN KEY ("worklistid") REFERENCES "public"."worklists"("worklistid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_enteredby_users_userid_fk" FOREIGN KEY ("enteredby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_technicalvalidatedby_users_userid_fk" FOREIGN KEY ("technicalvalidatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_medicalvalidatedby_users_userid_fk" FOREIGN KEY ("medicalvalidatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_releasedby_users_userid_fk" FOREIGN KEY ("releasedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for result_validation_history
DO $$ BEGIN
 ALTER TABLE "result_validation_history" ADD CONSTRAINT "result_validation_history_resultid_test_results_resultid_fk" FOREIGN KEY ("resultid") REFERENCES "public"."test_results"("resultid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "result_validation_history" ADD CONSTRAINT "result_validation_history_validatedby_users_userid_fk" FOREIGN KEY ("validatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

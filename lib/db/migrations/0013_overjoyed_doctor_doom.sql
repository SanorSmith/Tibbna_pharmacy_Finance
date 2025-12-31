CREATE TABLE IF NOT EXISTS "audit_logs" (
	"auditid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"userid" uuid NOT NULL,
	"userrole" text NOT NULL,
	"action" text NOT NULL,
	"previousstate" text,
	"newstate" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ipaddress" text,
	"useragent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "samples" (
	"sampleid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientid" uuid NOT NULL,
	"workspaceid" text NOT NULL,
	"orderid" text NOT NULL,
	"sampletype" text NOT NULL,
	"collectiondate" timestamp with time zone NOT NULL,
	"receiveddate" timestamp with time zone NOT NULL,
	"analyzer" text,
	"testgroup" text NOT NULL,
	"priority" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'COLLECTED' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_results" (
	"resultid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"testcode" text NOT NULL,
	"testname" text NOT NULL,
	"resultvalue" text NOT NULL,
	"unit" text,
	"referencemin" numeric,
	"referencemax" numeric,
	"referencerange" text,
	"flag" text DEFAULT 'normal' NOT NULL,
	"iscritical" boolean DEFAULT false NOT NULL,
	"previousvalue" text,
	"previousdate" timestamp with time zone,
	"analyzerresult" text,
	"validationcomment" text,
	"markedforrerun" boolean DEFAULT false NOT NULL,
	"rerunreason" text,
	"analyzeddate" timestamp with time zone NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_states" (
	"stateid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampleid" uuid NOT NULL,
	"currentstate" text DEFAULT 'ANALYZED' NOT NULL,
	"previousstate" text,
	"validatedby" uuid,
	"validateddate" timestamp with time zone,
	"releasedby" uuid,
	"releaseddate" timestamp with time zone,
	"rejectedby" uuid,
	"rejecteddate" timestamp with time zone,
	"rejectionreason" text,
	"rerunrequestedby" uuid,
	"rerunrequesteddate" timestamp with time zone,
	"rerunreason" text,
	"notes" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validation_states_sampleid_unique" UNIQUE("sampleid")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_sampleid_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "samples" ADD CONSTRAINT "samples_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_sampleid_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_sampleid_samples_sampleid_fk" FOREIGN KEY ("sampleid") REFERENCES "public"."samples"("sampleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_validatedby_users_userid_fk" FOREIGN KEY ("validatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_releasedby_users_userid_fk" FOREIGN KEY ("releasedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_rejectedby_users_userid_fk" FOREIGN KEY ("rejectedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_states" ADD CONSTRAINT "validation_states_rerunrequestedby_users_userid_fk" FOREIGN KEY ("rerunrequestedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_sampleid_idx" ON "audit_logs" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_userid_idx" ON "audit_logs" USING btree ("userid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "samples_workspaceid_idx" ON "samples" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "samples_patientid_idx" ON "samples" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "samples_status_idx" ON "samples" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "samples_testgroup_idx" ON "samples" USING btree ("testgroup");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "samples_collectiondate_idx" ON "samples" USING btree ("collectiondate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_sampleid_idx" ON "test_results" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_flag_idx" ON "test_results" USING btree ("flag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_iscritical_idx" ON "test_results" USING btree ("iscritical");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_markedforrerun_idx" ON "test_results" USING btree ("markedforrerun");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "validation_states_sampleid_idx" ON "validation_states" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "validation_states_currentstate_idx" ON "validation_states" USING btree ("currentstate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "validation_states_validateddate_idx" ON "validation_states" USING btree ("validateddate");
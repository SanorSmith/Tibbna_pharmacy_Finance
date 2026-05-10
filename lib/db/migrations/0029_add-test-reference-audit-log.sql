CREATE TABLE IF NOT EXISTS "test_reference_audit_log" (
	"logid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rangeid" uuid NOT NULL,
	"workspaceid" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"userid" uuid NOT NULL,
	"username" varchar(255),
	"reason" text,
	"changes" jsonb,
	"snapshot" jsonb,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accession_samples" ALTER COLUMN "containertype" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "nationalcode" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "interaction" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "warning" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "pregnancy" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "sideeffect" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "storagetype" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "indication" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "traffic" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "insuranceapproved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_audit_rangeid_idx" ON "test_reference_audit_log" USING btree ("rangeid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_audit_workspace_idx" ON "test_reference_audit_log" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_audit_action_idx" ON "test_reference_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_audit_createdat_idx" ON "test_reference_audit_log" USING btree ("createdat");
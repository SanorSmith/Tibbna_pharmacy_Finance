CREATE TABLE IF NOT EXISTS "notifications" (
	"notificationid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"userid" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"relatedentityid" text,
	"relatedentitytype" text,
	"metadata" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_reference_ranges" (
	"rangeid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"testcode" varchar(50) NOT NULL,
	"testname" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(100) NOT NULL,
	"agegroup" varchar(20) DEFAULT 'ALL' NOT NULL,
	"sex" varchar(10) DEFAULT 'ANY' NOT NULL,
	"referencemin" numeric(10, 4),
	"referencemax" numeric(10, 4),
	"referencetext" text,
	"paniclow" numeric(10, 4),
	"panichigh" numeric(10, 4),
	"panictext" text,
	"notes" text,
	"isactive" varchar(1) DEFAULT 'Y' NOT NULL,
	"createdby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedby" uuid,
	"updatedat" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accession_samples" ALTER COLUMN "orderid" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "accession_samples" ALTER COLUMN "orderid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "worklist_items" ALTER COLUMN "orderid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accession_samples" ADD COLUMN "accessionnumber" text;--> statement-breakpoint
ALTER TABLE "accession_samples" ADD COLUMN "openehrrequestid" text;--> statement-breakpoint
ALTER TABLE "accession_samples" ADD COLUMN "tests" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_workspace_idx" ON "notifications" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("userid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_workspace_idx" ON "test_reference_ranges" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_testcode_idx" ON "test_reference_ranges" USING btree ("testcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_category_idx" ON "test_reference_ranges" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_agegroup_idx" ON "test_reference_ranges" USING btree ("agegroup");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ref_ranges_active_idx" ON "test_reference_ranges" USING btree ("isactive");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accession_samples" ADD CONSTRAINT "accession_samples_orderid_lims_orders_orderid_fk" FOREIGN KEY ("orderid") REFERENCES "public"."lims_orders"("orderid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

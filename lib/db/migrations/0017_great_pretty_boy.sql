CREATE TABLE IF NOT EXISTS "worklist_items" (
	"worklistitemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worklistid" uuid NOT NULL,
	"orderid" text NOT NULL,
	"sampleid" text,
	"testcode" text,
	"testname" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"position" text,
	"addedby" uuid NOT NULL,
	"addedbyname" text,
	"addedat" timestamp DEFAULT now() NOT NULL,
	"startedat" timestamp,
	"completedat" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "worklists" (
	"worklistid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worklistname" text NOT NULL,
	"worklisttype" text NOT NULL,
	"department" text,
	"analyzer" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assignedto" uuid,
	"assignedtoname" text,
	"description" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	"completedat" timestamp,
	"workspaceid" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "worklist_items" ADD CONSTRAINT "worklist_items_worklistid_worklists_worklistid_fk" FOREIGN KEY ("worklistid") REFERENCES "public"."worklists"("worklistid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "worklists" ADD CONSTRAINT "worklists_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklist_items_worklist_idx" ON "worklist_items" USING btree ("worklistid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklist_items_order_idx" ON "worklist_items" USING btree ("orderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklist_items_sample_idx" ON "worklist_items" USING btree ("sampleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklist_items_status_idx" ON "worklist_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklists_workspace_idx" ON "worklists" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklists_status_idx" ON "worklists" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklists_department_idx" ON "worklists" USING btree ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "worklists_assigned_idx" ON "worklists" USING btree ("assignedto");
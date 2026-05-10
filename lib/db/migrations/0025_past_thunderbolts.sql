CREATE TABLE IF NOT EXISTS "qc_runs" (
	"qcid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qctype" text NOT NULL,
	"equipmentid" uuid,
	"equipmentname" text,
	"qclevel" text,
	"lotnumber" text,
	"analyte" text,
	"resultvalue" numeric(15, 4),
	"unit" text,
	"expectedmin" numeric(15, 4),
	"expectedmax" numeric(15, 4),
	"pass" boolean DEFAULT true NOT NULL,
	"notes" text,
	"runat" timestamp with time zone DEFAULT now() NOT NULL,
	"performedby" uuid,
	"performedbyname" text,
	"workspaceid" text NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qc_runs" ADD CONSTRAINT "qc_runs_equipmentid_equipment_equipmentid_fk" FOREIGN KEY ("equipmentid") REFERENCES "public"."equipment"("equipmentid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qc_runs" ADD CONSTRAINT "qc_runs_performedby_users_userid_fk" FOREIGN KEY ("performedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_runs_workspace_idx" ON "qc_runs" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_runs_equipment_idx" ON "qc_runs" USING btree ("equipmentid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_runs_type_idx" ON "qc_runs" USING btree ("qctype");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_runs_runat_idx" ON "qc_runs" USING btree ("runat");
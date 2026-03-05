-- Create equipment table for laboratory equipment management
CREATE TABLE IF NOT EXISTS "equipment" (
	"equipmentid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"equipmentidcode" text NOT NULL,
	"serialnumber" text NOT NULL,
	"vendor" text NOT NULL,
	"vendoremail" text,
	"vendorphone" text,
	"lastservicedate" timestamp,
	"nextservicedate" timestamp,
	"serviceinterval" integer,
	"warrantyexpiry" timestamp,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"location" text,
	"calibrationdate" timestamp,
	"nextcalibrationdate" timestamp,
	"calibrationinterval" integer,
	"purchaseprice" numeric(10, 2),
	"currentvalue" numeric(10, 2),
	"notes" text,
	"manualurl" text,
	"specifications" text,
	"createdby" uuid NOT NULL,
	"createdat" text NOT NULL,
	"updatedby" uuid,
	"updatedat" text,
	"workspaceid" text NOT NULL,
	CONSTRAINT "equipment_equipmentidcode_unique" UNIQUE("equipmentidcode"),
	CONSTRAINT "equipment_serialnumber_unique" UNIQUE("serialnumber")
);

-- Create indexes for equipment table
CREATE INDEX IF NOT EXISTS "equipment_workspace_idx" ON "equipment" ("workspaceid");
CREATE INDEX IF NOT EXISTS "equipment_model_idx" ON "equipment" ("model");
CREATE INDEX IF NOT EXISTS "equipment_vendor_idx" ON "equipment" ("vendor");
CREATE INDEX IF NOT EXISTS "equipment_status_idx" ON "equipment" ("status");
CREATE INDEX IF NOT EXISTS "equipment_serial_number_idx" ON "equipment" ("serialnumber");
CREATE INDEX IF NOT EXISTS "equipment_id_code_idx" ON "equipment" ("equipmentidcode");

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "equipment" ADD CONSTRAINT "equipment_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "equipment" ADD CONSTRAINT "equipment_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

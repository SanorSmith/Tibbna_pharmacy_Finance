-- Create materials table for laboratory materials management
CREATE TABLE IF NOT EXISTS "materials" (
	"materialid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"lotnumber" text NOT NULL,
	"batchnumber" text,
	"manufacturedate" timestamp,
	"expirydate" timestamp,
	"supplierid" uuid,
	"suppliername" text NOT NULL,
	"suppliernumber" text,
	"size" text,
	"unit" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"minquantity" numeric(10, 2),
	"maxquantity" numeric(10, 2),
	"storage" text NOT NULL,
	"storagelocation" text,
	"storageconditions" text,
	"price" numeric(10, 2),
	"totalcost" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"category" text NOT NULL,
	"type" text NOT NULL,
	"hazardlevel" text,
	"casnumber" text,
	"qualitygrade" text,
	"certificatenumber" text,
	"testrequired" boolean DEFAULT false,
	"status" text DEFAULT 'active' NOT NULL,
	"isavailable" boolean DEFAULT true,
	"notes" text,
	"msdsurl" text,
	"specifications" text,
	"createdby" uuid NOT NULL,
	"createdat" text NOT NULL,
	"updatedby" uuid,
	"updatedat" text,
	"workspaceid" text NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code")
);

-- Create indexes for materials table
CREATE INDEX IF NOT EXISTS "materials_workspace_idx" ON "materials" ("workspaceid");
CREATE INDEX IF NOT EXISTS "materials_name_idx" ON "materials" ("name");
CREATE INDEX IF NOT EXISTS "materials_supplier_idx" ON "materials" ("supplierid");
CREATE INDEX IF NOT EXISTS "materials_category_idx" ON "materials" ("category");
CREATE INDEX IF NOT EXISTS "materials_lot_number_idx" ON "materials" ("lotnumber");
CREATE INDEX IF NOT EXISTS "materials_expiry_date_idx" ON "materials" ("expirydate");
CREATE INDEX IF NOT EXISTS "materials_status_idx" ON "materials" ("status");

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_supplierid_suppliers_supplierid_fk" FOREIGN KEY ("supplierid") REFERENCES "public"."suppliers"("supplierid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

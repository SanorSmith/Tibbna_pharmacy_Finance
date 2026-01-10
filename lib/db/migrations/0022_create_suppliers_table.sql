-- Create suppliers table for laboratory suppliers management
CREATE TABLE IF NOT EXISTS "suppliers" (
	"supplierid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"phonenumber" text,
	"phonenumber2" text,
	"email" text,
	"email2" text,
	"website" text,
	"addressline1" text,
	"addressline2" text,
	"city" text,
	"state" text,
	"postalcode" text,
	"country" text,
	"taxid" text,
	"licensenumber" text,
	"establishedyear" integer,
	"contactperson" text,
	"contacttitle" text,
	"contactphone" text,
	"contactemail" text,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"specialization" text,
	"rating" numeric(3, 2),
	"ispreferred" boolean DEFAULT false,
	"isactive" boolean DEFAULT true,
	"paymentterms" text,
	"creditlimit" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"supportphone" text,
	"supportemail" text,
	"technicalcontact" text,
	"notes" text,
	"contracturl" text,
	"catalogurl" text,
	"createdby" uuid NOT NULL,
	"createdat" text NOT NULL,
	"updatedby" uuid,
	"updatedat" text,
	"workspaceid" text NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);

-- Create indexes for suppliers table
CREATE INDEX IF NOT EXISTS "suppliers_workspace_idx" ON "suppliers" ("workspaceid");
CREATE INDEX IF NOT EXISTS "suppliers_name_idx" ON "suppliers" ("name");
CREATE INDEX IF NOT EXISTS "suppliers_category_idx" ON "suppliers" ("category");
CREATE INDEX IF NOT EXISTS "suppliers_email_idx" ON "suppliers" ("email");
CREATE INDEX IF NOT EXISTS "suppliers_is_active_idx" ON "suppliers" ("isactive");
CREATE INDEX IF NOT EXISTS "suppliers_is_preferred_idx" ON "suppliers" ("ispreferred");

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

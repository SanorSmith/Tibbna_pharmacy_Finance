-- Create laboratory_types table for laboratory types management
CREATE TABLE IF NOT EXISTS "laboratory_types" (
	"typeid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"specialization" text,
	"parenttypeid" uuid,
	"sortorder" integer DEFAULT 0,
	"isactive" boolean DEFAULT true,
	"createdby" uuid NOT NULL,
	"createdat" text NOT NULL,
	"updatedby" uuid,
	"updatedat" text,
	"workspaceid" text NOT NULL,
	CONSTRAINT "laboratory_types_code_unique" UNIQUE("code")
);

-- Create indexes for laboratory_types table
CREATE INDEX IF NOT EXISTS "laboratory_types_workspace_idx" ON "laboratory_types" ("workspaceid");
CREATE INDEX IF NOT EXISTS "laboratory_types_name_idx" ON "laboratory_types" ("name");
CREATE INDEX IF NOT EXISTS "laboratory_types_category_idx" ON "laboratory_types" ("category");
CREATE INDEX IF NOT EXISTS "laboratory_types_is_active_idx" ON "laboratory_types" ("isactive");

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "laboratory_types" ADD CONSTRAINT "laboratory_types_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "laboratory_types" ADD CONSTRAINT "laboratory_types_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "laboratory_types" ADD CONSTRAINT "laboratory_types_parenttypeid_laboratory_types_typeid_fk" FOREIGN KEY ("parenttypeid") REFERENCES "public"."laboratory_types"("typeid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

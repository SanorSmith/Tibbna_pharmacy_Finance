CREATE TABLE IF NOT EXISTS "pharmacies" (
	"pharmacyid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

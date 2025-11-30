CREATE TABLE IF NOT EXISTS "patients" (
	"patientid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"firstname" text NOT NULL,
	"middlename" text,
	"lastname" text NOT NULL,
	"nationalid" text,
	"dateofbirth" date,
	"phone" text,
	"email" text,
	"address" text,
	"medicalhistory" jsonb DEFAULT '{}',
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

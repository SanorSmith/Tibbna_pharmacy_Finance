DO $$ BEGIN
 CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"appointmentid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid NOT NULL,
	"doctorid" uuid NOT NULL,
	"starttime" timestamp with time zone NOT NULL,
	"endtime" timestamp with time zone NOT NULL,
	"location" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" jsonb DEFAULT '{}'::jsonb,
	"createdat" timestamp DEFAULT now(),
	"updatedat" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorid_users_userid_fk" FOREIGN KEY ("doctorid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

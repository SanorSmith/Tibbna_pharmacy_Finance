DO $$ BEGIN
 CREATE TYPE "public"."operation_status" AS ENUM('scheduled', 'in_preparation', 'in_progress', 'completed', 'cancelled', 'postponed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."operation_type" AS ENUM('emergency', 'elective', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operations" (
	"operationid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid NOT NULL,
	"surgeonid" uuid NOT NULL,
	"scheduleddate" timestamp with time zone NOT NULL,
	"estimatedduration" text,
	"operationtype" "operation_type" DEFAULT 'elective' NOT NULL,
	"status" "operation_status" DEFAULT 'scheduled' NOT NULL,
	"preoperativeassessment" text,
	"operationname" text NOT NULL,
	"operationdetails" text,
	"anesthesiatype" text,
	"theater" text,
	"operationdiagnosis" text,
	"actualstarttime" timestamp with time zone,
	"actualendtime" timestamp with time zone,
	"outcomes" text,
	"complications" text,
	"comment" text,
	"createdat" timestamp DEFAULT now(),
	"updatedat" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_surgeonid_users_userid_fk" FOREIGN KEY ("surgeonid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

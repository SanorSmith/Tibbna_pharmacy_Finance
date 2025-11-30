DO $$ BEGIN
 CREATE TYPE "public"."appointment_name" AS ENUM('new_patient', 're_visit', 'follow_up');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."appointment_type" AS ENUM('visiting', 'video_call', 'home_visit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointmentname" "appointment_name" DEFAULT 'new_patient' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointmenttype" "appointment_type" DEFAULT 'visiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "clinicalindication" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reasonforrequest" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "description" text;
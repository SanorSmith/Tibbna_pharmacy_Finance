ALTER TABLE "patients" ALTER COLUMN "medicalhistory" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "createdat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "updatedat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "ehrid" text;
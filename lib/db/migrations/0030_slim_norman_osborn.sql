CREATE TABLE IF NOT EXISTS "global_drugs" (
	"drugid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"genericname" text,
	"atccode" text,
	"form" text NOT NULL,
	"strength" text NOT NULL,
	"unit" text DEFAULT 'tablet' NOT NULL,
	"nationalcode" text,
	"category" text,
	"description" text,
	"interaction" text,
	"warning" text,
	"pregnancy" text,
	"sideeffect" text,
	"storagetype" text,
	"indication" text,
	"traffic" text,
	"requiresprescription" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_id" varchar(50),
	"service_name" varchar(255),
	"service_name_ar" text,
	"quantity" numeric(8, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"createdat" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"invoice_date" date NOT NULL,
	"patient_id" varchar(50),
	"patient_name" varchar(255),
	"patient_name_ar" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_percentage" numeric(5, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"insurance_company_id" varchar(50),
	"insurance_coverage_amount" numeric(12, 2) DEFAULT '0',
	"insurance_coverage_percentage" numeric(5, 2) DEFAULT '0',
	"patient_responsibility" numeric(12, 2) DEFAULT '0',
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"balance_due" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'PENDING',
	"payment_method" varchar(50),
	"payment_date" date,
	"notes" text,
	"createdat" timestamp DEFAULT now(),
	"updatedat" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "lab_test_catalog" DROP CONSTRAINT "lab_test_catalog_testcode_unique";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_workspaceid_workspaces_workspaceid_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userid_users_userid_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "lab_test_catalog_code_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_workspace_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_type_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_read_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_created_idx";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "title" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "priority" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "priority" SET DEFAULT 'NORMAL';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "priority" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "workspaceid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "organization_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_email" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "notification_type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "category" varchar(50) DEFAULT 'LEAVE';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_url" varchar(500);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_label" varchar(100);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "related_entity_type" varchar(50);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "related_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "send_email" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "send_sms" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "send_in_app" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_error" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "sms_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "sms_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "sms_error" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_read" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "globaldrugid" uuid;--> statement-breakpoint
ALTER TABLE "pharmacy_orders" ADD COLUMN "dispensecompositionuid" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_drugs_name_idx" ON "global_drugs" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_drugs_generic_name_idx" ON "global_drugs" USING btree ("genericname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_drugs_atc_idx" ON "global_drugs" USING btree ("atccode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_drugs_national_code_idx" ON "global_drugs" USING btree ("nationalcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_drugs_category_idx" ON "global_drugs" USING btree ("category");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drugs" ADD CONSTRAINT "drugs_globaldrugid_global_drugs_drugid_fk" FOREIGN KEY ("globaldrugid") REFERENCES "public"."global_drugs"("drugid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_org" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_recipient" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" USING btree ("notification_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "notifications" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_entity" ON "notifications" USING btree ("related_entity_type","related_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drugs_global_drug_idx" ON "drugs" USING btree ("globaldrugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_dispense_idx" ON "pharmacy_orders" USING btree ("dispensecompositionuid");--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "workspaceid";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "userid";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "relatedentityid";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "relatedentitytype";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "read";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "createdat";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "updatedat";--> statement-breakpoint
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_code_workspace_unique" UNIQUE("testcode","workspaceid");
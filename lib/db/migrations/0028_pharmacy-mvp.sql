CREATE TABLE IF NOT EXISTS "drug_batches" (
	"batchid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drugid" uuid NOT NULL,
	"lotnumber" text NOT NULL,
	"expirydate" date NOT NULL,
	"purchaseprice" numeric(12, 2),
	"sellingprice" numeric(12, 2),
	"barcode" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drugs" (
	"drugid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"name" text NOT NULL,
	"genericname" text,
	"atccode" text,
	"form" text NOT NULL,
	"strength" text NOT NULL,
	"unit" text DEFAULT 'tablet' NOT NULL,
	"barcode" text,
	"manufacturer" text,
	"requiresprescription" boolean DEFAULT true NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insurance_companies" (
	"insuranceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"phone" text,
	"email" text,
	"address" text,
	"coveragepercent" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_insurance" (
	"patientinsuranceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientid" uuid NOT NULL,
	"insuranceid" uuid NOT NULL,
	"policynumber" text NOT NULL,
	"groupnumber" text,
	"startdate" date,
	"enddate" date,
	"isprimary" boolean DEFAULT true NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_invoice_lines" (
	"lineid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceid" uuid NOT NULL,
	"drugid" uuid,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitprice" numeric(12, 2) NOT NULL,
	"linetotal" numeric(12, 2) NOT NULL,
	"insurancecovered" numeric(12, 2) DEFAULT '0' NOT NULL,
	"patientpays" numeric(12, 2) DEFAULT '0' NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_invoices" (
	"invoiceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderid" uuid NOT NULL,
	"patientid" uuid,
	"insuranceid" uuid,
	"invoicenumber" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"insurancecovered" numeric(12, 2) DEFAULT '0' NOT NULL,
	"patientcopay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_order_items" (
	"itemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderid" uuid NOT NULL,
	"drugid" uuid,
	"batchid" uuid,
	"drugname" text NOT NULL,
	"dosage" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitprice" numeric(12, 2),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"scannedbarcode" text,
	"scannedat" timestamp with time zone,
	"notes" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_orders" (
	"orderid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid,
	"prescriberid" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"openehrorderid" text,
	"priority" text DEFAULT 'routine' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"dispensedby" uuid,
	"dispensedat" timestamp with time zone,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_stock_levels" (
	"stocklevelid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drugid" uuid NOT NULL,
	"batchid" uuid,
	"locationid" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_stock_locations" (
	"locationid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'shelf' NOT NULL,
	"description" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_stock_movements" (
	"movementid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drugid" uuid NOT NULL,
	"batchid" uuid,
	"locationid" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"referenceid" text,
	"performedby" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_substitutions" (
	"substitutionid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderitemid" uuid NOT NULL,
	"originaldrugid" uuid,
	"newdrugid" uuid NOT NULL,
	"reason" text NOT NULL,
	"approvedby" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drugs" ADD CONSTRAINT "drugs_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_insuranceid_insurance_companies_insuranceid_fk" FOREIGN KEY ("insuranceid") REFERENCES "public"."insurance_companies"("insuranceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_invoice_lines" ADD CONSTRAINT "pharmacy_invoice_lines_invoiceid_pharmacy_invoices_invoiceid_fk" FOREIGN KEY ("invoiceid") REFERENCES "public"."pharmacy_invoices"("invoiceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_invoice_lines" ADD CONSTRAINT "pharmacy_invoice_lines_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_orderid_pharmacy_orders_orderid_fk" FOREIGN KEY ("orderid") REFERENCES "public"."pharmacy_orders"("orderid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_insuranceid_insurance_companies_insuranceid_fk" FOREIGN KEY ("insuranceid") REFERENCES "public"."insurance_companies"("insuranceid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_orderid_pharmacy_orders_orderid_fk" FOREIGN KEY ("orderid") REFERENCES "public"."pharmacy_orders"("orderid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_batchid_drug_batches_batchid_fk" FOREIGN KEY ("batchid") REFERENCES "public"."drug_batches"("batchid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_levels" ADD CONSTRAINT "pharmacy_stock_levels_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_levels" ADD CONSTRAINT "pharmacy_stock_levels_batchid_drug_batches_batchid_fk" FOREIGN KEY ("batchid") REFERENCES "public"."drug_batches"("batchid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_levels" ADD CONSTRAINT "pharmacy_stock_levels_locationid_pharmacy_stock_locations_locationid_fk" FOREIGN KEY ("locationid") REFERENCES "public"."pharmacy_stock_locations"("locationid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_locations" ADD CONSTRAINT "pharmacy_stock_locations_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_batchid_drug_batches_batchid_fk" FOREIGN KEY ("batchid") REFERENCES "public"."drug_batches"("batchid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_locationid_pharmacy_stock_locations_locationid_fk" FOREIGN KEY ("locationid") REFERENCES "public"."pharmacy_stock_locations"("locationid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_substitutions" ADD CONSTRAINT "pharmacy_substitutions_orderitemid_pharmacy_order_items_itemid_fk" FOREIGN KEY ("orderitemid") REFERENCES "public"."pharmacy_order_items"("itemid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_substitutions" ADD CONSTRAINT "pharmacy_substitutions_originaldrugid_drugs_drugid_fk" FOREIGN KEY ("originaldrugid") REFERENCES "public"."drugs"("drugid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_substitutions" ADD CONSTRAINT "pharmacy_substitutions_newdrugid_drugs_drugid_fk" FOREIGN KEY ("newdrugid") REFERENCES "public"."drugs"("drugid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_batches_drug_idx" ON "drug_batches" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_batches_expiry_idx" ON "drug_batches" USING btree ("expirydate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drugs_workspace_idx" ON "drugs" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drugs_barcode_idx" ON "drugs" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drugs_atc_idx" ON "drugs" USING btree ("atccode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insurance_companies_ws_idx" ON "insurance_companies" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_insurance_patient_idx" ON "patient_insurance" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_insurance_ins_idx" ON "patient_insurance" USING btree ("insuranceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_invoice_lines_inv_idx" ON "pharmacy_invoice_lines" USING btree ("invoiceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_invoices_order_idx" ON "pharmacy_invoices" USING btree ("orderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_invoices_patient_idx" ON "pharmacy_invoices" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_order_items_order_idx" ON "pharmacy_order_items" USING btree ("orderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_order_items_drug_idx" ON "pharmacy_order_items" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_ws_idx" ON "pharmacy_orders" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_patient_idx" ON "pharmacy_orders" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_status_idx" ON "pharmacy_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_orders_openehr_idx" ON "pharmacy_orders" USING btree ("openehrorderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_stock_levels_drug_idx" ON "pharmacy_stock_levels" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_stock_levels_loc_idx" ON "pharmacy_stock_levels" USING btree ("locationid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_stock_locations_ws_idx" ON "pharmacy_stock_locations" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_stock_movements_drug_idx" ON "pharmacy_stock_movements" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_stock_movements_type_idx" ON "pharmacy_stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pharmacy_substitutions_item_idx" ON "pharmacy_substitutions" USING btree ("orderitemid");
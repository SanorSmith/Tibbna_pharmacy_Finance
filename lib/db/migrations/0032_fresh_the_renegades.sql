CREATE TABLE IF NOT EXISTS "patient_credit_accounts" (
	"accountid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"patientid" uuid NOT NULL,
	"creditlimit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currentbalance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"availablecredit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_patient_credit" UNIQUE("workspaceid","patientid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_payments" (
	"paymentid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saleid" uuid NOT NULL,
	"paymentmethod" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"cardtype" text,
	"cardlast4" text,
	"cardholder" text,
	"transactionid" text,
	"authorizationcode" text,
	"insurancecompanyid" uuid,
	"insuranceclaimnumber" text,
	"insurancecoverage" numeric(12, 2),
	"patientcopay" numeric(12, 2),
	"approvalcode" text,
	"creditaccountid" uuid,
	"creditbalancebefore" numeric(12, 2),
	"creditbalanceafter" numeric(12, 2),
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sale_items" (
	"itemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saleid" uuid NOT NULL,
	"drugid" uuid NOT NULL,
	"drugname" text NOT NULL,
	"batchid" uuid,
	"lotnumber" text,
	"expirydate" date,
	"quantity" integer NOT NULL,
	"unitprice" numeric(10, 2) NOT NULL,
	"discountpercent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discountamount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"taxamount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"totalamount" numeric(10, 2) NOT NULL,
	"pharmacyorderitemid" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sales" (
	"saleid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"salenumber" text NOT NULL,
	"saledate" timestamp with time zone DEFAULT now() NOT NULL,
	"patientid" uuid,
	"customername" text,
	"customernationalid" text,
	"customerphone" text,
	"pharmacyorderid" uuid,
	"prescriptionid" text,
	"saletype" text NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"taxamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalamount" numeric(12, 2) NOT NULL,
	"paidamount" numeric(12, 2) NOT NULL,
	"changeamount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"cashierid" uuid NOT NULL,
	"shiftid" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_sales_salenumber_unique" UNIQUE("salenumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_shifts" (
	"shiftid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"cashierid" uuid NOT NULL,
	"shiftnumber" text NOT NULL,
	"openingtime" timestamp with time zone DEFAULT now() NOT NULL,
	"closingtime" timestamp with time zone,
	"openingcash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expectedcash" numeric(12, 2),
	"actualcash" numeric(12, 2),
	"variance" numeric(12, 2),
	"variancereason" text,
	"totalsales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalcashsales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalcardsales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalinsurancesales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalcreditsales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transactioncount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"closedat" timestamp with time zone,
	CONSTRAINT "pos_shifts_shiftnumber_unique" UNIQUE("shiftnumber")
);
--> statement-breakpoint
ALTER TABLE "pharmacy_order_items" ADD COLUMN "dispenselocationid" uuid;--> statement-breakpoint
ALTER TABLE "pharmacy_stock_levels" ADD COLUMN "reservedquantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_credit_accounts" ADD CONSTRAINT "patient_credit_accounts_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_credit_accounts" ADD CONSTRAINT "patient_credit_accounts_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_saleid_pos_sales_saleid_fk" FOREIGN KEY ("saleid") REFERENCES "public"."pos_sales"("saleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_insurancecompanyid_insurance_companies_insuranceid_fk" FOREIGN KEY ("insurancecompanyid") REFERENCES "public"."insurance_companies"("insuranceid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_saleid_pos_sales_saleid_fk" FOREIGN KEY ("saleid") REFERENCES "public"."pos_sales"("saleid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_drugid_drugs_drugid_fk" FOREIGN KEY ("drugid") REFERENCES "public"."drugs"("drugid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_batchid_drug_batches_batchid_fk" FOREIGN KEY ("batchid") REFERENCES "public"."drug_batches"("batchid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_pharmacyorderitemid_pharmacy_order_items_itemid_fk" FOREIGN KEY ("pharmacyorderitemid") REFERENCES "public"."pharmacy_order_items"("itemid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_patientid_patients_patientid_fk" FOREIGN KEY ("patientid") REFERENCES "public"."patients"("patientid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_pharmacyorderid_pharmacy_orders_orderid_fk" FOREIGN KEY ("pharmacyorderid") REFERENCES "public"."pharmacy_orders"("orderid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_cashierid_users_userid_fk" FOREIGN KEY ("cashierid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_cashierid_users_userid_fk" FOREIGN KEY ("cashierid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_credit_workspace" ON "patient_credit_accounts" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_credit_patient" ON "patient_credit_accounts" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_payments_sale" ON "pos_payments" USING btree ("saleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_payments_method" ON "pos_payments" USING btree ("paymentmethod");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sale_items_sale" ON "pos_sale_items" USING btree ("saleid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sale_items_drug" ON "pos_sale_items" USING btree ("drugid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_workspace" ON "pos_sales" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_date" ON "pos_sales" USING btree ("saledate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_patient" ON "pos_sales" USING btree ("patientid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_shift" ON "pos_sales" USING btree ("shiftid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_cashier" ON "pos_sales" USING btree ("cashierid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_status" ON "pos_sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_shifts_workspace" ON "pos_shifts" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_shifts_cashier" ON "pos_shifts" USING btree ("cashierid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_shifts_status" ON "pos_shifts" USING btree ("status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_dispenselocationid_pharmacy_stock_locations_locationid_fk" FOREIGN KEY ("dispenselocationid") REFERENCES "public"."pharmacy_stock_locations"("locationid") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

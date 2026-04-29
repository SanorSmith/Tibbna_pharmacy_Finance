CREATE TABLE IF NOT EXISTS "fin_accounts" (
	"accountid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"accountcode" text NOT NULL,
	"accountname" text NOT NULL,
	"accounttype" text NOT NULL,
	"accountsubtype" text,
	"parentaccountid" uuid,
	"level" integer DEFAULT 1 NOT NULL,
	"isgroupaccount" boolean DEFAULT false NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"normalbalance" text DEFAULT 'DEBIT' NOT NULL,
	"description" text,
	"createdby" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fin_accounts_ws_code_uq" UNIQUE("workspaceid","accountcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_ap_invoices" (
	"apinvoiceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"vendorid" uuid NOT NULL,
	"invoicenumber" text NOT NULL,
	"supplierinvoicenumber" text,
	"invoicedate" date NOT NULL,
	"duedate" date NOT NULL,
	"grnid" uuid,
	"poid" uuid,
	"subtotal" numeric(14, 2) NOT NULL,
	"taxamount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"totalamount" numeric(14, 2) NOT NULL,
	"paidamount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balancedue" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"journalid" uuid,
	"approvedby" uuid,
	"approvedat" timestamp with time zone,
	"createdby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fin_ap_vendor_inv_uq" UNIQUE("vendorid","supplierinvoicenumber")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_ap_payment_allocations" (
	"allocationid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentid" uuid NOT NULL,
	"apinvoiceid" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_ap_payments" (
	"paymentid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"vendorid" uuid NOT NULL,
	"paymentdate" date NOT NULL,
	"paymentmethod" text NOT NULL,
	"bankaccountid" uuid,
	"reference" text,
	"totalamount" numeric(14, 2) NOT NULL,
	"journalid" uuid,
	"createdby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_vendors" (
	"vendorid" uuid PRIMARY KEY NOT NULL,
	"workspaceid" uuid NOT NULL,
	"paymentterms" text DEFAULT 'NET_30',
	"creditlimit" numeric(14, 2),
	"currencycode" text DEFAULT 'USD',
	"taxid" text,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_ar_transactions" (
	"artransactionid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"customertype" text NOT NULL,
	"customerid" text NOT NULL,
	"sourcetype" text NOT NULL,
	"sourceid" text NOT NULL,
	"transactiondate" date NOT NULL,
	"debitamount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"creditamount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"journalid" uuid,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_audit_log" (
	"auditid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"tablename" text NOT NULL,
	"recordid" uuid NOT NULL,
	"action" text NOT NULL,
	"userid" uuid NOT NULL,
	"ipaddress" text,
	"beforedata" jsonb,
	"afterdata" jsonb,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_account_balances" (
	"balanceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accountid" uuid NOT NULL,
	"periodid" uuid NOT NULL,
	"openingdebit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"openingcredit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"perioddebit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"periodcredit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"closingdebit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"closingcredit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fin_ab_acct_period_uq" UNIQUE("accountid","periodid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_bank_accounts" (
	"bankaccountid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"accountname" text NOT NULL,
	"bankname" text,
	"accountnumber" text,
	"accounttype" text NOT NULL,
	"currencycode" text DEFAULT 'USD',
	"glaccountid" uuid NOT NULL,
	"currentbalance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_journal_entries" (
	"journalid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"journalnumber" text NOT NULL,
	"journaldate" date NOT NULL,
	"periodid" uuid NOT NULL,
	"sourcetype" text NOT NULL,
	"sourceid" text,
	"description" text,
	"totaldebit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"totalcredit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"postedby" uuid,
	"postedat" timestamp with time zone,
	"reversalof" uuid,
	"reversalreason" text,
	"createdby" uuid NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fin_je_ws_source_uq" UNIQUE("workspaceid","sourcetype","sourceid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_journal_lines" (
	"lineid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journalid" uuid NOT NULL,
	"accountid" uuid NOT NULL,
	"debit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"memo" text,
	"costcenterid" uuid,
	"branchid" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_periods" (
	"periodid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"periodcode" text NOT NULL,
	"periodname" text NOT NULL,
	"periodtype" text NOT NULL,
	"startdate" date NOT NULL,
	"enddate" date NOT NULL,
	"fiscalyear" integer NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"closedby" uuid,
	"closedat" timestamp with time zone,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fin_periods_ws_code_uq" UNIQUE("workspaceid","periodcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_tax_codes" (
	"taxcodeid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceid" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"taxtype" text NOT NULL,
	"isinclusive" boolean DEFAULT false NOT NULL,
	"glaccountid" uuid,
	"isactive" boolean DEFAULT true NOT NULL,
	"effectivefrom" date NOT NULL,
	"effectiveto" date,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_invoices" ADD CONSTRAINT "fin_ap_invoices_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_invoices" ADD CONSTRAINT "fin_ap_invoices_vendorid_fin_vendors_vendorid_fk" FOREIGN KEY ("vendorid") REFERENCES "public"."fin_vendors"("vendorid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_invoices" ADD CONSTRAINT "fin_ap_invoices_journalid_fin_journal_entries_journalid_fk" FOREIGN KEY ("journalid") REFERENCES "public"."fin_journal_entries"("journalid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_invoices" ADD CONSTRAINT "fin_ap_invoices_approvedby_users_userid_fk" FOREIGN KEY ("approvedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_invoices" ADD CONSTRAINT "fin_ap_invoices_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payment_allocations" ADD CONSTRAINT "fin_ap_payment_allocations_paymentid_fin_ap_payments_paymentid_fk" FOREIGN KEY ("paymentid") REFERENCES "public"."fin_ap_payments"("paymentid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payment_allocations" ADD CONSTRAINT "fin_ap_payment_allocations_apinvoiceid_fin_ap_invoices_apinvoiceid_fk" FOREIGN KEY ("apinvoiceid") REFERENCES "public"."fin_ap_invoices"("apinvoiceid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payments" ADD CONSTRAINT "fin_ap_payments_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payments" ADD CONSTRAINT "fin_ap_payments_vendorid_fin_vendors_vendorid_fk" FOREIGN KEY ("vendorid") REFERENCES "public"."fin_vendors"("vendorid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payments" ADD CONSTRAINT "fin_ap_payments_bankaccountid_fin_bank_accounts_bankaccountid_fk" FOREIGN KEY ("bankaccountid") REFERENCES "public"."fin_bank_accounts"("bankaccountid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payments" ADD CONSTRAINT "fin_ap_payments_journalid_fin_journal_entries_journalid_fk" FOREIGN KEY ("journalid") REFERENCES "public"."fin_journal_entries"("journalid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ap_payments" ADD CONSTRAINT "fin_ap_payments_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_vendors" ADD CONSTRAINT "fin_vendors_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ar_transactions" ADD CONSTRAINT "fin_ar_transactions_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_ar_transactions" ADD CONSTRAINT "fin_ar_transactions_journalid_fin_journal_entries_journalid_fk" FOREIGN KEY ("journalid") REFERENCES "public"."fin_journal_entries"("journalid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_audit_log" ADD CONSTRAINT "fin_audit_log_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_audit_log" ADD CONSTRAINT "fin_audit_log_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_account_balances" ADD CONSTRAINT "fin_account_balances_accountid_fin_accounts_accountid_fk" FOREIGN KEY ("accountid") REFERENCES "public"."fin_accounts"("accountid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_account_balances" ADD CONSTRAINT "fin_account_balances_periodid_fin_periods_periodid_fk" FOREIGN KEY ("periodid") REFERENCES "public"."fin_periods"("periodid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_glaccountid_fin_accounts_accountid_fk" FOREIGN KEY ("glaccountid") REFERENCES "public"."fin_accounts"("accountid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_periodid_fin_periods_periodid_fk" FOREIGN KEY ("periodid") REFERENCES "public"."fin_periods"("periodid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_postedby_users_userid_fk" FOREIGN KEY ("postedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_journalid_fin_journal_entries_journalid_fk" FOREIGN KEY ("journalid") REFERENCES "public"."fin_journal_entries"("journalid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_accountid_fin_accounts_accountid_fk" FOREIGN KEY ("accountid") REFERENCES "public"."fin_accounts"("accountid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_periods" ADD CONSTRAINT "fin_periods_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_periods" ADD CONSTRAINT "fin_periods_closedby_users_userid_fk" FOREIGN KEY ("closedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_tax_codes" ADD CONSTRAINT "fin_tax_codes_workspaceid_workspaces_workspaceid_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fin_tax_codes" ADD CONSTRAINT "fin_tax_codes_glaccountid_fin_accounts_accountid_fk" FOREIGN KEY ("glaccountid") REFERENCES "public"."fin_accounts"("accountid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_accounts_ws_idx" ON "fin_accounts" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_accounts_type_idx" ON "fin_accounts" USING btree ("accounttype");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_accounts_parent_idx" ON "fin_accounts" USING btree ("parentaccountid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_inv_ws_idx" ON "fin_ap_invoices" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_inv_vendor_idx" ON "fin_ap_invoices" USING btree ("vendorid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_inv_status_idx" ON "fin_ap_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_inv_due_idx" ON "fin_ap_invoices" USING btree ("duedate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_alloc_pay_idx" ON "fin_ap_payment_allocations" USING btree ("paymentid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_alloc_inv_idx" ON "fin_ap_payment_allocations" USING btree ("apinvoiceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_pay_ws_idx" ON "fin_ap_payments" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ap_pay_vendor_idx" ON "fin_ap_payments" USING btree ("vendorid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_vendors_ws_idx" ON "fin_vendors" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ar_ws_idx" ON "fin_ar_transactions" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ar_customer_idx" ON "fin_ar_transactions" USING btree ("customertype","customerid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ar_date_idx" ON "fin_ar_transactions" USING btree ("transactiondate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ar_source_idx" ON "fin_ar_transactions" USING btree ("sourcetype","sourceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_audit_table_idx" ON "fin_audit_log" USING btree ("tablename","recordid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_audit_user_idx" ON "fin_audit_log" USING btree ("userid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_audit_date_idx" ON "fin_audit_log" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_audit_ws_idx" ON "fin_audit_log" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ab_account_idx" ON "fin_account_balances" USING btree ("accountid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_ab_period_idx" ON "fin_account_balances" USING btree ("periodid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_bank_ws_idx" ON "fin_bank_accounts" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_ws_idx" ON "fin_journal_entries" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_date_idx" ON "fin_journal_entries" USING btree ("journaldate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_status_idx" ON "fin_journal_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_period_idx" ON "fin_journal_entries" USING btree ("periodid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_source_idx" ON "fin_journal_entries" USING btree ("sourcetype","sourceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_je_number_idx" ON "fin_journal_entries" USING btree ("journalnumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_jl_journal_idx" ON "fin_journal_lines" USING btree ("journalid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_jl_account_idx" ON "fin_journal_lines" USING btree ("accountid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_periods_ws_idx" ON "fin_periods" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_periods_date_idx" ON "fin_periods" USING btree ("startdate","enddate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_periods_year_idx" ON "fin_periods" USING btree ("fiscalyear");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_tax_ws_idx" ON "fin_tax_codes" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fin_tax_code_idx" ON "fin_tax_codes" USING btree ("workspaceid","code");
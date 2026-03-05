CREATE TABLE IF NOT EXISTS "lab_test_catalog" (
	"testid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"testcode" text NOT NULL,
	"testname" text NOT NULL,
	"testdescription" text,
	"testcategory" text NOT NULL,
	"testpanel" text,
	"loinccode" text,
	"loincname" text,
	"snomedcode" text,
	"snomedname" text,
	"specimentype" text NOT NULL,
	"specimenvolume" text,
	"specimencontainer" text,
	"turnaroundtime" text,
	"fastingrequired" boolean DEFAULT false,
	"isactive" boolean DEFAULT true NOT NULL,
	"workspaceid" text NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_test_catalog_testcode_unique" UNIQUE("testcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lims_order_tests" (
	"ordertestid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderid" uuid NOT NULL,
	"testid" uuid NOT NULL,
	"teststatus" text DEFAULT 'REQUESTED' NOT NULL,
	"specimenid" uuid,
	"resultvalue" text,
	"resultunit" text,
	"resultstatus" text,
	"resultedby" uuid,
	"resultedat" timestamp with time zone,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lims_orders" (
	"orderid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subjecttype" text NOT NULL,
	"subjectidentifier" text NOT NULL,
	"encounterid" text,
	"studyprotocolid" text,
	"priority" text DEFAULT 'ROUTINE' NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"orderingproviderid" uuid NOT NULL,
	"orderingprovidername" text,
	"sourcesystem" text DEFAULT 'LIMS_UI' NOT NULL,
	"clinicalindication" text,
	"clinicalnotes" text,
	"statjustification" text,
	"ehrid" text,
	"compositionuid" text,
	"timecommitted" timestamp with time zone,
	"fhirservicerequestid" text,
	"workspaceid" text NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelledat" timestamp with time zone,
	"cancelledby" uuid,
	"cancellationreason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_protocols" (
	"protocolid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocolnumber" text NOT NULL,
	"protocolname" text NOT NULL,
	"protocoldescription" text,
	"principalinvestigatorid" uuid,
	"principalinvestigatorname" text,
	"irbapprovaldate" timestamp with time zone,
	"irbapprovalnumber" text,
	"isactive" boolean DEFAULT true NOT NULL,
	"workspaceid" text NOT NULL,
	"createdat" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_protocols_protocolnumber_unique" UNIQUE("protocolnumber")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lims_order_tests" ADD CONSTRAINT "lims_order_tests_orderid_lims_orders_orderid_fk" FOREIGN KEY ("orderid") REFERENCES "public"."lims_orders"("orderid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lims_order_tests" ADD CONSTRAINT "lims_order_tests_testid_lab_test_catalog_testid_fk" FOREIGN KEY ("testid") REFERENCES "public"."lab_test_catalog"("testid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lims_order_tests" ADD CONSTRAINT "lims_order_tests_resultedby_users_userid_fk" FOREIGN KEY ("resultedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lims_orders" ADD CONSTRAINT "lims_orders_orderingproviderid_users_userid_fk" FOREIGN KEY ("orderingproviderid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lims_orders" ADD CONSTRAINT "lims_orders_cancelledby_users_userid_fk" FOREIGN KEY ("cancelledby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_protocols" ADD CONSTRAINT "study_protocols_principalinvestigatorid_users_userid_fk" FOREIGN KEY ("principalinvestigatorid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_catalog_code_idx" ON "lab_test_catalog" USING btree ("testcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_catalog_category_idx" ON "lab_test_catalog" USING btree ("testcategory");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_catalog_active_idx" ON "lab_test_catalog" USING btree ("isactive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_catalog_workspace_idx" ON "lab_test_catalog" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_order_tests_order_idx" ON "lims_order_tests" USING btree ("orderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_order_tests_test_idx" ON "lims_order_tests" USING btree ("testid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_order_tests_status_idx" ON "lims_order_tests" USING btree ("teststatus");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_orders_workspace_idx" ON "lims_orders" USING btree ("workspaceid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_orders_status_idx" ON "lims_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_orders_subject_idx" ON "lims_orders" USING btree ("subjectidentifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_orders_provider_idx" ON "lims_orders" USING btree ("orderingproviderid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lims_orders_created_idx" ON "lims_orders" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_protocols_number_idx" ON "study_protocols" USING btree ("protocolnumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_protocols_active_idx" ON "study_protocols" USING btree ("isactive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_protocols_workspace_idx" ON "study_protocols" USING btree ("workspaceid");
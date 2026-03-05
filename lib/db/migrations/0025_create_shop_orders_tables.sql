-- Create shop_orders table for laboratory shop orders management
CREATE TABLE IF NOT EXISTS "shop_orders" (
	"orderid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ordernumber" text NOT NULL,
	"deliveryaddress" text,
	"deliverytime" timestamp,
	"clientname" text,
	"clientemail" text,
	"clientphone" text,
	"orderedby" uuid NOT NULL,
	"approvedby" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'normal',
	"orderdate" timestamp,
	"approveddate" timestamp,
	"delivereddate" timestamp,
	"totalcost" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"notes" text,
	"internalnotes" text,
	"createdby" uuid NOT NULL,
	"createdat" text NOT NULL,
	"updatedby" uuid,
	"updatedat" text,
	"workspaceid" text NOT NULL,
	CONSTRAINT "shop_orders_ordernumber_unique" UNIQUE("ordernumber")
);

-- Create shop_order_items table for order line items
CREATE TABLE IF NOT EXISTS "shop_order_items" (
	"itemid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderid" uuid NOT NULL,
	"itemname" text NOT NULL,
	"itemtype" text,
	"size" text,
	"number" integer DEFAULT 1 NOT NULL,
	"materialid" uuid,
	"equipmentid" uuid,
	"supplierid" uuid,
	"unitprice" numeric(10, 2),
	"totalPrice" numeric(12, 2),
	"notes" text,
	"specifications" text,
	"sortorder" integer DEFAULT 0,
	"createdat" text NOT NULL,
	"updatedat" text
);

-- Create indexes for shop_orders table
CREATE INDEX IF NOT EXISTS "shop_orders_workspace_idx" ON "shop_orders" ("workspaceid");
CREATE INDEX IF NOT EXISTS "shop_orders_status_idx" ON "shop_orders" ("status");
CREATE INDEX IF NOT EXISTS "shop_orders_ordered_by_idx" ON "shop_orders" ("orderedby");
CREATE INDEX IF NOT EXISTS "shop_orders_order_number_idx" ON "shop_orders" ("ordernumber");
CREATE INDEX IF NOT EXISTS "shop_orders_order_date_idx" ON "shop_orders" ("orderdate");

-- Create indexes for shop_order_items table
CREATE INDEX IF NOT EXISTS "shop_order_items_order_id_idx" ON "shop_order_items" ("orderid");
CREATE INDEX IF NOT EXISTS "shop_order_items_item_type_idx" ON "shop_order_items" ("itemtype");

-- Add foreign key constraints for shop_orders
DO $$ BEGIN
 ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_createdby_users_userid_fk" FOREIGN KEY ("createdby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_updatedby_users_userid_fk" FOREIGN KEY ("updatedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_orderedby_users_userid_fk" FOREIGN KEY ("orderedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_approvedby_users_userid_fk" FOREIGN KEY ("approvedby") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraint for shop_order_items
DO $$ BEGIN
 ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_orderid_shop_orders_orderid_fk" FOREIGN KEY ("orderid") REFERENCES "public"."shop_orders"("orderid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

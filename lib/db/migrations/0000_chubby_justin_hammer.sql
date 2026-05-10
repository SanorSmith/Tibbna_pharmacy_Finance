CREATE TABLE IF NOT EXISTS "usersessions" (
	"sessionid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userid" uuid NOT NULL,
	"sessiontoken" text NOT NULL,
	"deviceinfo" text,
	"ipaddress" text,
	"useragent" text,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"lastactive" timestamp DEFAULT now() NOT NULL,
	"expiresat" timestamp NOT NULL,
	CONSTRAINT "usersessions_sessiontoken_unique" UNIQUE("sessiontoken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"userid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"image" text,
	"password" text,
	"theme" text DEFAULT 'system',
	"language" text DEFAULT 'en',
	"permissions" jsonb DEFAULT '[]',
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"workspaceid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"settings" jsonb DEFAULT '{}',
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaceusers" (
	"workspaceid" uuid NOT NULL,
	"userid" uuid NOT NULL,
	"role" text NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaceusers_workspaceid_userid_pk" PRIMARY KEY("workspaceid","userid")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usersessions" ADD CONSTRAINT "usersessions_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspaceusers" ADD CONSTRAINT "workspaceuser_workspace_fk" FOREIGN KEY ("workspaceid") REFERENCES "public"."workspaces"("workspaceid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspaceusers" ADD CONSTRAINT "workspaceuser_user_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

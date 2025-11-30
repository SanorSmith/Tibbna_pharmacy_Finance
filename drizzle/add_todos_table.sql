-- Create todos table
CREATE TABLE IF NOT EXISTS "todos" (
  "todoid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceid" uuid NOT NULL REFERENCES "workspaces"("workspaceid") ON DELETE CASCADE,
  "userid" uuid NOT NULL REFERENCES "users"("userid") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "completed" boolean NOT NULL DEFAULT false,
  "priority" text NOT NULL DEFAULT 'medium',
  "duedate" timestamp with time zone,
  "createdat" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedat" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_todos_workspaceid" ON "todos"("workspaceid");
CREATE INDEX IF NOT EXISTS "idx_todos_userid" ON "todos"("userid");
CREATE INDEX IF NOT EXISTS "idx_todos_completed" ON "todos"("completed");

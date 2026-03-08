-- Fix notifications table - align column names with schema
-- The table has organization_id, recipient_id, etc. but schema expects workspaceid, userid, etc.

-- Drop the existing notifications table and recreate with correct schema
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table with correct column names
CREATE TABLE notifications (
    notificationid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    relatedentityid TEXT,
    relatedentitytype TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'medium',
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX notifications_workspace_idx ON notifications(workspaceid);
CREATE INDEX notifications_user_idx ON notifications(userid);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_read_idx ON notifications(read);
CREATE INDEX notifications_created_idx ON notifications(createdat);

-- Add comment
COMMENT ON TABLE notifications IS 'LIMS notifications for users';

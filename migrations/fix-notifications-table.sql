-- Fix notifications table - add missing notificationid column
-- This migration renames the id column to notificationid to match the schema

-- Check if the table exists and what columns it has
DO $$ 
BEGIN
    -- If notifications table exists but has 'id' instead of 'notificationid'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'id'
    ) THEN
        -- Rename id to notificationid
        ALTER TABLE notifications RENAME COLUMN id TO notificationid;
        RAISE NOTICE 'Renamed id to notificationid';
    END IF;

    -- If notifications table doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        CREATE TABLE notifications (
            notificationid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
            userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            relatedentityid TEXT,
            relatedentitytype TEXT,
            metadata JSONB,
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

        RAISE NOTICE 'Created notifications table';
    END IF;
END $$;

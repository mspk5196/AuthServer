-- =========================================================================
-- MSPK Auth Server: Developer Feedback & Issues Threading Migration
-- Target Database: authdb (PostgreSQL)
-- =========================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure primary keys exist on base tables if they were imported without them
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='developers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='developers' AND constraint_type='PRIMARY KEY') THEN
            ALTER TABLE developers ADD CONSTRAINT developers_pkey PRIMARY KEY (id);
        END IF;
    END IF;


    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dev_apps') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='dev_apps' AND constraint_type='PRIMARY KEY') THEN
            ALTER TABLE dev_apps ADD CONSTRAINT apps_pkey PRIMARY KEY (id);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='app_groups') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='app_groups' AND constraint_type='PRIMARY KEY') THEN
            ALTER TABLE app_groups ADD CONSTRAINT app_groups_pkey PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- 2. Create dev_feedback table
CREATE TABLE IF NOT EXISTS dev_feedback (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id  UUID,
    type          VARCHAR(20) NOT NULL DEFAULT 'feedback',   -- 'feedback' | 'issue'
    title         VARCHAR(200),
    description   TEXT NOT NULL,
    app_id        UUID,
    group_id      UUID,
    name          VARCHAR(100),
    email         VARCHAR(150),
    attachments   JSONB DEFAULT '[]'::jsonb,
    status        VARCHAR(20) DEFAULT 'open',
    ref_id        VARCHAR(50),
    thread_id     VARCHAR(100),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. If dev_feedback already existed, ensure columns are present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dev_feedback' AND column_name='ref_id') THEN
        ALTER TABLE dev_feedback ADD COLUMN ref_id VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dev_feedback' AND column_name='thread_id') THEN
        ALTER TABLE dev_feedback ADD COLUMN thread_id VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dev_feedback' AND column_name='updated_at') THEN
        ALTER TABLE dev_feedback ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Create dev_feedback_messages table for threaded conversation
CREATE TABLE IF NOT EXISTS dev_feedback_messages (
    id SERIAL PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES dev_feedback(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'DEVELOPER' or 'ADMIN'
    sender_id VARCHAR(255),
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    email_ref_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_dev_feedback_messages_feedback_id ON dev_feedback_messages(feedback_id);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_status ON dev_feedback(status);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_developer_id ON dev_feedback(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_type ON dev_feedback(type);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_ref_id ON dev_feedback(ref_id);
CREATE INDEX IF NOT EXISTS idx_dev_feedback_thread_id ON dev_feedback(thread_id);

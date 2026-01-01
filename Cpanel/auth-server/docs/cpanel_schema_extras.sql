-- Combined SQL for cPanel auth-server schema extensions
-- This script aggregates the schema changes from migrations:
--   003_api_usage_tracking.sql
--   004_user_profile_updates.sql
--   006_developer_combine_users.sql
--
-- It assumes the core tables (developers, dev_apps, users) already exist
-- in the main auth database.

-- =============================
-- 003_api_usage_tracking.sql
-- =============================

-- Table for tracking API calls to developer apps
CREATE TABLE IF NOT EXISTS dev_api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES dev_apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_calls_app ON dev_api_calls(app_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_user ON dev_api_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_created_at ON dev_api_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_api_calls_app_month ON dev_api_calls(app_id, DATE_TRUNC('month', created_at));

-- View to get API usage by developer (aggregated from all their apps)
CREATE OR REPLACE VIEW dev_api_usage_summary AS
SELECT 
    da.developer_id,
    DATE_TRUNC('month', dac.created_at) as usage_month,
    COUNT(*) as api_calls_count,
    AVG(dac.response_time_ms) as avg_response_time_ms,
    da.app_name
FROM dev_api_calls dac
INNER JOIN dev_apps da ON dac.app_id = da.id
GROUP BY da.developer_id, DATE_TRUNC('month', dac.created_at), da.app_name;

-- Comments for documentation
COMMENT ON TABLE dev_api_calls IS 'Tracks all API calls made to developer applications for usage monitoring and billing';
COMMENT ON COLUMN dev_api_calls.endpoint IS 'API endpoint path that was called';
COMMENT ON COLUMN dev_api_calls.method IS 'HTTP method used (GET, POST, PUT, DELETE, PATCH)';
COMMENT ON COLUMN dev_api_calls.response_time_ms IS 'Response time in milliseconds for performance monitoring';
COMMENT ON COLUMN dev_api_calls.status_code IS 'HTTP status code returned';

-- Function to clean up old API call logs (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_api_calls()
RETURNS void AS $$
BEGIN
    DELETE FROM dev_api_calls 
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_api_calls IS 'Deletes API call logs older than 90 days for data retention';


-- =============================
-- 004_user_profile_updates.sql
-- =============================

-- users.extra: store custom fields values per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra jsonb DEFAULT '{}'::jsonb;

-- dev_apps.user_edit_permissions: store core field edit permissions per app
ALTER TABLE dev_apps ADD COLUMN IF NOT EXISTS user_edit_permissions jsonb DEFAULT '{}'::jsonb;

-- pending updates that require email verification before applying
CREATE TABLE IF NOT EXISTS pending_user_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES dev_apps(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  email_target VARCHAR(320),
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pending_updates_token ON pending_user_updates(token);
CREATE INDEX IF NOT EXISTS idx_pending_updates_user ON pending_user_updates(user_id);


-- =============================
-- 006_developer_combine_users.sql
-- =============================

-- Add developer-level flag to allow combining users across their apps
ALTER TABLE developers ADD COLUMN IF NOT EXISTS combine_users_across_apps boolean DEFAULT false;

-- Table to record performed user merges for audit
CREATE TABLE IF NOT EXISTS user_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  kept_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  merged_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_merges_dev ON user_merges(developer_id);

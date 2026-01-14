-- Migration for API Usage Tracking
-- This table tracks actual API calls made to developer apps for usage monitoring

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

-- You can schedule this function to run periodically
-- Example: Keep only last 90 days of API call logs
COMMENT ON FUNCTION cleanup_old_api_calls IS 'Deletes API call logs older than 90 days for data retention';

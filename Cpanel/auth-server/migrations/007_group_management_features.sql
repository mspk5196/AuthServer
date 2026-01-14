-- Migration: 007_group_management_features.sql
-- Adds comprehensive group management features:
-- 1. Group-level user blocking
-- 2. Common extra fields for all apps in a group
-- 3. Shared OAuth credentials for group
-- 4. Bulk operations tracking

-- =============================
-- 1. GROUP-LEVEL USER BLOCKING
-- =============================

-- Track blocked users at group level (blocks from all apps in group)
CREATE TABLE IF NOT EXISTS group_blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES app_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  reason TEXT,
  blocked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_blocked_users_group ON group_blocked_users(group_id);
CREATE INDEX IF NOT EXISTS idx_group_blocked_users_user ON group_blocked_users(user_id);

COMMENT ON TABLE group_blocked_users IS 'Tracks users blocked at group level - applies to all apps in the group';

-- =============================
-- 2. COMMON GROUP EXTRA FIELDS
-- =============================

-- Store common extra fields configuration at group level
ALTER TABLE app_groups ADD COLUMN IF NOT EXISTS common_extra_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE app_groups ADD COLUMN IF NOT EXISTS use_common_extra_fields BOOLEAN DEFAULT false;

COMMENT ON COLUMN app_groups.common_extra_fields IS 'Common extra user fields that apply to all apps in this group';
COMMENT ON COLUMN app_groups.use_common_extra_fields IS 'Whether to use common extra fields for all apps in group';

-- =============================
-- 3. SHARED GROUP OAUTH CREDENTIALS
-- =============================

-- Store shared OAuth credentials at group level
ALTER TABLE app_groups ADD COLUMN IF NOT EXISTS use_common_google_oauth BOOLEAN DEFAULT false;
ALTER TABLE app_groups ADD COLUMN IF NOT EXISTS common_google_client_id VARCHAR(512);
ALTER TABLE app_groups ADD COLUMN IF NOT EXISTS common_google_client_secret VARCHAR(512);

COMMENT ON COLUMN app_groups.use_common_google_oauth IS 'Whether to use shared Google OAuth credentials for all apps in group';
COMMENT ON COLUMN app_groups.common_google_client_id IS 'Shared Google OAuth client ID for all apps in group';
COMMENT ON COLUMN app_groups.common_google_client_secret IS 'Shared Google OAuth client secret for all apps in group';

-- =============================
-- 4. BULK OPERATIONS TRACKING
-- =============================

-- Track bulk operations performed on users/apps
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  group_id UUID REFERENCES app_groups(id) ON DELETE SET NULL,
  app_id UUID REFERENCES dev_apps(id) ON DELETE SET NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'block_users', 'unblock_users', 'delete_users', etc.
  target_count INTEGER NOT NULL DEFAULT 0, -- Number of targets affected
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional operation details
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bulk_ops_developer ON bulk_operations(developer_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_group ON bulk_operations(group_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created_at ON bulk_operations(created_at);

COMMENT ON TABLE bulk_operations IS 'Tracks bulk operations performed on users, apps, or groups';

-- =============================
-- 5. GROUP-LEVEL USER MANAGEMENT
-- =============================

-- Add metadata to group_user_logins for better tracking
ALTER TABLE group_user_logins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE group_user_logins ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES developers(id) ON DELETE SET NULL;
ALTER TABLE group_user_logins ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN group_user_logins.is_active IS 'Whether this user is still active in the group';
COMMENT ON COLUMN group_user_logins.added_by IS 'Developer who added this user to the group';
COMMENT ON COLUMN group_user_logins.notes IS 'Optional notes about this user in the group';

-- =============================
-- 6. HELPER VIEWS
-- =============================

-- View to get blocked users count per group
CREATE OR REPLACE VIEW group_blocked_users_count AS
SELECT 
  group_id,
  COUNT(*) as blocked_count
FROM group_blocked_users
GROUP BY group_id;

-- View to get active users per group
CREATE OR REPLACE VIEW group_active_users_count AS
SELECT 
  gul.group_id,
  COUNT(DISTINCT gul.user_id) as active_user_count
FROM group_user_logins gul
LEFT JOIN group_blocked_users gbu ON gul.group_id = gbu.group_id AND gul.user_id = gbu.user_id
WHERE gul.is_active = true AND gbu.id IS NULL
GROUP BY gul.group_id;

-- =============================
-- 7. FUNCTIONS
-- =============================

-- Function to block user from group (and all its apps)
CREATE OR REPLACE FUNCTION block_user_from_group(
  p_group_id UUID,
  p_user_id UUID,
  p_blocked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert into group_blocked_users
  INSERT INTO group_blocked_users (group_id, user_id, blocked_by, reason)
  VALUES (p_group_id, p_user_id, p_blocked_by, p_reason)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- Update user's is_blocked flag in all apps within this group
  UPDATE users u
  SET is_blocked = true, updated_at = NOW()
  FROM dev_apps da
  WHERE u.app_id = da.id 
    AND da.group_id = p_group_id 
    AND u.id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unblock user from group
CREATE OR REPLACE FUNCTION unblock_user_from_group(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove from group_blocked_users
  DELETE FROM group_blocked_users 
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  -- Update user's is_blocked flag in all apps within this group
  UPDATE users u
  SET is_blocked = false, updated_at = NOW()
  FROM dev_apps da
  WHERE u.app_id = da.id 
    AND da.group_id = p_group_id 
    AND u.id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk block users in a group
CREATE OR REPLACE FUNCTION bulk_block_users_in_group(
  p_group_id UUID,
  p_user_ids UUID[],
  p_blocked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  blocked_count INTEGER := 0;
  user_id UUID;
BEGIN
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    PERFORM block_user_from_group(p_group_id, user_id, p_blocked_by, p_reason);
    blocked_count := blocked_count + 1;
  END LOOP;
  
  RETURN blocked_count;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk unblock users in a group
CREATE OR REPLACE FUNCTION bulk_unblock_users_in_group(
  p_group_id UUID,
  p_user_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  unblocked_count INTEGER := 0;
  user_id UUID;
BEGIN
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    PERFORM unblock_user_from_group(p_group_id, user_id);
    unblocked_count := unblocked_count + 1;
  END LOOP;
  
  RETURN unblocked_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION block_user_from_group IS 'Blocks a user from all apps in a group';
COMMENT ON FUNCTION unblock_user_from_group IS 'Unblocks a user from all apps in a group';
COMMENT ON FUNCTION bulk_block_users_in_group IS 'Bulk blocks multiple users from a group';
COMMENT ON FUNCTION bulk_unblock_users_in_group IS 'Bulk unblocks multiple users from a group';

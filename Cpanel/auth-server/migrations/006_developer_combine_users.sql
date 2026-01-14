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

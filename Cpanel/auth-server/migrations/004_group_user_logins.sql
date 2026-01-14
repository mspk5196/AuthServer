-- Migration: 004_create_group_user_logins.sql
-- Tracks which apps in a group a user has logged into

CREATE TABLE IF NOT EXISTS group_user_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES app_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id uuid NOT NULL REFERENCES dev_apps(id) ON DELETE CASCADE,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Prevent duplicate entries for same user/app/group
CREATE UNIQUE INDEX IF NOT EXISTS group_user_logins_unique_idx ON group_user_logins(group_id, user_id, app_id);

-- Optional index for fast lookups by group
CREATE INDEX IF NOT EXISTS group_user_logins_group_idx ON group_user_logins(group_id);

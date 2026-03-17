-- Add support for dynamic user fields and pending profile updates

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

-- Migration 010: V2 features
-- Adds: duration_type + is_admin_plan on dev_plans, payment receipts table,
--       expiry reminder tracking, post-expiry reminder column, feedback/issue table

-- ─── dev_plans ───────────────────────────────────────────────────────────────

ALTER TABLE dev_plans
  ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) DEFAULT 'monthly';
-- Possible values: monthly, quarterly, biannual, yearly, lifetime, custom

ALTER TABLE dev_plans
  ADD COLUMN IF NOT EXISTS is_admin_plan BOOLEAN DEFAULT false;

-- Mark previously hard-coded admin plan names
UPDATE dev_plans
SET is_admin_plan = true
WHERE lower(trim(name)) IN ('unlimited_admin', 'unlimited admin', 'unlimeted_admin');

-- ─── dev_payment_receipts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dev_payment_receipts (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number   VARCHAR(60)  UNIQUE NOT NULL,
  order_id         VARCHAR(255) NOT NULL,
  developer_id     UUID         NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  plan_id          INTEGER      NOT NULL REFERENCES dev_plans(id),
  plan_name        VARCHAR(100) NOT NULL,
  developer_name   VARCHAR(100),
  developer_email  VARCHAR(150),
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(3)   DEFAULT 'INR',
  payment_id       VARCHAR(255),
  payment_method   VARCHAR(50),
  payment_type     VARCHAR(30)  NOT NULL,   -- initial_purchase | renewal | upgrade
  duration_label   VARCHAR(50),
  plan_start_date  TIMESTAMP,
  plan_end_date    TIMESTAMP,
  created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_developer ON dev_payment_receipts(developer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id  ON dev_payment_receipts(order_id);

-- ─── Pre-expiry reminder tracking ─────────────────────────────────────────────
-- One row per (registration, reminder_type) ensures we never duplicate a send.
-- reminder_type values: '7day' | '5day' | '2day' | '1day'

CREATE TABLE IF NOT EXISTS dev_plan_expiry_reminders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  INTEGER     NOT NULL,
  developer_id     UUID        NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  reminder_type    VARCHAR(20) NOT NULL,
  sent_at          TIMESTAMP   DEFAULT NOW(),
  UNIQUE (registration_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_expiry_reminders_dev ON dev_plan_expiry_reminders(developer_id);

-- ─── Post-expiry repeat-reminder tracking ────────────────────────────────────
-- Track when we last sent a "plan is expired, please renew" email (every 2 days).

ALTER TABLE developer_plan_registrations
  ADD COLUMN IF NOT EXISTS last_expiry_reminder_at TIMESTAMP;

-- ─── dev_feedback ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dev_feedback (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  UUID        REFERENCES developers(id) ON DELETE SET NULL,
  type          VARCHAR(20) NOT NULL DEFAULT 'feedback',   -- 'feedback' | 'issue'
  title         VARCHAR(200),
  description   TEXT        NOT NULL,
  app_id        UUID        REFERENCES dev_apps(id) ON DELETE SET NULL,
  group_id      UUID        REFERENCES app_groups(id) ON DELETE SET NULL,
  name          VARCHAR(100),
  email         VARCHAR(150),
  attachments   JSONB       DEFAULT '[]'::jsonb,
  status        VARCHAR(20) DEFAULT 'open',
  created_at    TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_developer ON dev_feedback(developer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type      ON dev_feedback(type);

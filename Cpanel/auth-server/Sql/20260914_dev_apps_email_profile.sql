-- ============================================================
-- Migration: 20260914_dev_apps_email_profile
-- Adds email_smtp_profile_name to dev_apps in authdb.
-- Run manually on authdb BEFORE deploying updated Auth Server.
-- ============================================================

ALTER TABLE dev_apps
  ADD COLUMN IF NOT EXISTS email_smtp_profile_name VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN dev_apps.email_smtp_profile_name IS
  'Named SMTP profile in Email Service (Auth Server product) to use for end-user emails of this app. NULL = use "default" profile.';

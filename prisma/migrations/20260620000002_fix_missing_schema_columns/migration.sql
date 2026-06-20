-- Fix missing mail_accounts columns
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS display_name varchar(255) NOT NULL DEFAULT '';
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0 NOT NULL;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS smtp_last_status varchar(50);
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS smtp_last_checked_at timestamptz;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS imap_last_status varchar(50);
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS imap_last_checked_at timestamptz;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS last_sync_uid integer;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Sync display_name from name for existing accounts
UPDATE mail_accounts SET display_name = name WHERE display_name = '' AND name IS NOT NULL;

-- Fix missing sms_logs columns
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS recipient_masked varchar(20);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS message_type varchar(80);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS module varchar(60);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS entity_type varchar(60);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS reference varchar(120);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS failure_detail text;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0 NOT NULL;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3 NOT NULL;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS is_otp boolean DEFAULT false NOT NULL;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS idempotency_key varchar(255);
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS resent_by_id uuid;

-- Add sms_logs indexes
CREATE INDEX IF NOT EXISTS sms_logs_status_created_at_idx ON sms_logs(status, created_at);
CREATE INDEX IF NOT EXISTS sms_logs_module_message_type_idx ON sms_logs(module, message_type);
CREATE INDEX IF NOT EXISTS sms_logs_is_otp_idx ON sms_logs(is_otp);
CREATE INDEX IF NOT EXISTS sms_logs_idempotency_key_idx ON sms_logs(idempotency_key);

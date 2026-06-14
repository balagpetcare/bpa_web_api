-- AlterTable: expand site_settings with structured address and contact fields
ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "emergency_phone"  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "whatsapp_number"  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "general_email"    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "office_hours"     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "address_line1"    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "address_line2"    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "area"             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "city"             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "postal_code"      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "country"          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "map_embed_url"    TEXT,
  ADD COLUMN IF NOT EXISTS "map_link"         TEXT;

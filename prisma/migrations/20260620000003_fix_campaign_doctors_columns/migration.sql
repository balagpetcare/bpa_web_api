-- Add missing campaign_doctors columns to match Prisma schema
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'vaccinator';
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS doctor_duty "DoctorDutyRole" NOT NULL DEFAULT 'VACCINATOR';
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS is_signing_doctor boolean NOT NULL DEFAULT false;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS is_primary_supervisor boolean NOT NULL DEFAULT false;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS assigned_by uuid;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS assigned_date timestamptz;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE campaign_doctors ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add indexes
CREATE INDEX IF NOT EXISTS campaign_doctors_campaign_id_idx ON campaign_doctors(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_doctors_session_id_idx ON campaign_doctors(session_id);
CREATE INDEX IF NOT EXISTS campaign_doctors_doctor_id_idx ON campaign_doctors(doctor_id);

-- Add missing doctors columns to match Prisma schema
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS name_bn varchar(120);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS designation varchar(120);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS organization varchar(120);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url text;

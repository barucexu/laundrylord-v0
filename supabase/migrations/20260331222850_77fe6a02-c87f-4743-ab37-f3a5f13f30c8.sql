
-- Relax NOT NULL constraints on identity columns
ALTER TABLE renters ALTER COLUMN name DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN type DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN model DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN serial DROP NOT NULL;

-- Add owner_email to operator_settings
ALTER TABLE operator_settings ADD COLUMN IF NOT EXISTS owner_email text;

-- Backfill owner_email from auth.users
UPDATE operator_settings SET owner_email = u.email
FROM auth.users u
WHERE u.id = operator_settings.user_id
AND operator_settings.owner_email IS NULL;

-- Create debug views for ownership clarity
CREATE OR REPLACE VIEW v_renters_with_owner AS
SELECT r.*, os.owner_email, os.business_name
FROM renters r
LEFT JOIN operator_settings os ON os.user_id = r.user_id;

CREATE OR REPLACE VIEW v_machines_with_owner AS
SELECT m.*, os.owner_email, os.business_name
FROM machines m
LEFT JOIN operator_settings os ON os.user_id = m.user_id;

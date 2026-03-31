
DROP VIEW IF EXISTS v_renters_with_owner;
DROP VIEW IF EXISTS v_machines_with_owner;

CREATE VIEW v_renters_with_owner WITH (security_invoker = true) AS
SELECT r.*, os.owner_email, os.business_name
FROM renters r
LEFT JOIN operator_settings os ON os.user_id = r.user_id;

CREATE VIEW v_machines_with_owner WITH (security_invoker = true) AS
SELECT m.*, os.owner_email, os.business_name
FROM machines m
LEFT JOIN operator_settings os ON os.user_id = m.user_id;

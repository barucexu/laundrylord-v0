ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_type_check CHECK (type = ANY (ARRAY['washer','dryer','set']));
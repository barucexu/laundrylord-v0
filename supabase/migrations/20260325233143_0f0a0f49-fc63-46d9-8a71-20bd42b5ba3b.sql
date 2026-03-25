ALTER TABLE machines ADD COLUMN cost_basis numeric DEFAULT 0;
ALTER TABLE machines ADD COLUMN sourced_from text DEFAULT '';
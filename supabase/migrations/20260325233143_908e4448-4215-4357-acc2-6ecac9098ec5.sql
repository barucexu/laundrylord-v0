ALTER TABLE renters ADD COLUMN secondary_contact text DEFAULT '';
ALTER TABLE renters ADD COLUMN language text DEFAULT 'English';
ALTER TABLE renters ADD COLUMN install_notes text DEFAULT '';
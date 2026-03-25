ALTER TABLE payments ADD COLUMN payment_source text DEFAULT 'stripe';
ALTER TABLE payments ADD COLUMN payment_notes text DEFAULT '';
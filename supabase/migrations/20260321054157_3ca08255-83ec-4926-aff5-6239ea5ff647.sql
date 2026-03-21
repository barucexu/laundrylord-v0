ALTER TABLE public.operator_settings
  ADD COLUMN IF NOT EXISTS email_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_upcoming_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_failed_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_latefee_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_name text DEFAULT 'LaundryLord',
  ADD COLUMN IF NOT EXISTS template_upcoming_subject text DEFAULT 'Payment Reminder',
  ADD COLUMN IF NOT EXISTS template_upcoming_body text DEFAULT E'Hi {name},\n\nYour payment of ${amount} is due on {due_date}.\n\nPlease ensure your card on file is up to date.\n\n— {business_name}',
  ADD COLUMN IF NOT EXISTS template_failed_subject text DEFAULT 'Payment Failed',
  ADD COLUMN IF NOT EXISTS template_failed_body text DEFAULT E'Hi {name},\n\nYour payment of ${amount} was declined. Please update your payment method to avoid late fees.\n\nOutstanding balance: ${balance}\n\n— {business_name}',
  ADD COLUMN IF NOT EXISTS template_latefee_subject text DEFAULT 'Late Fee Applied',
  ADD COLUMN IF NOT EXISTS template_latefee_body text DEFAULT E'Hi {name},\n\nA late fee of ${late_fee} has been applied to your account. Your payment is {days_late} days overdue.\n\nUpdated balance: ${balance}\n\nPlease update your payment method as soon as possible.\n\n— {business_name}';
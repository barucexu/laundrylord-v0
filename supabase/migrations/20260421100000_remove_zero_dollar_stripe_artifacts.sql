DELETE FROM public.payments
WHERE payment_source = 'stripe'
  AND COALESCE(amount, 0) = 0
  AND status IN ('paid', 'failed')
  AND type = 'payment';

DELETE FROM public.timeline_events
WHERE type IN ('payment_succeeded', 'payment_failed')
  AND (
    description = 'Payment of $0.00 succeeded'
    OR description = 'Payment of $0.00 failed'
    OR description = 'Charged current balance of $0.00 when autopay started'
    OR description = 'Current balance charge of $0.00 failed'
  );

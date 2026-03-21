

# Combined Implementation Plan

## What's Pending

Three approved plans have accumulated. Here's everything that needs to be built:

### A. Machine Assignment Bug Fix (line 99 in RenterDetail.tsx)
The code sets `status: "rented"` but the database constraint only allows `available`, `assigned`, `maintenance`, `retired`. Change to `"assigned"`.

### B. Autopay Error Handling
The `supabase.functions.invoke` error object doesn't expose the edge function's JSON body. Need to parse the response to show real error messages like "No payment method on file" instead of generic "non-2xx".

### C. Email Reminder Customization

**Database migration** — add 10 columns to `operator_settings`:
- `email_reminders_enabled` (boolean, default true)
- `reminder_upcoming_enabled`, `reminder_failed_enabled`, `reminder_latefee_enabled` (booleans, default true)
- `business_name` (text, default 'LaundryLord')
- `template_upcoming_subject`, `template_upcoming_body` (text with defaults)
- `template_failed_subject`, `template_failed_body` (text with defaults)
- `template_latefee_subject`, `template_latefee_body` (text with defaults)

**Settings UI** — new "Email Reminders" card with:
- Master toggle + business name input
- 3 collapsible sections (upcoming, failed, late fee) each with enable toggle, subject input, body textarea
- Variable reference: `{name}`, `{amount}`, `{due_date}`, `{balance}`, `{late_fee}`, `{days_late}`, `{business_name}`
- "Reset to Default" per template

**Edge function update** — `send-billing-reminders` reads operator templates, performs variable substitution, respects enable/disable toggles.

**Hook update** — extend `useSaveOperatorSettings` mutation type to include the new fields.

### D. Setup Checklist in Settings
Small section showing: Stripe key status, webhook note, email domain status.

## Build Order

1. Database migration (email template columns)
2. Fix machine assignment status (`"rented"` → `"assigned"`)
3. Fix autopay error extraction in RenterDetail
4. Update `useSaveOperatorSettings` for new fields
5. Add Email Reminders card + Setup Checklist to Settings page
6. Update `send-billing-reminders` edge function to use templates
7. Redeploy edge functions

## Files Changed

- `supabase/migrations/` — new migration
- `src/pages/RenterDetail.tsx` — fix line 99, fix error handling
- `src/hooks/useSupabaseData.ts` — extend settings mutation type
- `src/pages/SettingsPage.tsx` — add email reminders card + setup checklist
- `supabase/functions/send-billing-reminders/index.ts` — template support


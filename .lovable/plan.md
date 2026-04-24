# Reduce Lovable Cloud usage — findings & plan

## Findings (live project, not just repo)

### 1. Cron jobs (live)

Two active cron jobs in `cron.job`:

| Job | Schedule | Status |
|---|---|---|
| `send-billing-reminders-daily` | `0 9 * * *` (daily 9 AM UTC) | Active, correct |
| `process-email-queue` | **every 5 seconds** | Active, **wasteful** |

No duplicate/old jobs.

`process-email-queue` ran **120,585 times in the last 7 days** (~17,200/day). Each run executes:
- a vault decrypt of `email_queue_service_role_key`
- a SELECT on `email_send_state`
- a `net.http_post` to the edge function
- inside the function: more SELECTs on `email_send_state`, plus `pgmq.read` on both queues

This is almost certainly the dominant Database Server cost.

### 2. Queue usage (live)

| Metric | Count |
|---|---|
| Pending in `auth_emails` | **0** |
| Pending in `transactional_emails` | **0** |
| Archived in `auth_emails` | **0** |
| Archived in `transactional_emails` | **0** |
| Rows ever in `email_send_log` | **0** |

The queues have **never been used**. Not idle — completely unused since infrastructure was set up.

### 3. Does anything depend on the queue?

Repo-wide grep for `enqueue_email`, `auth_emails`, `transactional_emails`, `process-email-queue`, `auth-email-hook`, `send-transactional-email`: **zero matches**.

- **Signup confirmation, password reset, magic link**: handled by Supabase native auth email delivery. No `auth-email-hook` is deployed, no auth hook is configured in `config.toml`. The queue is **not** in the auth path.
- **Billing reminders**: `send-billing-reminders` calls `https://api.lovable.dev/v1/email/send` directly via `fetch`. Bypasses the queue entirely.
- **App-owned transactional emails**: none exist. No `send-transactional-email` function, no templates, no callers.

**Conclusion: nothing in the app uses this queue. Disabling it cannot break auth, signup, password reset, portal, or billing reminders.**

### 4. Cloud-usage waste

- **No-op invocations**: ~17,200/day × queries per run (vault decrypt + state SELECT + 2× pgmq.read + state SELECT in function) ≈ 80–100k+ DB ops/day for nothing.
- **No log writes** on no-op (function only writes on send/fail), so waste is purely reads + cron bookkeeping in `cron.job_run_details`.
- **No retry/DLQ loops** — queues are empty.
- **Frontend polling**: not investigated yet; the cron alone explains the bulk of the bill. Recommend a follow-up pass on `useSupabaseData` / `useSubscription` if usage stays high after this fix.

## Recommended plan

### Immediate safe change (low risk, high impact)

**Unschedule `process-email-queue`** by deleting (or deactivating) cron job `jobid = 2`. Leave the edge function deployed and the queues/tables in place — they're inert without the cron.

```sql
SELECT cron.unschedule('process-email-queue');
```

Expected impact: Database Server usage drops sharply within hours. Nothing else changes.

### 1-day validation check

After 24 hours, verify:
- Auth flows still work (signup, password reset, magic link) — they never used the queue, but confirm with one manual test each.
- `send-billing-reminders` ran at 9 AM UTC and sent its emails (`cron.job_run_details` for jobid 1, plus spot-check a renter).
- `email_send_log` still has 0 rows (confirms nothing silently started enqueuing).
- Lovable Cloud usage graph shows the expected drop in Database Server activity.

### Medium-term cleaner architecture

Two options, pick when convenient — not urgent:

1. **Remove the dead infrastructure** (preferred, less surface area):
   - Delete the `process-email-queue` edge function.
   - Drop pgmq queues `auth_emails`, `transactional_emails` and their archives.
   - Drop tables `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`.
   - Drop RPCs `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.
   - Remove the vault secret `email_queue_service_role_key`.

2. **Keep it dormant** for future use:
   - Leave everything as-is, just unscheduled. Re-enable with a slow cron (e.g. every 5 minutes) only when an actual sender is wired up.

If app-owned transactional emails are ever needed, re-enable with a **per-event trigger** (edge function called from the action site) plus a **slow safety-net cron** (every 1–5 minutes), not every 5 seconds.

### Risks

- **Negligible.** The queue has never carried a message and nothing in the codebase enqueues to it. Auth emails go through Supabase directly; billing reminders bypass the queue.
- The only theoretical risk is a future Lovable platform change that starts routing auth emails through the local queue without an `auth-email-hook` being deployed — not how the system works today.

### Rollback plan

Recreating the cron is one statement. Keep this snippet ready:

```sql
SELECT cron.schedule(
  'process-email-queue',
  '5 seconds',
  $$
  SELECT CASE
    WHEN (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now()
      THEN NULL
    ELSE net.http_post(
        url := 'https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/process-email-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'email_queue_service_role_key'
          )
        ),
        body := '{}'::jsonb
      )
  END;
  $$
);
```

Rollback takes <1 minute and restores prior behavior exactly.

## Recommended next step

Approve the immediate change (unschedule jobid 2). I'll apply it via a migration, then we wait 24h and confirm Cloud usage drops before deciding whether to also tear down the dormant infrastructure.

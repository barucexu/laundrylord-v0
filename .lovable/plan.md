Inspect the current LaundryLord repo first, then implement the smallest safe diff to make Bruce/LaundryLord SaaS billing boring, correct, and hard to misunderstand.

&nbsp;

This pass is only about PLATFORM SaaS billing (Bruce charging operators). Do not modify operator->renter billing flows.

&nbsp;

Hard constraints:

- Preserve separation:

  - Operator -> renter billing uses each operator’s own Stripe key / stripe_keys flow

  - Bruce/LaundryLord platform -> operator SaaS billing uses platform STRIPE_SECRET_KEY

- Do not modify these renter billing functions:

  - supabase/functions/create-setup-link/index.ts

  - supabase/functions/create-subscription/index.ts

  - supabase/functions/stripe-webhook/index.ts

- Do not broaden scope into renter billing cleanup

- Smallest safe diff only

&nbsp;

What I want this feature to do, clearly:

&nbsp;

1. Billable-count / plan logic

- Keep the current billable-count philosophy and threshold behavior exactly as intended now:

  - billable count should remain archive-aware

  - current threshold/next-renter upgrade trigger behavior should stay intact

- Do not change the tier ladder or tier boundaries in this pass

- Do not change the archive cooldown concept in this pass unless absolutely necessary

&nbsp;

2. First-time paid subscription

- If an operator is entering a paid plan for the first time, use Stripe Checkout

- They should be charged the intended full monthly amount upfront

- Do not allow accidental "$0 due today" behavior caused by stale/orphaned SaaS customer credit to silently make a first paid subscription free

- But do NOT blindly wipe or override legitimate Stripe credit without inspecting first

- Use the safest, most transparent handling for Stripe customer balance / credit edge cases

&nbsp;

3. Mid-cycle upgrades

- For operators already on a paid SaaS subscription, use Stripe-native subscription update behavior with proration

- Do not cancel-and-recreate if Stripe-native upgrade with proration can handle this cleanly

- No custom manual billing math

- No duplicate subscriptions

- Keep the renewal date in the cleanest Stripe-native way

&nbsp;

4. Upgrade UX

- Keep exact-tier selection UX from banner / settings / blocked-action surfaces

- Route each surface through the correct flow:

  - first-time paid -> Checkout

  - existing paid subscriber upgrade -> Stripe-native subscription update/proration flow

- I care more about correct billing behavior than whether the surface is checkout vs portal vs API update

- Keep the UX calm and premium

-Ensure the Laundrylord (my customer) is told clearly that they will be billed whatever the calculated amount is. Perhaps a pop-up where they must click confirm or something like that. Make it for sure more official, since they are spending more money.

&nbsp;

5. Enforcement

- Keep the current client-side UX gating

- Add server-side authoritative enforcement for renter creation/import paths so plan limits cannot be bypassed through direct insert/import paths

- Preserve current product intent around add-renter/add-machine gating unless you find a concrete inconsistency

- Do not create harsh lockouts for existing data; just stop over-limit additions

&nbsp;

6. Archive-aware behavior

- Keep archive/unarchive and archive cooldown logic coherent with billing/enforcement

- Do not change the overall archive policy in this pass

- Just make sure enforcement and billing count stay consistent with the current implementation intent

&nbsp;

Important implementation philosophy:

- Prefer boring correctness over cleverness

- Prefer one canonical first-time paid path, one canonical upgrade path, and one canonical billable-count rule

- Preserve working renter billing flows

- Preserve Stripe account separation

- Use Stripe-native behavior wherever possible

- Avoid hidden billing surprises

- Avoid broad rewrites

&nbsp;

Verification checklist required in output:

- first-time paid checkout charges expected amount and does not accidentally become free from stale/orphaned SaaS credit

- existing paid-plan upgrade uses Stripe-native proration

- no duplicate SaaS subscriptions are created

- renewal amount/date after upgrade are correct

- threshold/next-renter upgrade trigger behavior remains correct

- archive/unarchive remains coherent with billable enforcement

- add renter / add machine / renter import cannot bypass plan enforcement through direct client paths

- renter billing flows remain untouched

- SaaS billing still uses Bruce’s platform Stripe only

- operator renter billing still uses operator Stripe only
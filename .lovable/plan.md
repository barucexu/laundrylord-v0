You are modifying the LaundryLord repo. Implement the smallest safe, production-ready fixes for SaaS plan enforcement and plan UX, without breaking renter billing flows.

PRIMARY GOAL

Make pricing enforcement reliable, hard to game, and predictable.

NON-GOALS

- Do not redesign renter billing architecture.

- Do not change operator Stripe key renter-charge flows.

- Do not modify:

  - supabase/functions/create-setup-link/index.ts

  - supabase/functions/create-subscription/index.ts

  - supabase/functions/stripe-webhook/index.ts

- Do not change create-checkout portal/duplicate-subscription behavior in this task unless explicitly required by acceptance tests.

==================================================

A) ANTI-GAMING BILLABLE COUNT (30-DAY COOLDOWN)

==================================================

1) Add/ensure cooldown columns with an idempotent migration:

- renters.archived_at timestamptz nullable

- renters.billable_until timestamptz nullable

Use:

- ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...

2) Archive behavior:

- On archive action:

  - set status = "archived"

  - set archived_at = now()

  - set billable_until = now() + interval '30 days'

- On unarchive action:

  - set status = "closed" (or existing intended non-archived status)

  - DO NOT clear archived_at / billable_until history fields

3) Billable count definition:

- billableCount = non-archived renters + archived renters where billable_until > now()

- activeOperationalCount = non-archived renters only

- Use billableCount for plan enforcement

- Use activeOperationalCount for operational display only

==================================================

B) CENTRALIZE PLAN LOGIC

==================================================

Target files:

- src/lib/pricing-tiers.ts

- src/hooks/useSubscription.ts

In pricing helpers, ensure:

- getTierForCount(count)

- getRequiredTierForCount(count)

- getTierByProductId(productId)

- getNextUpgradeTierForCount(count)

- canFitTier(count, tier)

- shared label helper for upgrade text consistency

In useSubscription:

- Keep one canonical source for enforcement state:

  - billableCount

  - activeOperationalCount

  - requiredTier (by billableCount)

  - currentBilledTier (from subscription product_id when subscribed)

  - effectiveTier

- checkout(targetPriceId?) must accept explicit target plan ID

- canAddRenter logic must use billableCount, not operational count

Canonical enforcement rules:

- Free tier: allow if billableCount < free.max

- Paid required + unsubscribed: block renter creates/imports

- Paid required + subscribed: allow if billableCount < effectiveTier.max

==================================================

C) FIX KNOWN UX/LOOPHOLES

==================================================

1) Boundary CTA bug (10/24/49/etc)

Files:

- src/pages/RentersList.tsx

- src/pages/MachinesList.tsx

- src/components/PlanBanner.tsx

Requirements:

- blocked state must use next upgrade target tier (not current tier)

- CTA must stay visible/actionable at boundaries:

  - 10 -> Starter

  - 24 -> Growth

  - 49 -> Pro

- loading state stays neutral (no misleading tier label while loading)

2) Import parity

File:

- src/pages/ImportPage.tsx

Requirements:

- Use canonical enforcement from useSubscription

- Do not rely only on slotsAvailable math

- For any cap math, use billableCount (not non-archived-only count)

- Paid required + unsubscribed => block renter imports

- Machines-only import remains unaffected

- Preserve blockedByPlan reporting

==================================================

D) SETTINGS PLAN UX (ALWAYS AVAILABLE, CLEAR)

==================================================

File:

- src/pages/SettingsPage.tsx

Requirements:

1) Always show:

- current billed plan

- required plan by usage

- billableCount and activeOperationalCount

- compact line: “Archived renters count toward billing for 30 days.”

2) Always show change-plan controls:

- Plan grid/list always visible

- If billableCount exceeds target tier max: disable that option and show reason

- Upgrade targets remain selectable when valid

3) Action behavior:

- Keep top-level Manage billing button for portal

- Plan selection actions should use checkout(targetPriceId) for explicit paid-tier selection

- Avoid mixed/ambiguous CTA behavior

==================================================

E) MINIMAL CUSTOMER COMMUNICATION

==================================================

Add wording in exactly two places:

1) Archive confirm/action context in renter detail:

   “Archived renters remain billable for 30 days.”

2) Settings plan helper line:

   “Archived renters count toward billing for 30 days.”

No extra global warning banners/toasts.

==================================================

F) ACCEPTANCE CRITERIA (MUST PASS)

==================================================

Boundary CTA:

- billableCount=10 => blocked + Starter CTA visible/clickable

- 24 => Growth CTA

- 49 => Pro CTA

- no misleading tier flash during loading

Anti-gaming:

- archive today does not immediately reduce billable enforcement

- unarchive before cooldown expiry does not create loophole

- archived renters older than 30 days no longer count billable

Import parity:

- Free at 9 importing 3 => 1 created, 2 blocked

- Paid required + unsubscribed => renter imports blocked

- Paid required + subscribed near cap => only up to cap created

- Machines-only import unaffected

Settings:

- current billed and required plan both visible

- billable + active counts visible

- disabled downgrade/plan options explain why when out of range

- plan selection opens explicit target checkout path

Regression safety:

- add renter/machine hard-stops still work

- renter billing setup/subscription/webhook flows untouched

==================================================

G) QA OUTPUT REQUIRED

==================================================

After implementation, provide:

1) Changed files + reason for each

2) Migration summary (idempotent column additions)

3) Manual QA checklist covering:

   - boundaries: 10/24/49/74/99

   - archive immediate vs >30 days

   - unarchive before cooldown expiry

   - paid-unsubscribed import attempts

4) Explicit pass/fail for:

   - boundary CTA always actionable

   - archive gaming blocked

   - import cannot bypass paid-tier subscription requirement

   - settings messaging clear and minimal
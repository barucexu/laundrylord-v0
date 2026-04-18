export interface SaasUpgradePreview {
  amountDueNow: number;
  currentPlanName: string | null;
  targetPlanName: string | null;
  nextRenewalAmount: number | null;
  unusedTimeCredit: number;
  proratedCharge: number;
  currency: string;
  isCredit: boolean;
  prorationDate: number | null;
}

type RawSaasUpgradePreview = {
  amount_due_now?: number | null;
  amountDueNow?: number | null;
  current_plan_name?: string | null;
  currentPlanName?: string | null;
  target_plan_name?: string | null;
  targetPlanName?: string | null;
  next_renewal_amount?: number | null;
  nextRenewalAmount?: number | null;
  unused_time_credit?: number | null;
  unusedTimeCredit?: number | null;
  prorated_charge?: number | null;
  proratedCharge?: number | null;
  currency?: string | null;
  is_credit?: boolean | null;
  isCredit?: boolean | null;
  proration_date?: number | null;
  prorationDate?: number | null;
};

function toFiniteNumber(value: number | null | undefined, fallback = 0): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function normalizeSaasUpgradePreview(preview: RawSaasUpgradePreview | null | undefined): SaasUpgradePreview | null {
  if (!preview) return null;

  return {
    amountDueNow: toFiniteNumber(preview.amountDueNow ?? preview.amount_due_now),
    currentPlanName: preview.currentPlanName ?? preview.current_plan_name ?? null,
    targetPlanName: preview.targetPlanName ?? preview.target_plan_name ?? null,
    nextRenewalAmount: Number.isFinite(preview.nextRenewalAmount ?? preview.next_renewal_amount)
      ? Number(preview.nextRenewalAmount ?? preview.next_renewal_amount)
      : null,
    unusedTimeCredit: toFiniteNumber(preview.unusedTimeCredit ?? preview.unused_time_credit),
    proratedCharge: toFiniteNumber(preview.proratedCharge ?? preview.prorated_charge),
    currency: preview.currency ?? "usd",
    isCredit: Boolean(preview.isCredit ?? preview.is_credit),
    prorationDate: Number.isFinite(preview.prorationDate ?? preview.proration_date)
      ? Number(preview.prorationDate ?? preview.proration_date)
      : null,
  };
}

export function formatCurrency(amount: number, currency = "usd"): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(safeAmount);
}

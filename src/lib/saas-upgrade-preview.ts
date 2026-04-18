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

export function formatCurrency(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

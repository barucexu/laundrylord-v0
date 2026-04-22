export type CurrentBalanceStatus = "none" | "paid" | "processing";
export type AutopayState = "active" | "pending";

export interface AutopayActivationResult {
  already_active?: boolean;
  charged_current_balance?: boolean;
  current_balance_status?: CurrentBalanceStatus;
  autopay_state?: AutopayState;
  next_due?: string | null;
}

export function getAutopayActivationMessage(result: AutopayActivationResult): string {
  if (result.already_active) {
    return "Autopay is already active for this renter.";
  }

  const nextDue = result.next_due ?? "—";

  if (result.autopay_state === "pending" || result.current_balance_status === "processing") {
    return `Autopay setup started. Bank payment is processing. Autopay will activate after confirmation. Next recurring charge: ${nextDue}`;
  }

  if (result.charged_current_balance || result.current_balance_status === "paid") {
    return `Autopay started and current balance charged. Next recurring charge: ${nextDue}`;
  }

  return `Autopay started. Next recurring charge: ${nextDue}`;
}

export function getAchProcessingExplanation(): string {
  return "Bank payment is still processing. Autopay will activate after confirmation. If Stripe later reports the payment failed, keep the renter out of autopay and let the operator retry cleanly.";
}

export function getProjectedNextRecurringDate(
  leaseStartDate: string | null | undefined,
  now: Date = new Date(),
): string {
  let anchorDay = now.getUTCDate();

  if (leaseStartDate) {
    const parsed = new Date(`${leaseStartDate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      anchorDay = parsed.getUTCDate();
    }
  }

  const normalizedAnchorDay = Math.min(anchorDay, 28);
  const candidateThisMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    normalizedAnchorDay,
  ));

  const nextChargeDate = candidateThisMonth.getTime() > now.getTime()
    ? candidateThisMonth
    : new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      normalizedAnchorDay,
    ));

  return nextChargeDate.toISOString().split("T")[0];
}

export function formatProjectedRecurringCharge(
  monthlyRate: number | string | null | undefined,
  nextDueDate: string | null | undefined,
): string {
  return `$${Number(monthlyRate ?? 0).toFixed(2)} on ${nextDueDate ?? "—"}`;
}

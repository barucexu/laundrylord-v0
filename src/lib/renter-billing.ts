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

export type CurrentBalanceStatus = "none" | "paid" | "processing";

export interface AutopayActivationResult {
  already_active?: boolean;
  charged_current_balance?: boolean;
  current_balance_status?: CurrentBalanceStatus;
  next_due?: string | null;
}

export function getAutopayActivationMessage(result: AutopayActivationResult): string {
  if (result.already_active) {
    return "Autopay is already active for this renter.";
  }

  const nextDue = result.next_due ?? "—";

  if (result.current_balance_status === "processing") {
    return `Autopay started. Current balance payment is processing. Next recurring charge: ${nextDue}`;
  }

  if (result.charged_current_balance || result.current_balance_status === "paid") {
    return `Autopay started and current balance charged. Next recurring charge: ${nextDue}`;
  }

  return `Autopay started. Next recurring charge: ${nextDue}`;
}

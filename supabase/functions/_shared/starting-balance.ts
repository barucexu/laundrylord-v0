export type StartingBalanceAction = "paid" | "processing" | "pay" | "failed";

export function getStartingBalanceAction(
  invoiceStatus: string | null | undefined,
  paymentIntentStatus: string | null | undefined,
): StartingBalanceAction {
  if (invoiceStatus === "paid") {
    return "paid";
  }

  if (paymentIntentStatus === "processing") {
    return "processing";
  }

  if (invoiceStatus === "open") {
    return "pay";
  }

  return "failed";
}

export type StartingBalanceAction = "paid" | "processing" | "pay" | "failed";
export type StartingBalanceStatus = "paid" | "processing" | "failed";

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

export function getStartingBalanceStatus(
  action: StartingBalanceAction,
  isBankAccountPaymentMethod: boolean,
): StartingBalanceStatus {
  if (action === "paid") {
    return isBankAccountPaymentMethod ? "processing" : "paid";
  }

  if (action === "processing") {
    return "processing";
  }

  return "failed";
}

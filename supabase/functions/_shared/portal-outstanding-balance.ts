export const PORTAL_OUTSTANDING_BALANCE_PURPOSE = "portal_outstanding_balance";

export type PortalMetadataLike = Record<string, string | undefined> | null | undefined;

export function getPortalOutstandingBalanceAmountCents(balance: number | null | undefined): number {
  const amountCents = Math.round(Number(balance ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Outstanding balance must be greater than zero.");
  }
  return amountCents;
}

export function hasPortalOutstandingBalancePurpose(metadata: PortalMetadataLike): boolean {
  return metadata?.portal_action === PORTAL_OUTSTANDING_BALANCE_PURPOSE;
}

export function getPortalOutstandingBalanceMetadata(args: {
  renterId: string;
  userId: string;
}): Record<string, string> {
  return {
    renter_id: args.renterId,
    user_id: args.userId,
    portal_action: PORTAL_OUTSTANDING_BALANCE_PURPOSE,
  };
}

export function getStripeObjectId(value: string | { id?: string | null } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

export function buildPortalReturnUrl(origin: string, token: string, result: "success" | "canceled"): string {
  return `${origin.replace(/\/$/, "")}/portal/${token}?payment=${result}`;
}

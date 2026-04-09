export const BILLABLE_RENTER_COUNT_QUERY_KEY = ["renters", "billable-count"] as const;

export type BillableRenterLike = {
  status: string | null;
  billable_until: string | null;
};

export function isBillableRenter(renter: BillableRenterLike, now: Date): boolean {
  if (renter.status !== "archived") return true;
  if (!renter.billable_until) return false;

  return new Date(renter.billable_until).getTime() > now.getTime();
}

export function countBillableRenters(renters: BillableRenterLike[], now: Date): number {
  return renters.filter((renter) => isBillableRenter(renter, now)).length;
}

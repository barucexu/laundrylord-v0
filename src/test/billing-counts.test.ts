import { describe, expect, it } from "vitest";
import { countBillableRenters, isBillableRenter, type BillableRenterLike } from "@/lib/billing-counts";

const now = new Date("2026-04-09T12:00:00.000Z");
const future = "2026-04-10T12:00:00.000Z";
const past = "2026-04-08T12:00:00.000Z";

function renter(status: string, billableUntil: string | null = null): BillableRenterLike {
  return {
    status,
    billable_until: billableUntil,
  };
}

describe("billing counts", () => {
  it("counts active and other non-archived renters", () => {
    expect(isBillableRenter(renter("active"), now)).toBe(true);
    expect(isBillableRenter(renter("closed", future), now)).toBe(true);
  });

  it("counts archived renters inside the 30-day billable window", () => {
    expect(isBillableRenter(renter("archived", future), now)).toBe(true);
  });

  it("does not count archived renters after the billable window expires", () => {
    expect(isBillableRenter(renter("archived", past), now)).toBe(false);
  });

  it("does not count archived renters without a billable-until timestamp", () => {
    expect(isBillableRenter(renter("archived", null), now)).toBe(false);
  });

  it("counts an unarchived renter inside the old archive window only once", () => {
    expect(countBillableRenters([renter("closed", future)], now)).toBe(1);
  });

  it("counts an unarchived renter after the old archive window as active again", () => {
    expect(countBillableRenters([renter("closed", past)], now)).toBe(1);
  });

  it("combines active renters with only still-billable archived renters", () => {
    expect(
      countBillableRenters([
        renter("active"),
        renter("lead"),
        renter("archived", future),
        renter("archived", past),
        renter("archived", null),
      ], now),
    ).toBe(3);
  });
});

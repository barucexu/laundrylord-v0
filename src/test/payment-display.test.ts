import { describe, expect, it } from "vitest";
import { getPaymentTypeLabel } from "@/lib/payment-display";

describe("getPaymentTypeLabel", () => {
  it("formats the new persisted payment type as Payment", () => {
    expect(getPaymentTypeLabel("payment")).toBe("Payment");
  });

  it("keeps legacy rent labels intact for older rows", () => {
    expect(getPaymentTypeLabel("rent")).toBe("Rent");
  });
});

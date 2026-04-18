import { describe, expect, it } from "vitest";
import { getAutopayActivationMessage } from "@/lib/renter-billing";

describe("getAutopayActivationMessage", () => {
  it("returns the paid message when the current balance was collected", () => {
    expect(
      getAutopayActivationMessage({
        charged_current_balance: true,
        current_balance_status: "paid",
        next_due: "2026-05-01",
      }),
    ).toBe("Autopay started and current balance charged. Next recurring charge: 2026-05-01");
  });

  it("returns the processing message when an ACH payment is still settling", () => {
    expect(
      getAutopayActivationMessage({
        current_balance_status: "processing",
        next_due: "2026-05-01",
      }),
    ).toBe("Autopay started. Current balance payment is processing. Next recurring charge: 2026-05-01");
  });

  it("returns the simple message when there is no starting balance charge", () => {
    expect(
      getAutopayActivationMessage({
        current_balance_status: "none",
        next_due: "2026-05-01",
      }),
    ).toBe("Autopay started. Next recurring charge: 2026-05-01");
  });
});

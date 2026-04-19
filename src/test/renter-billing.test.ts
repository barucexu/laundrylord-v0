import { describe, expect, it } from "vitest";
import { getAchProcessingExplanation, getAutopayActivationMessage } from "@/lib/renter-billing";

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
        autopay_state: "pending",
        current_balance_status: "processing",
        next_due: "2026-05-01",
      }),
    ).toBe("Autopay setup started. Bank payment is processing. Autopay will activate after confirmation. Next recurring charge: 2026-05-01");
  });

  it("returns the simple message when there is no starting balance charge", () => {
    expect(
      getAutopayActivationMessage({
        current_balance_status: "none",
        next_due: "2026-05-01",
      }),
    ).toBe("Autopay started. Next recurring charge: 2026-05-01");
  });

  it("explains ACH processing in founder-friendly language", () => {
    expect(getAchProcessingExplanation()).toContain("Bank payment is still processing.");
    expect(getAchProcessingExplanation()).toContain("Autopay will activate after confirmation.");
  });
});

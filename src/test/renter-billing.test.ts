import { describe, expect, it } from "vitest";
import { formatProjectedRecurringCharge, getAchProcessingExplanation, getAutopayActivationMessage, getProjectedNextRecurringDate } from "@/lib/renter-billing";

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

describe("pending autopay recurring charge projection", () => {
  it("projects the next monthly charge from the rental start day", () => {
    expect(getProjectedNextRecurringDate("2026-04-18", new Date("2026-04-21T12:00:00Z"))).toBe("2026-05-18");
  });

  it("formats the pending charge with amount and date", () => {
    expect(formatProjectedRecurringCharge(70, "2026-05-18")).toBe("$70.00 on 2026-05-18");
  });
});

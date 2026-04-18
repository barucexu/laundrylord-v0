import { describe, expect, it } from "vitest";
import { formatCurrency, normalizeSaasUpgradePreview } from "@/lib/saas-upgrade-preview";

describe("normalizeSaasUpgradePreview", () => {
  it("maps the backend snake_case payload into the dialog shape", () => {
    expect(normalizeSaasUpgradePreview({
      amount_due_now: 41.5,
      current_plan_name: "Growth",
      target_plan_name: "Pro",
      next_renewal_amount: 99,
      unused_time_credit: 7.5,
      prorated_charge: 49,
      currency: "usd",
      is_credit: false,
      proration_date: 123,
    })).toEqual({
      amountDueNow: 41.5,
      currentPlanName: "Growth",
      targetPlanName: "Pro",
      nextRenewalAmount: 99,
      unusedTimeCredit: 7.5,
      proratedCharge: 49,
      currency: "usd",
      isCredit: false,
      prorationDate: 123,
    });
  });

  it("guards against non-finite values so the UI never renders NaN", () => {
    const preview = normalizeSaasUpgradePreview({
      amount_due_now: Number.NaN,
      next_renewal_amount: Number.NaN,
      currency: "usd",
    });

    expect(preview?.amountDueNow).toBe(0);
    expect(preview?.nextRenewalAmount).toBeNull();
    expect(formatCurrency(Number.NaN, "usd")).toBe("$0.00");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpgradeConfirmDialog } from "@/components/UpgradeConfirmDialog";

describe("UpgradeConfirmDialog", () => {
  it("shows the Stripe-backed preview details when available", () => {
    render(
      <UpgradeConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        tierName="Pro"
        tierLabel="$99/mo"
        isUpgrade={true}
        loading={false}
        preview={{
          amountDueNow: 41.5,
          currentPlanName: "Growth",
          targetPlanName: "Pro",
          nextRenewalAmount: 99,
          unusedTimeCredit: 7.5,
          proratedCharge: 49,
          currency: "usd",
          isCredit: false,
          prorationDate: 123,
        }}
        previewLoading={false}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Amount due today: $41.50.")).toBeInTheDocument();
    expect(screen.getByText("Includes a $7.50 credit for unused time on your current plan.")).toBeInTheDocument();
    expect(screen.getByText("Includes $49.00 in proration adjustments.")).toBeInTheDocument();
    expect(screen.getByText("Your next full renewal will be $99.00.")).toBeInTheDocument();
  });
});

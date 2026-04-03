import { describe, expect, it } from "vitest";
import { TIERS } from "@/lib/pricing-tiers";
import { resolveSubscriptionCapacity } from "@/hooks/useSubscription";

describe("resolveSubscriptionCapacity", () => {
  const freeTier = TIERS.find((tier) => tier.name === "Free")!;
  const starterTier = TIERS.find((tier) => tier.name === "Starter")!;

  it("blocks free users at 10 billable renters and points them to Starter", () => {
    const result = resolveSubscriptionCapacity({
      billableCount: 10,
      subscribed: false,
      currentBilledTier: null,
      requiredTier: freeTier,
    });

    expect(result.capacityTier.name).toBe("Free");
    expect(result.canAddRenter).toBe(false);
    expect(result.nextUpgradeTier?.name).toBe("Starter");
  });

  it("lets Starter subscribers add renters until they hit 24", () => {
    const result = resolveSubscriptionCapacity({
      billableCount: 10,
      subscribed: true,
      currentBilledTier: starterTier,
      requiredTier: freeTier,
    });

    expect(result.capacityTier.name).toBe("Starter");
    expect(result.canAddRenter).toBe(true);
    expect(result.nextUpgradeTier).toBeNull();
  });

  it("blocks Starter subscribers at 24 billable renters and points them to Growth", () => {
    const result = resolveSubscriptionCapacity({
      billableCount: 24,
      subscribed: true,
      currentBilledTier: starterTier,
      requiredTier: starterTier,
    });

    expect(result.capacityTier.name).toBe("Starter");
    expect(result.canAddRenter).toBe(false);
    expect(result.nextUpgradeTier?.name).toBe("Growth");
  });
});

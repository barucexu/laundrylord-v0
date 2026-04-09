import { describe, expect, it } from "vitest";
import { getRequiredTierForCount, TIERS } from "@/lib/pricing-tiers";
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

  it("blocks unsubscribed users over the free cap and points them to the required paid tier", () => {
    const result = resolveSubscriptionCapacity({
      billableCount: 11,
      subscribed: false,
      currentBilledTier: null,
      requiredTier: getRequiredTierForCount(11),
    });

    expect(result.requiredTier.name).toBe("Starter");
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

  it.each([
    { count: 10, current: "Free", next: "Starter" },
    { count: 24, current: "Starter", next: "Growth" },
    { count: 49, current: "Growth", next: "Pro" },
    { count: 74, current: "Pro", next: "Scale" },
    { count: 99, current: "Scale", next: "Business" },
    { count: 199, current: "Business", next: "Enterprise" },
    { count: 399, current: "Enterprise", next: "Portfolio" },
    { count: 699, current: "Portfolio", next: "Empire" },
    { count: 999, current: "Empire", next: "Ultimate" },
  ])("blocks $current subscribers at $count billable renters and points them to $next", ({ count, current, next }) => {
    const currentBilledTier = TIERS.find((tier) => tier.name === current)!;
    const result = resolveSubscriptionCapacity({
      billableCount: count,
      subscribed: current !== "Free",
      currentBilledTier: current === "Free" ? null : currentBilledTier,
      requiredTier: getRequiredTierForCount(count),
    });

    expect(result.capacityTier.name).toBe(current);
    expect(result.canAddRenter).toBe(false);
    expect(result.nextUpgradeTier?.name).toBe(next);
  });

  it("keeps Ultimate unlimited at and beyond 1000 billable renters", () => {
    const ultimateTier = TIERS.find((tier) => tier.name === "Ultimate")!;

    for (const count of [1000, 1500]) {
      const result = resolveSubscriptionCapacity({
        billableCount: count,
        subscribed: true,
        currentBilledTier: ultimateTier,
        requiredTier: getRequiredTierForCount(count),
      });

      expect(result.capacityTier.name).toBe("Ultimate");
      expect(result.canAddRenter).toBe(true);
      expect(result.nextUpgradeTier).toBeNull();
    }
  });
});

/**
 * Centralized SaaS pricing tiers for LaundryLord.
 * Used by PricingCalculator, useSubscription, PlanBanner, and edge functions.
 */

export interface PricingTier {
  name: string;
  min: number;
  max: number;          // Infinity for custom
  price: number;        // monthly USD, 0 = free, -1 = custom
  label: string;
  product_id?: string;
  price_id?: string;
}

export const TIERS: PricingTier[] = [
  { name: "Free",       min: 1,    max: 10,       price: 0,    label: "Free" },
  { name: "Starter",    min: 11,   max: 24,       price: 29,   label: "$29/mo",   product_id: "prod_UEEy3RgIQPQOGZ", price_id: "price_1TFmUg7o90tJn3krILvYLKBP" },
  { name: "Growth",     min: 25,   max: 49,       price: 49,   label: "$49/mo",   product_id: "prod_UEEyoVnhxLF3vy", price_id: "price_1TFmUh7o90tJn3krlGQuqdiu" },
  { name: "Pro",        min: 50,   max: 74,       price: 99,   label: "$99/mo",   product_id: "prod_UEEyKtssPt0430", price_id: "price_1TFmUi7o90tJn3krfXA6KgB2" },
  { name: "Scale",      min: 75,   max: 99,       price: 129,  label: "$129/mo",  product_id: "prod_UEEygRRU9opKwW", price_id: "price_1TFmUj7o90tJn3krsJq0qv9N" },
  { name: "Business",   min: 100,  max: 199,      price: 199,  label: "$199/mo",  product_id: "prod_UEEyrzDO6LUlgl", price_id: "price_1TFmUk7o90tJn3kr0GNbTYIg" },
  { name: "Enterprise", min: 200,  max: 399,      price: 299,  label: "$299/mo",  product_id: "prod_UEEyuMGKTuzhYF", price_id: "price_1TFmUl7o90tJn3krfybZEO7K" },
  { name: "Portfolio",  min: 400,  max: 699,      price: 499,  label: "$499/mo",  product_id: "prod_UEEyc2En1L0HBs", price_id: "price_1TFmUn7o90tJn3krki0r0xmT" },
  { name: "Empire",     min: 700,  max: 999,      price: 799,  label: "$799/mo",  product_id: "prod_UEEyriCh6VhS2S", price_id: "price_1TFmUo7o90tJn3krKsZmjhAk" },
  { name: "Ultimate",   min: 1000, max: Infinity, price: 999,  label: "$999/mo",  product_id: "prod_UEEyMlX4QNETsG", price_id: "price_1TFmUo7o90tJn3krdi8mb7pZ" },
];

/** Returns the tier matching a given total renter count (all statuses). */
export function getTierForCount(totalRenters: number): PricingTier {
  return TIERS.find((t) => totalRenters >= t.min && totalRenters <= t.max) ?? TIERS[0];
}

export function getRequiredTierForCount(totalRenters: number): PricingTier {
  return getTierForCount(totalRenters);
}

export function getTierByProductId(productId: string | null | undefined): PricingTier | null {
  if (!productId) return null;
  return TIERS.find((t) => t.product_id === productId) ?? null;
}

export function getNextUpgradeTierForCount(totalRenters: number): PricingTier | null {
  const current = getTierForCount(totalRenters);
  const idx = TIERS.indexOf(current);
  if (idx === -1) return null;

  // If currently within tier range and already paid, upgrading target is current tier (for unsubscribed flows).
  if (totalRenters < current.max && current.price > 0) return current;

  // At boundary or free tier, target next tier.
  const next = TIERS[idx + 1];
  return next ?? current;
}

export function canFitTier(totalRenters: number, tier: PricingTier): boolean {
  return totalRenters <= tier.max;
}

/** Whether the operator is in a paid tier but may not be subscribed yet. */
export function needsSubscription(totalRenters: number): boolean {
  return totalRenters > 10;
}

/** Consistent upgrade CTA label used across the app. */
export function tierUpgradeLabel(tier: PricingTier): string {
  if (tier.price === 0) {
    // Next tier after free is always Starter
    const starter = TIERS.find((t) => t.name === "Starter");
    return starter ? `Upgrade to ${starter.name} (${starter.label})` : "Upgrade";
  }
  return `Upgrade to ${tier.name} (${tier.label})`;
}

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
  { name: "Starter",    min: 11,   max: 24,       price: 29,   label: "$29/mo",   product_id: "prod_UJ58t9MVJy9kM1", price_id: "price_1TKSxq6ThRF2oI0ePEVOB78i" },
  { name: "Growth",     min: 25,   max: 49,       price: 49,   label: "$49/mo",   product_id: "prod_UJ58vllhfPnDMA", price_id: "price_1TKSxp6ThRF2oI0e6SvsTacu" },
  { name: "Pro",        min: 50,   max: 74,       price: 99,   label: "$99/mo",   product_id: "prod_UJ58WKvIfBSgVF", price_id: "price_1TKSxn6ThRF2oI0emf6Qv0rk" },
  { name: "Scale",      min: 75,   max: 99,       price: 129,  label: "$129/mo",  product_id: "prod_UJ58Un0dqdr1bw", price_id: "price_1TKSxl6ThRF2oI0eVda3nXiN" },
  { name: "Business",   min: 100,  max: 199,      price: 199,  label: "$199/mo",  product_id: "prod_UJ570aXFf4kHyD", price_id: "price_1TKSxj6ThRF2oI0ef8fSmIyV" },
  { name: "Enterprise", min: 200,  max: 399,      price: 299,  label: "$299/mo",  product_id: "prod_UJ57FSgV0zgrlb", price_id: "price_1TKSxh6ThRF2oI0ezlVTH1Iv" },
  { name: "Portfolio",  min: 400,  max: 699,      price: 499,  label: "$499/mo",  product_id: "prod_UJ57tGh0ISMKcj", price_id: "price_1TKSxf6ThRF2oI0e6xk6eK8r" },
  { name: "Empire",     min: 700,  max: 999,      price: 799,  label: "$799/mo",  product_id: "prod_UJ57Jy6PV80WrY", price_id: "price_1TKSxd6ThRF2oI0eqcX1mYga" },
  { name: "Ultimate",   min: 1000, max: Infinity, price: 999,  label: "$999/mo",  product_id: "prod_UJ57nRhlCMzAzY", price_id: "price_1TKSxX6ThRF2oI0exkH7YfC0" },
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
  return `Upgrade to ${tier.name} (${tier.label})`;
}

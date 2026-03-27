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
  { name: "Starter",    min: 11,   max: 24,       price: 29,   label: "$29/mo",   product_id: "prod_UEADMxrVTge3fL", price_id: "price_1TFhtB6kUr5YHbESaGHo9EwX" },
  { name: "Growth",     min: 25,   max: 49,       price: 49,   label: "$49/mo",   product_id: "prod_UEAECHZpkSnOYA", price_id: "price_1TFhta6kUr5YHbESz865Y3Wa" },
  { name: "Pro",        min: 50,   max: 74,       price: 99,   label: "$99/mo",   product_id: "prod_UEAE1m4EwoT4Vo", price_id: "price_1TFhty6kUr5YHbESJxyFAep1" },
  { name: "Scale",      min: 75,   max: 99,       price: 129,  label: "$129/mo",  product_id: "prod_UEAFvf9fkWycsF", price_id: "price_1TFhuW6kUr5YHbESIA5EMqH6" },
  { name: "Business",   min: 100,  max: 199,      price: 199,  label: "$199/mo",  product_id: "prod_UEBHQWS6FJCqgh", price_id: "price_1TFiv76kUr5YHbESLdbuKbw7" },
  { name: "Enterprise", min: 200,  max: 399,      price: 299,  label: "$299/mo",  product_id: "prod_UEBHhj7U5YUIgu", price_id: "price_1TFiv86kUr5YHbESBxRBbrxu" },
  { name: "Portfolio",  min: 400,  max: 699,      price: 499,  label: "$499/mo",  product_id: "prod_UEBH5iiJU3wfyh", price_id: "price_1TFiv96kUr5YHbES9n1XgxBc" },
  { name: "Empire",     min: 700,  max: 999,      price: 799,  label: "$799/mo",  product_id: "prod_UEBH682irBzWNb", price_id: "price_1TFivA6kUr5YHbESVfx0rXhq" },
  { name: "Ultimate",   min: 1000, max: Infinity, price: 999,  label: "$999/mo",  product_id: "prod_UEBHUQixo5jPWU", price_id: "price_1TFivB6kUr5YHbESTA5C8bPC" },
];

/** Returns the tier matching a given total renter count (all statuses). */
export function getTierForCount(totalRenters: number): PricingTier {
  return TIERS.find((t) => totalRenters >= t.min && totalRenters <= t.max) ?? TIERS[0];
}

/** Whether the operator is in a paid tier but may not be subscribed yet. */
export function needsSubscription(totalRenters: number): boolean {
  return totalRenters > 10;
}

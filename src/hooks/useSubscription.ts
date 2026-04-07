import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { TIERS, getNextUpgradeTierForCount, getTierByProductId, type PricingTier } from "@/lib/pricing-tiers";

export interface SubscriptionCapacityState {
  requiredTier: PricingTier;
  currentBilledTier: PricingTier | null;
  effectiveTier: PricingTier;
  capacityTier: PricingTier;
  nextUpgradeTier: PricingTier | null;
  canAddRenter: boolean;
}

type ServerPlan = {
  name: string;
  label: string;
  min: number;
  max: number;
  product_id?: string | null;
  price_id?: string | null;
};

type SubscriptionResponse = {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  current_billed_tier: ServerPlan | null;
  required_tier: ServerPlan | null;
  allowed_capacity: number | null;
  billable_count: number;
  active_operational_count: number;
  billable_archived_count: number;
};

function enrichPlan(plan: ServerPlan | null): PricingTier | null {
  if (!plan) return null;
  const localMatch = getTierByProductId(plan.product_id ?? null) ?? TIERS.find((tier) => tier.name === plan.name);
  return {
    name: plan.name,
    min: plan.min,
    max: plan.max,
    price: localMatch?.price ?? 0,
    label: plan.label,
    product_id: plan.product_id ?? undefined,
    price_id: plan.price_id ?? localMatch?.price_id,
  };
}

export function resolveSubscriptionCapacity({
  billableCount,
  subscribed,
  currentBilledTier,
  requiredTier,
  allowedCapacity,
}: {
  billableCount: number;
  subscribed: boolean;
  currentBilledTier: PricingTier | null;
  requiredTier: PricingTier;
  allowedCapacity?: number | null;
}): SubscriptionCapacityState {
  const effectiveTier = currentBilledTier ?? requiredTier;
  const baseCapacityTier = currentBilledTier ?? requiredTier;
  const capacityMax = allowedCapacity ?? baseCapacityTier.max;
  const unsubscribedTier = TIERS.find((tier) => tier.max === capacityMax) ?? TIERS[0];
  const capacityTier = subscribed ? baseCapacityTier : unsubscribedTier;
  const canAddRenter = capacityMax === Infinity || billableCount < capacityMax;
  const nextUpgradeTier = canAddRenter || capacityMax === Infinity ? null : getNextUpgradeTierForCount(capacityMax);

  return {
    requiredTier,
    currentBilledTier,
    effectiveTier,
    capacityTier: { ...capacityTier, max: capacityMax },
    nextUpgradeTier,
    canAddRenter,
  };
}

interface SubscriptionState {
  tier: PricingTier;
  renterCount: number;
  activeOperationalCount: number;
  billableCount: number;
  requiredTier: PricingTier;
  currentBilledTier: PricingTier | null;
  effectiveTier: PricingTier;
  capacityTier: PricingTier;
  nextUpgradeTier: PricingTier | null;
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  canAddRenter: boolean;
  checkout: (targetPriceId?: string) => Promise<void>;
  manageSubscription: () => Promise<void>;
  initiateUpgrade: (targetPriceId: string) => void;
  upgradeIntent: { priceId: string } | null;
  confirmUpgrade: () => Promise<void>;
  cancelUpgrade: () => void;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user, session, loading: authLoading } = useAuth();
  const demo = useDemo();
  const queryClient = useQueryClient();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [billableCount, setBillableCount] = useState(0);
  const [activeOperationalCount, setActiveOperationalCount] = useState(0);
  const [requiredTier, setRequiredTier] = useState<PricingTier>(TIERS[0]);
  const [currentBilledTier, setCurrentBilledTier] = useState<PricingTier | null>(null);
  const [allowedCapacity, setAllowedCapacity] = useState<number | null>(10);
  const [upgradeIntent, setUpgradeIntent] = useState<{ priceId: string } | null>(null);

  const checkSubscription = useCallback(async () => {
    if (demo?.isDemo) return;
    if (authLoading) return;
    if (!user || !session?.access_token) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setBillableCount(0);
      setActiveOperationalCount(0);
      setRequiredTier(TIERS[0]);
      setCurrentBilledTier(null);
      setAllowedCapacity(10);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      const subscriptionState = data as SubscriptionResponse;
      setSubscribed(subscriptionState.subscribed ?? false);
      setProductId(subscriptionState.product_id ?? null);
      setSubscriptionEnd(subscriptionState.subscription_end ?? null);
      setBillableCount(subscriptionState.billable_count ?? 0);
      setActiveOperationalCount(subscriptionState.active_operational_count ?? 0);
      setRequiredTier(enrichPlan(subscriptionState.required_tier) ?? TIERS[0]);
      setCurrentBilledTier(enrichPlan(subscriptionState.current_billed_tier));
      setAllowedCapacity(subscriptionState.allowed_capacity);
    } catch (e) {
      console.error("check-subscription error:", e);
      setSubscribed(false);
      setAllowedCapacity(10);
    } finally {
      setLoading(false);
    }
  }, [authLoading, demo?.isDemo, session?.access_token, user]);

  useEffect(() => {
    if (authLoading) return;
    if (demo?.isDemo) return;
    checkSubscription();
    if (!user || !session?.access_token) return;
    const interval = setInterval(checkSubscription, 5 * 60_000);
    return () => clearInterval(interval);
  }, [authLoading, checkSubscription, demo?.isDemo, session?.access_token, user]);

  const capacity = resolveSubscriptionCapacity({
    billableCount,
    subscribed,
    currentBilledTier,
    requiredTier,
    allowedCapacity,
  });

  const checkout = useCallback(async (targetPriceId?: string) => {
    const priceId = targetPriceId ?? capacity.effectiveTier.price_id;
    if (!priceId) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: priceId },
    });
    if (error) throw error;
    if (data?.updated) {
      await checkSubscription();
      queryClient.invalidateQueries({ queryKey: ["renters"] });
      queryClient.invalidateQueries({ queryKey: ["renters", "billable-count"] });
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [capacity.effectiveTier.price_id, checkSubscription, queryClient]);

  const manageSubscription = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  const initiateUpgrade = useCallback((targetPriceId: string) => {
    if (!targetPriceId) return;
    setUpgradeIntent({ priceId: targetPriceId });
  }, []);

  const confirmUpgrade = useCallback(async () => {
    if (!upgradeIntent?.priceId) return;
    await checkout(upgradeIntent.priceId);
    setUpgradeIntent(null);
  }, [checkout, upgradeIntent?.priceId]);

  const cancelUpgrade = useCallback(() => {
    setUpgradeIntent(null);
  }, []);

  const canAddRenter = loading ? false : capacity.canAddRenter;
  const refresh = useCallback(async () => {
    await checkSubscription();
    queryClient.invalidateQueries({ queryKey: ["renters"] });
    queryClient.invalidateQueries({ queryKey: ["renters", "billable-count"] });
  }, [checkSubscription, queryClient]);

  if (demo?.isDemo) {
    const starterTier = TIERS.find((tier) => tier.name === "Starter") ?? TIERS[1];
    const demoBillableCount = demo.data.renters.filter((renter) => renter.status !== "archived").length;
    const demoCapacity = resolveSubscriptionCapacity({
      billableCount: demoBillableCount,
      subscribed: true,
      currentBilledTier: starterTier,
      requiredTier: starterTier,
      allowedCapacity: starterTier.max,
    });
    return {
      tier: demoCapacity.effectiveTier,
      renterCount: demoBillableCount,
      activeOperationalCount: demoBillableCount,
      billableCount: demoBillableCount,
      requiredTier: demoCapacity.requiredTier,
      currentBilledTier: demoCapacity.currentBilledTier,
      effectiveTier: demoCapacity.effectiveTier,
      capacityTier: demoCapacity.capacityTier,
      nextUpgradeTier: demoCapacity.nextUpgradeTier,
      subscribed: true,
      loading: false,
      subscriptionEnd: null,
      productId: starterTier.product_id ?? null,
      canAddRenter: demoCapacity.canAddRenter,
      checkout: async () => {},
      manageSubscription: async () => {},
      initiateUpgrade: () => {},
      upgradeIntent: null,
      confirmUpgrade: async () => {},
      cancelUpgrade: () => {},
      refresh: async () => {},
    };
  }

  return {
    tier: capacity.effectiveTier,
    renterCount: billableCount,
    activeOperationalCount,
    billableCount,
    requiredTier: capacity.requiredTier,
    currentBilledTier: capacity.currentBilledTier,
    effectiveTier: capacity.effectiveTier,
    capacityTier: capacity.capacityTier,
    nextUpgradeTier: capacity.nextUpgradeTier,
    subscribed,
    loading,
    subscriptionEnd,
    productId,
    canAddRenter,
    checkout,
    manageSubscription,
    initiateUpgrade,
    upgradeIntent,
    confirmUpgrade,
    cancelUpgrade,
    refresh,
  };
}

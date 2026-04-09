import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { useRenters } from "@/hooks/useSupabaseData";
import { BILLABLE_RENTER_COUNT_QUERY_KEY, countBillableRenters } from "@/lib/billing-counts";
import { getNextUpgradeTierForCount, getRequiredTierForCount, getTierByProductId, TIERS, type PricingTier } from "@/lib/pricing-tiers";

export interface SubscriptionCapacityState {
  requiredTier: PricingTier;
  currentBilledTier: PricingTier | null;
  effectiveTier: PricingTier;
  capacityTier: PricingTier;
  nextUpgradeTier: PricingTier | null;
  canAddRenter: boolean;
}

export function resolveSubscriptionCapacity({
  billableCount,
  subscribed,
  currentBilledTier,
  requiredTier,
}: {
  billableCount: number;
  subscribed: boolean;
  currentBilledTier: PricingTier | null;
  requiredTier: PricingTier;
}): SubscriptionCapacityState {
  const effectiveTier = currentBilledTier ?? requiredTier;
  const capacityTier = subscribed ? (currentBilledTier ?? requiredTier) : TIERS[0];
  const canAddRenter = billableCount < capacityTier.max;
  const nextUpgradeTier = canAddRenter
    ? null
    : subscribed
      ? getNextUpgradeTierForCount(capacityTier.max)
      : getNextUpgradeTierForCount(Math.max(billableCount, capacityTier.max));

  return {
    requiredTier,
    currentBilledTier,
    effectiveTier,
    capacityTier,
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
  const { data: renters } = useRenters();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [upgradeIntent, setUpgradeIntent] = useState<{ priceId: string } | null>(null);
  const aggressivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aggressiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDemo = demo?.isDemo === true;
  const activeOperationalCount = renters?.length ?? 0;
  const billableCountQuery = useQuery({
    queryKey: [...BILLABLE_RENTER_COUNT_QUERY_KEY, user?.id],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [{ count: activeCount, error: activeError }, { count: archivedCount, error: archivedError }] = await Promise.all([
        supabase
          .from("renters")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .neq("status", "archived"),
        supabase
          .from("renters")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "archived")
          .gt("billable_until", nowIso),
      ]);

      if (activeError) throw activeError;
      if (archivedError) throw archivedError;

      return (activeCount ?? 0) + (archivedCount ?? 0);
    },
    enabled: !isDemo && !authLoading && !!user,
  });
  const billableCount = isDemo
    ? countBillableRenters(demo.data.renters, new Date())
    : billableCountQuery.data ?? 0;
  const requiredTier = getRequiredTierForCount(billableCount);
  const demoStarterTier = TIERS.find(t => t.name === "Starter") ?? TIERS[1];
  const displayedSubscribed = isDemo ? true : subscribed;
  const displayedProductId = isDemo ? demoStarterTier.product_id ?? null : productId;
  const displayedSubscriptionEnd = isDemo ? null : subscriptionEnd;
  const currentBilledTier = displayedSubscribed ? (isDemo ? demoStarterTier : getTierByProductId(productId)) : null;
  const capacity = resolveSubscriptionCapacity({
    billableCount,
    subscribed: displayedSubscribed,
    currentBilledTier,
    requiredTier,
  });

  const checkSubscription = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    if (authLoading) return;
    if (!user || !session?.access_token) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscribed(data?.subscribed ?? false);
      setProductId(data?.product_id ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch (e) {
      console.error("check-subscription error:", e);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isDemo, session?.access_token, user]);

  useEffect(() => {
    if (authLoading) return;
    checkSubscription();
    if (isDemo || !user || !session?.access_token) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [authLoading, checkSubscription, isDemo, session?.access_token, user]);

  useEffect(() => {
    return () => {
      if (aggressivePollRef.current) clearInterval(aggressivePollRef.current);
      if (aggressiveTimeoutRef.current) clearTimeout(aggressiveTimeoutRef.current);
    };
  }, []);

  const startAggressivePolling = useCallback(() => {
    if (aggressivePollRef.current) clearInterval(aggressivePollRef.current);
    if (aggressiveTimeoutRef.current) clearTimeout(aggressiveTimeoutRef.current);
    aggressivePollRef.current = setInterval(() => {
      checkSubscription();
      queryClient.invalidateQueries({ queryKey: ["renters"] });
      queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
    }, 5_000);
    aggressiveTimeoutRef.current = setTimeout(() => {
      if (aggressivePollRef.current) {
        clearInterval(aggressivePollRef.current);
        aggressivePollRef.current = null;
      }
    }, 60_000);
  }, [checkSubscription, queryClient]);

  const checkout = useCallback(async (targetPriceId?: string) => {
    if (isDemo) return;
    const priceId = targetPriceId ?? capacity.effectiveTier.price_id;
    if (!priceId) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: priceId },
    });
    if (error) throw error;
    if (data?.updated) {
      await checkSubscription();
      queryClient.invalidateQueries({ queryKey: ["renters"] });
      queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
      startAggressivePolling();
    }
  }, [capacity.effectiveTier.price_id, checkSubscription, isDemo, queryClient, startAggressivePolling]);

  const manageSubscription = useCallback(async () => {
    if (isDemo) return;
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, [isDemo]);

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

  const realModeLoading = !isDemo && (loading || billableCountQuery.isLoading);
  const canAddRenter = realModeLoading ? false : capacity.canAddRenter;
  const refresh = useCallback(async () => {
    await checkSubscription();
    queryClient.invalidateQueries({ queryKey: ["renters"] });
    queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
  }, [checkSubscription, queryClient]);

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
    subscribed: displayedSubscribed,
    loading: realModeLoading,
    subscriptionEnd: displayedSubscriptionEnd,
    productId: displayedProductId,
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

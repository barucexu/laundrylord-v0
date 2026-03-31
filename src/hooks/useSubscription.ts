import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { useRenters } from "@/hooks/useSupabaseData";
import { getRequiredTierForCount, getTierByProductId, TIERS, type PricingTier } from "@/lib/pricing-tiers";

interface SubscriptionState {
  tier: PricingTier;
  renterCount: number;
  activeOperationalCount: number;
  billableCount: number;
  requiredTier: PricingTier;
  currentBilledTier: PricingTier | null;
  effectiveTier: PricingTier;
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
  const [billableArchivedCount, setBillableArchivedCount] = useState(0);
  const [upgradeIntent, setUpgradeIntent] = useState<{ priceId: string } | null>(null);
  const aggressivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aggressiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeOperationalCount = renters?.length ?? 0;
  const billableCount = activeOperationalCount + billableArchivedCount;
  const requiredTier = getRequiredTierForCount(billableCount);

  // Demo mode: return mock Starter subscription
  if (demo?.isDemo) {
    const starterTier = TIERS.find(t => t.name === "Starter") ?? TIERS[1];
    return {
      tier: starterTier,
      renterCount: activeOperationalCount,
      activeOperationalCount,
      billableCount: activeOperationalCount,
      requiredTier,
      currentBilledTier: starterTier,
      effectiveTier: starterTier,
      subscribed: true,
      loading: false,
      subscriptionEnd: null,
      productId: starterTier.product_id ?? null,
      canAddRenter: activeOperationalCount < starterTier.max,
      checkout: async () => {},
      manageSubscription: async () => {},
      initiateUpgrade: () => {},
      upgradeIntent: null,
      confirmUpgrade: async () => {},
      cancelUpgrade: () => {},
      refresh: async () => {},
    };
  }

  const currentBilledTier = subscribed ? getTierByProductId(productId) : null;
  const effectiveTier = currentBilledTier ?? requiredTier;

  const checkSubscription = useCallback(async () => {
    if (authLoading) return;
    if (!user || !session?.access_token) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setBillableArchivedCount(0);
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

      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from("renters")
        .select("id", { count: "exact", head: true })
        .eq("status", "archived")
        .gt("billable_until", nowIso);
      setBillableArchivedCount(count ?? 0);
    } catch (e) {
      console.error("check-subscription error:", e);
      setSubscribed(false);
      setBillableArchivedCount(0);
    } finally {
      setLoading(false);
    }
  }, [authLoading, session?.access_token, user]);

  useEffect(() => {
    if (authLoading) return;
    checkSubscription();
    if (!user || !session?.access_token) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [authLoading, checkSubscription, session?.access_token, user]);

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
      queryClient.invalidateQueries({ queryKey: ["renters", "billable-count"] });
    }, 5_000);
    aggressiveTimeoutRef.current = setTimeout(() => {
      if (aggressivePollRef.current) {
        clearInterval(aggressivePollRef.current);
        aggressivePollRef.current = null;
      }
    }, 60_000);
  }, [checkSubscription, queryClient]);

  const checkout = useCallback(async (targetPriceId?: string) => {
    const priceId = targetPriceId ?? effectiveTier.price_id;
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
      startAggressivePolling();
    }
  }, [effectiveTier.price_id, checkSubscription, queryClient, startAggressivePolling]);

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

  const canAddRenter = (() => {
    if (loading) return false;
    if (requiredTier.price === 0) return billableCount < requiredTier.max;
    return subscribed && billableCount < effectiveTier.max;
  })();

  return {
    tier: effectiveTier,
    renterCount: billableCount,
    activeOperationalCount,
    billableCount,
    requiredTier,
    currentBilledTier,
    effectiveTier,
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
    refresh: checkSubscription,
  };
}

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRenters } from "@/hooks/useSupabaseData";
import { useDemo } from "@/contexts/DemoContext";
import {
  getTierForCount,
  getRequiredTierForCount,
  getTierByProductId,
  getNextUpgradeTierForCount,
  type PricingTier,
} from "@/lib/pricing-tiers";

interface SubscriptionState {
  tier: PricingTier;
  /** Non-archived renters (operational display) */
  activeOperationalCount: number;
  /** Non-archived + archived-in-cooldown (enforcement) */
  billableCount: number;
  /** Legacy alias for activeOperationalCount */
  renterCount: number;
  /** Tier required by billableCount */
  requiredTier: PricingTier;
  /** Tier currently paid for (from subscription product_id) */
  currentBilledTier: PricingTier;
  /** Effective tier for enforcement */
  effectiveTier: PricingTier;
  /** Next tier to upgrade to when blocked */
  upgradeTarget: PricingTier;
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  canAddRenter: boolean;
  /** Start checkout for a specific tier (or current required tier) */
  checkout: (targetPriceId?: string) => Promise<void>;
  /** Open customer portal */
  manageSubscription: () => Promise<void>;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user, session, loading: authLoading } = useAuth();
  const demo = useDemo();
  const { data: renters } = useRenters();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const aggressivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aggressiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active (non-archived) renter count
  const activeOperationalCount = renters?.length ?? 0;

  // Billable count: active + archived renters still in 30-day cooldown
  const billableQuery = useQuery({
    queryKey: ["renters", "billable-count"],
    queryFn: async () => {
      // Count archived renters whose billable_until is still in the future
      const { count, error } = await supabase
        .from("renters")
        .select("id", { count: "exact", head: true })
        .eq("status", "archived")
        .gt("billable_until", new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !demo?.isDemo && !!user,
    staleTime: 30_000,
  });

  const archivedInCooldown = demo?.isDemo ? 0 : (billableQuery.data ?? 0);
  const billableCount = activeOperationalCount + archivedInCooldown;

  // Tiers
  const requiredTier = getRequiredTierForCount(billableCount);
  const currentBilledTier = getTierByProductId(productId);
  const effectiveTier = subscribed ? currentBilledTier : requiredTier;
  const upgradeTarget = getNextUpgradeTierForCount(billableCount);
  // Legacy: tier based on billable count for enforcement
  const tier = requiredTier;

  const checkSubscription = useCallback(async () => {
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
    aggressivePollRef.current = setInterval(checkSubscription, 5_000);
    aggressiveTimeoutRef.current = setTimeout(() => {
      if (aggressivePollRef.current) {
        clearInterval(aggressivePollRef.current);
        aggressivePollRef.current = null;
      }
    }, 60_000);
  }, [checkSubscription]);

  const checkout = useCallback(async (targetPriceId?: string) => {
    const priceId = targetPriceId ?? upgradeTarget.price_id ?? tier.price_id;
    if (!priceId) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: priceId },
    });
    if (error) throw error;
    if (data?.updated) {
      // Subscription was updated directly via API — just refresh
      await checkSubscription();
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
      startAggressivePolling();
    }
  }, [tier, upgradeTarget, startAggressivePolling, checkSubscription]);

  const manageSubscription = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  // Canonical enforcement using billableCount
  const canAddRenter = (() => {
    if (loading) return false;
    // Free tier: can add up to max (10)
    if (tier.price === 0) return billableCount < tier.max;
    // Paid tiers: must be subscribed and under the effective tier max
    return subscribed && billableCount < effectiveTier.max;
  })();

  return {
    tier,
    activeOperationalCount,
    billableCount,
    renterCount: activeOperationalCount,
    requiredTier,
    currentBilledTier,
    effectiveTier,
    upgradeTarget,
    subscribed,
    loading,
    subscriptionEnd,
    productId,
    canAddRenter,
    checkout,
    manageSubscription,
    refresh: checkSubscription,
  };
}

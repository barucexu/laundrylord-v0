import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRenters } from "@/hooks/useSupabaseData";
import { getRequiredTierForCount, getTierByProductId, type PricingTier } from "@/lib/pricing-tiers";

interface SubscriptionState {
  tier: PricingTier; // Effective enforcement tier (kept for backwards compatibility)
  renterCount: number; // Billable renter count (kept for backwards compatibility)
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
  /** Start checkout for current tier */
  checkout: (targetPriceId?: string) => Promise<void>;
  /** Open customer portal */
  manageSubscription: () => Promise<void>;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user, session, loading: authLoading } = useAuth();
  const { data: renters } = useRenters();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [billableArchivedCount, setBillableArchivedCount] = useState(0);
  const aggressivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aggressiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Operational count uses non-archived renters (`useRenters` excludes archived).
  const activeOperationalCount = renters?.length ?? 0;
  const billableCount = activeOperationalCount + billableArchivedCount;
  const requiredTier = getRequiredTierForCount(billableCount);
  const currentBilledTier = subscribed ? getTierByProductId(productId) : null;
  const effectiveTier = currentBilledTier ?? requiredTier;

  const checkSubscription = useCallback(async () => {
    if (authLoading) {
      return;
    }

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

      // Billable archived count: archived renters stay billable for 30 days while billable_until is in the future.
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
    if (authLoading) {
      return;
    }

    checkSubscription();

    if (!user || !session?.access_token) {
      return;
    }

    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [authLoading, checkSubscription, session?.access_token, user]);

  // Cleanup aggressive polling on unmount
  useEffect(() => {
    return () => {
      if (aggressivePollRef.current) clearInterval(aggressivePollRef.current);
      if (aggressiveTimeoutRef.current) clearTimeout(aggressiveTimeoutRef.current);
    };
  }, []);

  const startAggressivePolling = useCallback(() => {
    // Poll every 5s for 60s after checkout
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
    const priceId = targetPriceId ?? effectiveTier.price_id;
    if (!priceId) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: priceId },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
      // Start aggressive polling to detect payment quickly
      startAggressivePolling();
    }
  }, [effectiveTier.price_id, startAggressivePolling]);

  const manageSubscription = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  // Compute whether the operator can add more renters
  // HARD STOP: while loading, block additions to prevent race condition
  const canAddRenter = (() => {
    if (loading) return false;
    // Free tier: can add up to max (10)
    if (requiredTier.price === 0) return billableCount < requiredTier.max;
    // All paid tiers: must be subscribed and under the max
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
    refresh: checkSubscription,
  };
}

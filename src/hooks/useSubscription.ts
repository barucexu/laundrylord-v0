import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRenters } from "@/hooks/useSupabaseData";
import { getTierForCount, type PricingTier } from "@/lib/pricing-tiers";

interface SubscriptionState {
  tier: PricingTier;
  renterCount: number;
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  canAddRenter: boolean;
  /** Start checkout for current tier */
  checkout: () => Promise<void>;
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
  const aggressivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aggressiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Count ALL renters (every status), not just active
  const renterCount = renters?.length ?? 0;
  const tier = getTierForCount(renterCount);

  const checkSubscription = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user || !session?.access_token) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(session.access_token);

      if (authError || !authData.user) {
        await supabase.auth.signOut({ scope: "local" });
        setSubscribed(false);
        setProductId(null);
        setSubscriptionEnd(null);
        return;
      }

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

  const checkout = useCallback(async () => {
    if (!tier.price_id) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: tier.price_id },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
      // Start aggressive polling to detect payment quickly
      startAggressivePolling();
    }
  }, [tier, startAggressivePolling]);

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
    if (tier.price === 0) return renterCount < tier.max;
    // Custom tier: must have subscription
    if (tier.price === -1) return subscribed;
    // Paid tier: must be subscribed and under the max
    return subscribed && renterCount < tier.max;
  })();

  return {
    tier,
    renterCount,
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

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRenters } from "@/hooks/useSupabaseData";
import { getTierForCount, type PricingTier } from "@/lib/pricing-tiers";

interface SubscriptionState {
  tier: PricingTier;
  activeRenters: number;
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  /** Start checkout for current tier */
  checkout: () => Promise<void>;
  /** Open customer portal */
  manageSubscription: () => Promise<void>;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const { data: renters } = useRenters();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  const activeRenters = renters?.filter((r) => r.status === "active").length ?? 0;
  const tier = getTierForCount(activeRenters);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const checkout = useCallback(async () => {
    if (!tier.price_id) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { price_id: tier.price_id },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, [tier]);

  const manageSubscription = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  return {
    tier,
    activeRenters,
    subscribed,
    loading,
    subscriptionEnd,
    productId,
    checkout,
    manageSubscription,
    refresh: checkSubscription,
  };
}

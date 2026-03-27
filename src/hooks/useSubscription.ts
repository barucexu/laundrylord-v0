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
  const { user, session, loading: authLoading } = useAuth();
  const { data: renters } = useRenters();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  const activeRenters = renters?.filter((r) => r.status === "active").length ?? 0;
  const tier = getTierForCount(activeRenters);

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

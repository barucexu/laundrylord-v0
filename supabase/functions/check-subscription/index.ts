import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

// SaaS product IDs — only subscriptions for these products count as LaundryLord plan subscriptions.
const SAAS_PRODUCT_IDS = new Set([
  "prod_UJ58t9MVJy9kM1", // Starter
  "prod_UJ58vllhfPnDMA", // Growth
  "prod_UJ58WKvIfBSgVF", // Pro
  "prod_UJ58Un0dqdr1bw", // Scale
  "prod_UJ570aXFf4kHyD", // Business
  "prod_UJ57FSgV0zgrlb", // Enterprise
  "prod_UJ57tGh0ISMKcj", // Portfolio
  "prod_UJ57Jy6PV80WrY", // Empire
  "prod_UJ57nRhlCMzAzY", // Ultimate
]);

const getProductId = (product: string | { id?: string } | null | undefined): string | null => {
  if (!product) return null;
  return typeof product === "string" ? product : product.id ?? null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth header missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Invalid authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Use anon key + forwarded auth header so getUser works correctly
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);
    if (userError || !user?.email) {
      const authMessage = userError?.message ?? "User not authenticated or email not available";
      return new Response(JSON.stringify({ error: `Auth error: ${authMessage}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const syncOperatorPlanState = async ({
      subscribed,
      productId,
      subscriptionEnd,
    }: {
      subscribed: boolean;
      productId: string | null;
      subscriptionEnd: string | null;
    }) => {
      const { error: syncError } = await serviceClient
        .from("operator_settings")
        .upsert(
          {
            user_id: user.id,
            saas_subscribed: subscribed,
            saas_product_id: productId,
            saas_subscription_end: subscriptionEnd,
          },
          { onConflict: "user_id" },
        );

      if (syncError) {
        throw new Error(`Failed to sync operator plan state: ${syncError.message}`);
      }
    };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found — not subscribed");
      await syncOperatorPlanState({ subscribed: false, productId: null, subscriptionEnd: null });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 50,
    });

    const getSaasProductId = (subscription: Stripe.Subscription): string | null => {
      for (const item of subscription.items.data) {
        const productId = getProductId(item.price.product);
        if (productId !== null && SAAS_PRODUCT_IDS.has(productId)) return productId;
      }
      return null;
    };

    const sub = subscriptions.data.find((subscription) => getSaasProductId(subscription) !== null);

    if (!sub) {
      logStep("No active SaaS subscription");
      await syncOperatorPlanState({ subscribed: false, productId: null, subscriptionEnd: null });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = getSaasProductId(sub);

    let subscriptionEnd: string | null = null;
    try {
      const endVal = sub.current_period_end;
      if (typeof endVal === "number" && endVal > 0) {
        subscriptionEnd = new Date(endVal * 1000).toISOString();
      } else if (typeof endVal === "string") {
        subscriptionEnd = endVal;
      }
    } catch {
      logStep("Could not parse current_period_end", { raw: sub.current_period_end });
    }

    logStep("Active subscription found", { subscriptionId: sub.id, productId, subscriptionEnd });
    await syncOperatorPlanState({ subscribed: true, productId, subscriptionEnd });

    return new Response(
      JSON.stringify({ subscribed: true, product_id: productId, subscription_end: subscriptionEnd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

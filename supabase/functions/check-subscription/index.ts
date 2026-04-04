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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Auth header missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: `Auth error: ${claimsError?.message ?? "Invalid token"}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email in token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId, email });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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
            user_id: userId,
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
    const customers = await stripe.customers.list({ email, limit: 1 });

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
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      await syncOperatorPlanState({ subscribed: false, productId: null, subscriptionEnd: null });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0]?.price?.product ?? null;

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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SaaS product IDs — used to detect existing SaaS subscriptions
const SAAS_PRODUCT_IDS = new Set([
  "prod_UEEy3RgIQPQOGZ", // Starter
  "prod_UEEyoVnhxLF3vy", // Growth
  "prod_UEEyKtssPt0430", // Pro
  "prod_UEEygRRU9opKwW", // Scale
  "prod_UEEyrzDO6LUlgl", // Business
  "prod_UEEyuMGKTuzhYF", // Enterprise
  "prod_UEEyc2En1L0HBs", // Portfolio
  "prod_UEEyriCh6VhS2S", // Empire
  "prod_UEEyMlX4QNETsG", // Ultimate
]);

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
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
    if (!authHeader) throw new Error("No authorization header");

    // User client: authenticates via forwarded JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const { price_id } = await req.json();
    if (!price_id) throw new Error("price_id is required");
    logStep("Price ID", { price_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if customer already has an active SaaS subscription
      // If so, redirect to the customer portal for plan changes instead of creating a duplicate
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      const saasSubscription = subscriptions.data.find((sub) =>
        sub.items.data.some((item) => {
          const productId = typeof item.price.product === "string"
            ? item.price.product
            : item.price.product?.id;
          return productId && SAAS_PRODUCT_IDS.has(productId);
        })
      );

      if (saasSubscription) {
        // Check if the requested price is already the current price (no change needed)
        const currentPriceId = saasSubscription.items.data[0]?.price?.id;
        if (currentPriceId === price_id) {
          logStep("Already on requested plan — redirecting to portal");
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/settings`,
          });
          return new Response(JSON.stringify({ url: portalSession.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update existing subscription to the new price directly via API
        logStep("Updating existing subscription to new price", {
          subscriptionId: saasSubscription.id,
          fromPrice: currentPriceId,
          toPrice: price_id,
        });
        const subscriptionItemId = saasSubscription.items.data[0].id;
        await stripe.subscriptions.update(saasSubscription.id, {
          items: [{ id: subscriptionItemId, price: price_id }],
          proration_behavior: "always_invoice",
        });
        return new Response(JSON.stringify({
          url: `${origin}/settings?subscription=updated`,
          updated: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["us_bank_account", "card"],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings?subscription=success`,
      cancel_url: `${origin}/settings`,
    });

    logStep("Checkout session created", { sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

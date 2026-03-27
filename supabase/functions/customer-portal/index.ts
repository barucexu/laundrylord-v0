import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SaaS product IDs — only these should appear in the billing portal
const SAAS_PRODUCT_IDS = [
  "prod_UEADMxrVTge3fL", // Starter
  "prod_UEAECHZpkSnOYA", // Growth
  "prod_UEAE1m4EwoT4Vo", // Pro
  "prod_UEAFvf9fkWycsF", // Scale
];

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const customerId = customers.data[0].id;
    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";

    // Find the SaaS subscription (not operator-to-renter subscriptions)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 20,
    });

    const saasSubscription = subscriptions.data.find((sub) =>
      sub.items.data.some((item) => {
        const productId = typeof item.price.product === "string"
          ? item.price.product
          : item.price.product?.id;
        return SAAS_PRODUCT_IDS.includes(productId as string);
      })
    );

    logStep("SaaS subscription lookup", {
      found: !!saasSubscription,
      totalSubs: subscriptions.data.length,
    });

    // If we found the SaaS subscription, scope the portal to it
    const portalOptions: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: `${origin}/settings`,
    };

    if (saasSubscription) {
      portalOptions.flow_data = {
        type: "subscription_update_confirm" as any,
        subscription_update_confirm: {
          subscription: saasSubscription.id,
          items: saasSubscription.items.data.map((item) => ({
            id: item.id,
            price: item.price.id,
            quantity: item.quantity ?? 1,
          })),
        },
      };
      // Actually, flow_data subscription_update_confirm requires a new price.
      // Instead, just use subscription_cancel flow or default portal.
      // The simplest fix: don't use flow_data, just open portal normally.
      // The real fix is to NOT share Stripe accounts in production.
      // For now, open portal without flow_data — it will show all subs.
      delete portalOptions.flow_data;
    }

    const portalSession = await stripe.billingPortal.sessions.create(portalOptions);

    logStep("Portal session created", { url: portalSession.url });
    return new Response(JSON.stringify({ url: portalSession.url }), {
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

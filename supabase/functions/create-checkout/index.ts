import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getActiveSaaSPlans } from "../_shared/saasPlans.ts";
import { createUserClient } from "../_shared/supabase.ts";

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

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const { price_id } = await req.json();
    if (!price_id) throw new Error("price_id is required");
    logStep("Price ID", { price_id });

    const activePlans = await getActiveSaaSPlans();
    const saasProductIds = new Set(activePlans.map((plan) => plan.product_id).filter((productId): productId is string => Boolean(productId)));

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 50,
      });

      const activeSaasSubs = subscriptions.data.filter((sub) =>
        sub.items.data.some((item) => {
          const productId = typeof item.price.product === "string"
            ? item.price.product
            : item.price.product?.id;
          return productId && saasProductIds.has(productId);
        })
      );

      for (const sub of activeSaasSubs) {
        logStep("Cancelling existing SaaS subscription before new checkout", { subscriptionId: sub.id });
        await stripe.subscriptions.cancel(sub.id, {
          prorate: false,
          invoice_now: false,
        });
      }
    }

    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.balance < 0) {
        logStep("Clearing orphaned customer credit before first checkout", { balance: customer.balance });
        await stripe.customers.update(customerId, { balance: 0 });
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

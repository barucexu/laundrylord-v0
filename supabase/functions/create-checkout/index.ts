import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getProductId, resolveSaasCustomer } from "../_shared/saas-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SaaS price IDs — incoming Checkout requests must target one of these prices.
const SAAS_PRICE_IDS = new Set([
  "price_1TKSxq6ThRF2oI0ePEVOB78i", // Starter
  "price_1TKSxp6ThRF2oI0e6SvsTacu", // Growth
  "price_1TKSxn6ThRF2oI0emf6Qv0rk", // Pro
  "price_1TKSxl6ThRF2oI0eVda3nXiN", // Scale
  "price_1TKSxj6ThRF2oI0ef8fSmIyV", // Business
  "price_1TKSxh6ThRF2oI0ezlVTH1Iv", // Enterprise
  "price_1TKSxf6ThRF2oI0e6xk6eK8r", // Portfolio
  "price_1TKSxd6ThRF2oI0eqcX1mYga", // Empire
  "price_1TKSxX6ThRF2oI0exkH7YfC0", // Ultimate
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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const { price_id, action, proration_date } = await req.json();
    if (!price_id) throw new Error("price_id is required");
    if (!SAAS_PRICE_IDS.has(price_id)) throw new Error("Invalid SaaS price_id");
    logStep("Price ID", { price_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";
    const { data: settingsRow, error: settingsError } = await serviceClient
      .from("operator_settings")
      .select("saas_stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settingsError) throw new Error(`Failed to load operator settings: ${settingsError.message}`);

    const resolvedCustomer = await resolveSaasCustomer({
      stripe,
      email: user.email,
      persistedCustomerId: settingsRow?.saas_stripe_customer_id ?? null,
      createIfMissing: true,
      customerName: user.user_metadata?.full_name ?? user.email,
      metadata: {
        laundrylord_user_id: user.id,
        usage: "saas_billing",
      },
    });

    const customerId = resolvedCustomer.customerId;
    if (!customerId) throw new Error("Failed to resolve SaaS Stripe customer");

    const { error: persistError } = await serviceClient
      .from("operator_settings")
      .upsert(
        {
          user_id: user.id,
          saas_stripe_customer_id: customerId,
        },
        { onConflict: "user_id" },
      );
    if (persistError) throw new Error(`Failed to persist SaaS customer ID: ${persistError.message}`);

    const targetPrice = await stripe.prices.retrieve(price_id);
    const targetProductId = getProductId(targetPrice.product);

    if (resolvedCustomer.activeSubscription) {
      const activeSubscription = resolvedCustomer.activeSubscription as unknown as Stripe.Subscription;
      const currentItem = activeSubscription.items.data[0];
      if (!currentItem?.id) {
        throw new Error("Active SaaS subscription is missing an updatable subscription item");
      }

      if (currentItem.price.id === price_id) {
        logStep("Requested SaaS price matches current price; routing to billing portal", {
          subscriptionId: activeSubscription.id,
          customerId,
          price_id,
        });

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${origin}/settings`,
        });

        return new Response(JSON.stringify({
          url: portalSession.url,
          already_subscribed: true,
          action: "manage_billing",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "preview") {
        const previewProrationDate = typeof proration_date === "number"
          ? proration_date
          : Math.floor(Date.now() / 1000);
        const previewInvoice = await stripe.invoices.createPreview({
          customer: customerId,
          subscription: activeSubscription.id,
          subscription_details: {
            billing_cycle_anchor: "now",
            items: [{ id: currentItem.id, price: price_id }],
            proration_behavior: "always_invoice",
            proration_date: previewProrationDate,
          },
        });

        const prorationLines = previewInvoice.lines.data.filter((line) => {
          const parent = line.parent as { subscription_item_details?: { proration?: boolean } } | null;
          return parent?.subscription_item_details?.proration === true;
        });
        const positiveProration = prorationLines
          .filter((line) => line.amount > 0)
          .reduce((sum, line) => sum + line.amount, 0);
        const negativeProration = prorationLines
          .filter((line) => line.amount < 0)
          .reduce((sum, line) => sum + Math.abs(line.amount), 0);

        return new Response(JSON.stringify({
          preview: {
            amount_due_now: (previewInvoice.amount_due ?? 0) / 100,
            current_plan_name: currentItem.price.nickname ?? activeSubscription.items.data[0]?.price.nickname ?? null,
            target_plan_name: targetPrice.nickname ?? null,
            next_renewal_amount: (targetPrice.unit_amount ?? 0) / 100,
            unused_time_credit: negativeProration / 100,
            prorated_charge: positiveProration / 100,
            currency: previewInvoice.currency ?? "usd",
            is_credit: (previewInvoice.amount_due ?? 0) < 0,
            proration_date: previewProrationDate,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Updating active SaaS subscription immediately", {
        subscriptionId: activeSubscription.id,
        customerId,
        fromPriceId: currentItem.price.id,
        toPriceId: price_id,
      });

      const updatedSubscription = await stripe.subscriptions.update(activeSubscription.id, {
        items: [{ id: currentItem.id, price: price_id }],
        billing_cycle_anchor: "now",
        proration_date: typeof proration_date === "number" ? proration_date : undefined,
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        cancel_at_period_end: false,
      });

      const nextSubscriptionEnd = typeof updatedSubscription.current_period_end === "number"
        ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
        : null;

      const { error: syncError } = await serviceClient
        .from("operator_settings")
        .upsert(
          {
            user_id: user.id,
            saas_subscribed: true,
            saas_product_id: targetProductId,
            saas_subscription_end: nextSubscriptionEnd,
            saas_stripe_customer_id: customerId,
          },
          { onConflict: "user_id" },
        );
      if (syncError) {
        throw new Error(`Failed to sync upgraded SaaS plan state: ${syncError.message}`);
      }

      return new Response(JSON.stringify({
        updated: true,
        product_id: targetProductId,
        subscription_end: nextSubscriptionEnd,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "preview") {
      return new Response(JSON.stringify({
        preview: {
          amount_due_now: (targetPrice.unit_amount ?? 0) / 100,
          current_plan_name: null,
          target_plan_name: targetPrice.nickname ?? null,
          next_renewal_amount: (targetPrice.unit_amount ?? 0) / 100,
          unused_time_credit: 0,
          prorated_charge: 0,
          currency: targetPrice.currency ?? "usd",
          is_credit: false,
          proration_date: null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear orphaned customer credit that could make first checkout $0
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.balance < 0) {
      logStep("Clearing orphaned customer credit before first checkout", { balance: customer.balance });
      await stripe.customers.update(customerId, { balance: 0 });
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

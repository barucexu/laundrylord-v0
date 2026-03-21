import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { renter_id, billing_anchor_day } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await supabase
      .from("renters")
      .select("*")
      .eq("id", renter_id)
      .eq("user_id", userData.user.id)
      .single();
    if (renterError || !renter) throw new Error("Renter not found");
    if (!renter.stripe_customer_id) throw new Error("Renter has no card on file. Send setup link first.");
    if (renter.stripe_subscription_id) throw new Error("Renter already has an active subscription.");

    // Get operator's Stripe key
    const { data: settings } = await supabase
      .from("operator_settings")
      .select("stripe_secret_key")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const stripeKey = settings?.stripe_secret_key;
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    const paymentMethods = await stripe.paymentMethods.list({
      customer: renter.stripe_customer_id,
      type: "card",
    });
    if (paymentMethods.data.length === 0) {
      throw new Error("No payment method on file. Send setup link first.");
    }

    await stripe.customers.update(renter.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethods.data[0].id,
      },
    });

    const amountCents = Math.round(Number(renter.monthly_rate) * 100);
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amountCents,
      recurring: { interval: "month" },
      product_data: {
        name: `Washer Rental - ${renter.name}`,
        metadata: { renter_id: renter.id },
      },
    });

    let anchorDay = billing_anchor_day || new Date().getUTCDate();
    if (!billing_anchor_day && renter.lease_start_date) {
      const parsed = new Date(renter.lease_start_date + "T00:00:00Z");
      if (!isNaN(parsed.getTime())) {
        anchorDay = parsed.getUTCDate();
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: renter.stripe_customer_id,
      items: [{ price: price.id }],
      billing_cycle_anchor_config: {
        day_of_month: Math.min(anchorDay, 28),
      },
      proration_behavior: "none",
      metadata: { renter_id: renter.id, user_id: userData.user.id },
    });

    const nextDue = new Date(subscription.current_period_end * 1000).toISOString().split("T")[0];
    await supabase
      .from("renters")
      .update({
        stripe_subscription_id: subscription.id,
        status: "active",
        next_due_date: nextDue,
      })
      .eq("id", renter_id);

    return new Response(JSON.stringify({
      subscription_id: subscription.id,
      status: subscription.status,
      next_due: nextDue,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

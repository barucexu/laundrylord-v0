import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getOperatorStripeSecret } from "../_shared/operatorStripeSecrets.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createServiceClient();

    const { renter_id, billing_anchor_day } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await adminClient
      .from("renters")
      .select("*")
      .eq("id", renter_id)
      .eq("user_id", user.id)
      .single();
    if (renterError || !renter) throw new Error("Renter not found");
    if (!renter.stripe_customer_id) throw new Error("Renter has no card on file. Send setup link first.");
    if (renter.stripe_subscription_id) {
      return new Response(JSON.stringify({
        subscription_id: renter.stripe_subscription_id,
        status: renter.status,
        next_due: renter.next_due_date,
        already_active: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = await getOperatorStripeSecret(user.id);
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const cardMethods = await stripe.paymentMethods.list({
      customer: renter.stripe_customer_id,
      type: "card",
    });
    const bankMethods = await stripe.paymentMethods.list({
      customer: renter.stripe_customer_id,
      type: "us_bank_account",
    });
    const defaultMethod = cardMethods.data[0] || bankMethods.data[0];
    if (!defaultMethod) {
      throw new Error("No payment method on file. Send setup link first.");
    }

    await stripe.customers.update(renter.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: defaultMethod.id,
      },
    });

    const amountCents = Math.round(Number(renter.monthly_rate) * 100);
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amountCents,
      recurring: { interval: "month" },
      product_data: {
        name: `Washer Rental - ${renter.name}`,
        metadata: { renter_id: renter.id, user_id: user.id },
      },
    });

    let anchorDay = billing_anchor_day || new Date().getUTCDate();
    if (!billing_anchor_day && renter.lease_start_date) {
      const parsed = new Date(`${renter.lease_start_date}T00:00:00Z`);
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
      metadata: { renter_id: renter.id, user_id: user.id },
    });

    const subscriptionPeriodEnd = typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000)
      : null;

    let nextDue: string;
    if (subscriptionPeriodEnd && !isNaN(subscriptionPeriodEnd.getTime())) {
      nextDue = subscriptionPeriodEnd.toISOString().split("T")[0];
    } else {
      const fallbackBase = renter.lease_start_date
        ? new Date(`${renter.lease_start_date}T00:00:00Z`)
        : new Date();
      const safeBase = !isNaN(fallbackBase.getTime()) ? fallbackBase : new Date();
      const fallbackDue = new Date(Date.UTC(
        safeBase.getUTCFullYear(),
        safeBase.getUTCMonth() + 1,
        Math.min(anchorDay, 28)
      ));
      nextDue = fallbackDue.toISOString().split("T")[0];
    }

    await adminClient
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

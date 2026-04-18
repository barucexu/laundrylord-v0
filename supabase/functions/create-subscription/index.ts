import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isRenterBillingReady } from "../_shared/renter-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // User client: authenticates via forwarded JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Admin client: bypasses RLS for stripe_keys and renter updates
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    const { data: keyRow } = await adminClient
      .from("stripe_keys")
      .select("encrypted_key, webhook_endpoint_token, webhook_signing_secret")
      .eq("user_id", user.id)
      .maybeSingle();
    const stripeKey = keyRow?.encrypted_key;
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");
    if (!isRenterBillingReady(keyRow)) {
      throw new Error("Finish webhook setup in Settings before starting renter autopay.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customer = await stripe.customers.retrieve(renter.stripe_customer_id);
    const customerDefaultMethod = !customer.deleted && typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : null;

    let defaultMethodId = customerDefaultMethod;
    if (!defaultMethodId) {
      const cardMethods = await stripe.paymentMethods.list({
        customer: renter.stripe_customer_id,
        type: "card",
      });
      const bankMethods = await stripe.paymentMethods.list({
        customer: renter.stripe_customer_id,
        type: "us_bank_account",
      });
      defaultMethodId = cardMethods.data[0]?.id || bankMethods.data[0]?.id || null;
    }

    if (!defaultMethodId) {
      throw new Error("No payment method on file. Send setup link first.");
    }

    await stripe.customers.update(renter.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: defaultMethodId,
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

    const normalizedAnchorDay = Math.min(anchorDay, 28);
    const now = new Date();
    const nextRecurringChargeDate = (() => {
      const candidateThisMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        normalizedAnchorDay,
      ));
      if (
        candidateThisMonth.getUTCDate() === normalizedAnchorDay &&
        candidateThisMonth.getTime() > now.getTime()
      ) {
        return candidateThisMonth;
      }
      return new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        normalizedAnchorDay,
      ));
    })();

    const currentBalanceCents = Math.round(Number(renter.balance || 0) * 100);
    let currentBalanceStatus: "none" | "paid" | "processing" = "none";
    if (currentBalanceCents > 0) {
      const invoiceItem = await stripe.invoiceItems.create({
        customer: renter.stripe_customer_id,
        amount: currentBalanceCents,
        currency: "usd",
        description: `LaundryLord current balance charge for ${renter.name}`,
        metadata: {
          renter_id: renter.id,
          user_id: user.id,
          charge_kind: "starting_balance",
        },
      });

      const draftInvoice = await stripe.invoices.create({
        customer: renter.stripe_customer_id,
        collection_method: "charge_automatically",
        auto_advance: false,
        default_payment_method: defaultMethodId,
        description: `LaundryLord current balance charge for ${renter.name}`,
        metadata: {
          renter_id: renter.id,
          user_id: user.id,
          charge_kind: "starting_balance",
          invoice_item_id: invoiceItem.id,
        },
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(draftInvoice.id);
      const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
        payment_method: defaultMethodId,
      });

      const paymentIntentId = typeof paidInvoice.payment_intent === "string"
        ? paidInvoice.payment_intent
        : paidInvoice.payment_intent?.id ?? null;

      let paymentIntentStatus: string | null = null;
      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        paymentIntentStatus = paymentIntent.status;
      }

      if (paidInvoice.status === "paid") {
        currentBalanceStatus = "paid";
      } else if (paymentIntentStatus === "processing") {
        currentBalanceStatus = "processing";
      } else {
        if (paidInvoice.status === "open") {
          await stripe.invoices.voidInvoice(paidInvoice.id);
        }
        return new Response(JSON.stringify({
          error: "Current balance charge failed, so autopay was not started.",
          current_balance_charge_failed: true,
          autopay_started: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: renter.stripe_customer_id,
      items: [{ price: price.id }],
      trial_end: Math.floor(nextRecurringChargeDate.getTime() / 1000),
      proration_behavior: "none",
      default_payment_method: defaultMethodId,
      metadata: { renter_id: renter.id, user_id: user.id, charge_kind: "recurring_rent" },
    });

    const nextDue = nextRecurringChargeDate.toISOString().split("T")[0];

    await adminClient
      .from("renters")
      .update({
        stripe_subscription_id: subscription.id,
        status: "active",
        next_due_date: nextDue,
      })
      .eq("id", renter_id)
      .eq("user_id", user.id);

    await adminClient.from("timeline_events").insert({
      renter_id: renter.id,
      user_id: user.id,
      type: "note",
      description: currentBalanceStatus === "paid"
        ? `Autopay started. Charged current balance and next recurring charge is ${nextDue}`
        : currentBalanceStatus === "processing"
          ? `Autopay started. Current balance payment is processing and next recurring charge is ${nextDue}`
          : `Autopay started. Next recurring charge is ${nextDue}`,
      date: now.toISOString().split("T")[0],
    });

    return new Response(JSON.stringify({
      subscription_id: subscription.id,
      status: subscription.status,
      next_due: nextDue,
      charged_current_balance: currentBalanceStatus === "paid",
      current_balance_status: currentBalanceStatus,
      autopay_started: true,
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return jsonResponse({ error: "Missing webhook token" }, 400);
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return jsonResponse({ error: "Missing Stripe signature" }, 400);
  }

  const { data: stripeKeyRow, error: stripeKeyError } = await supabase
    .from("stripe_keys")
    .select("user_id, encrypted_key, webhook_signing_secret")
    .eq("webhook_endpoint_token", token)
    .maybeSingle();

  if (stripeKeyError) {
    console.error("[WEBHOOK] Failed to look up webhook token:", stripeKeyError);
    return jsonResponse({ error: "Webhook lookup failed" }, 500);
  }

  if (!stripeKeyRow?.user_id || !stripeKeyRow.encrypted_key || !stripeKeyRow.webhook_signing_secret) {
    return jsonResponse({ error: "Unknown webhook token" }, 400);
  }

  let event: Stripe.Event;
  try {
    const tempStripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_stub", {
      apiVersion: "2025-08-27.basil",
    });
    event = await tempStripe.webhooks.constructEventAsync(body, sig, stripeKeyRow.webhook_signing_secret);
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  const userId = stripeKeyRow.user_id;
  console.log(`[WEBHOOK] Received event ${event.type} for user ${userId}`);

  const { error: dedupeError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      user_id: userId,
      event_id: event.id,
      event_type: event.type,
    });

  if (dedupeError) {
    if (dedupeError.code === "23505") {
      console.log(`[WEBHOOK] Duplicate event ${event.id} for user ${userId}`);
      return jsonResponse({ received: true, duplicate: true });
    }
    console.error("[WEBHOOK] Failed to record event:", dedupeError);
    return jsonResponse({ error: "Failed to record webhook event" }, 500);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "setup") {
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const metadataRenterId = session.metadata?.renter_id ?? null;
        const setupIntentId = typeof session.setup_intent === "string" ? session.setup_intent : null;
        const stripe = new Stripe(stripeKeyRow.encrypted_key, {
          apiVersion: "2025-08-27.basil",
        });

        let renterQuery = supabase
          .from("renters")
          .select("id, user_id, stripe_subscription_id")
          .eq("user_id", userId);

        if (customerId) {
          renterQuery = renterQuery.eq("stripe_customer_id", customerId);
        } else if (metadataRenterId) {
          renterQuery = renterQuery.eq("id", metadataRenterId);
        } else {
          return jsonResponse({ received: true });
        }

        const { data: renter } = await renterQuery.maybeSingle();

        if (renter) {
          let paymentMethodId: string | null = null;
          if (setupIntentId) {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            paymentMethodId = typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id ?? null;
          }

          if (customerId && paymentMethodId) {
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });

            if (renter.stripe_subscription_id) {
              await stripe.subscriptions.update(renter.stripe_subscription_id, {
                default_payment_method: paymentMethodId,
              });
            }
          }

          await supabase
            .from("renters")
            .update({ has_payment_method: true })
            .eq("id", renter.id)
            .eq("user_id", userId);

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: userId,
            type: "payment_method_saved",
            description: renter.stripe_subscription_id
              ? "Payment method updated for future autopay"
              : "Payment method saved for autopay",
          });
        }
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const amountPaid = (invoice.amount_paid || 0) / 100;

      if (customerId) {
        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id, rent_collected, balance")
          .eq("user_id", userId)
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (renter) {
          const periodEnd = invoice.lines?.data?.[0]?.period?.end;
          const nextDue = periodEnd ? new Date(periodEnd * 1000).toISOString().split("T")[0] : null;
          const paidThrough = invoice.lines?.data?.[0]?.period?.start
            ? new Date(invoice.lines.data[0].period.start * 1000).toISOString().split("T")[0]
            : null;

          await supabase
            .from("renters")
            .update({
              status: "active",
              days_late: 0,
              balance: Math.max(0, Number(renter.balance) - amountPaid),
              rent_collected: Number(renter.rent_collected) + amountPaid,
              paid_through_date: paidThrough,
              next_due_date: nextDue,
            })
            .eq("id", renter.id)
            .eq("user_id", userId);

          await supabase.from("payments").insert({
            renter_id: renter.id,
            user_id: userId,
            amount: amountPaid,
            due_date: paidThrough || new Date().toISOString().split("T")[0],
            paid_date: new Date().toISOString().split("T")[0],
            status: "paid",
            type: "rent",
          });

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: userId,
            type: "payment_succeeded",
            description: `Payment of $${amountPaid.toFixed(2)} succeeded`,
          });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const amountDue = (invoice.amount_due || 0) / 100;

      if (customerId) {
        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id, balance, days_late")
          .eq("user_id", userId)
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (renter) {
          await supabase
            .from("renters")
            .update({
              status: "late",
              balance: Number(renter.balance) + amountDue,
              days_late: Number(renter.days_late) + 1,
            })
            .eq("id", renter.id)
            .eq("user_id", userId);

          await supabase.from("payments").insert({
            renter_id: renter.id,
            user_id: userId,
            amount: amountDue,
            due_date: new Date().toISOString().split("T")[0],
            status: "failed",
            type: "rent",
          });

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: userId,
            type: "payment_failed",
            description: `Payment of $${amountDue.toFixed(2)} failed`,
          });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (customerId) {
        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id")
          .eq("user_id", userId)
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (renter) {
          await supabase
            .from("renters")
            .update({
              stripe_subscription_id: null,
              status: "closed",
            })
            .eq("id", renter.id)
            .eq("user_id", userId);

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: userId,
            type: "note",
            description: "Subscription canceled",
          });
        }
      }
    }

    return jsonResponse({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] Error processing event:", err);

    const { error: cleanupError } = await supabase
      .from("stripe_webhook_events")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", event.id);

    if (cleanupError) {
      console.error("[WEBHOOK] Failed to release webhook dedupe lock after processing error:", cleanupError);
    }

    return jsonResponse({ error: String(err) }, 400);
  }
});

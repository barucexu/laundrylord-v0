import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { getOperatorWebhookEndpointByToken } from "../_shared/operatorWebhooks.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const supabase = createServiceClient();

function getWebhookPathToken(url: string) {
  const pathname = new URL(url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const functionIndex = segments.findIndex((segment) => segment === "stripe-webhook");
  return functionIndex >= 0 && segments.length > functionIndex + 1
    ? segments[functionIndex + 1]
    : null;
}

async function markEventProcessed(eventId: string, userId: string, type: string) {
  const { error } = await supabase
    .from("processed_stripe_events")
    .insert({ event_id: eventId, user_id: userId, type });

  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  throw error;
}

async function buildStripeEvent(req: Request) {
  const webhookPathToken = getWebhookPathToken(req.url);
  if (!webhookPathToken) {
    const legacySecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const sig = req.headers.get("stripe-signature");
    if (!legacySecret || !sig) {
      throw new Error("Webhook path token missing");
    }
    const body = await req.text();
    const tempStripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_stub", {
      apiVersion: "2025-08-27.basil",
    });
    const event = await tempStripe.webhooks.constructEventAsync(body, sig, legacySecret);
    return { endpoint: null, event, compatibilityMode: true };
  }

  const endpoint = await getOperatorWebhookEndpointByToken(webhookPathToken);
  if (!endpoint?.webhookSecret) {
    throw new Error("Webhook endpoint not configured");
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) throw new Error("Missing stripe-signature header");

  const tempStripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_stub", {
    apiVersion: "2025-08-27.basil",
  });
  const event = await tempStripe.webhooks.constructEventAsync(body, sig, endpoint.webhookSecret);
  return { endpoint, event, compatibilityMode: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, event, compatibilityMode } = await buildStripeEvent(req);
    const alreadyProcessed = !compatibilityMode && endpoint
      ? !(await markEventProcessed(event.id, endpoint.user_id, event.type))
      : false;
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "setup") {
        const customerId = session.customer;
        const renterId = session.metadata?.renter_id;

        const renterQuery = supabase
          .from("renters")
          .select("id, user_id");
        const { data: renter } = compatibilityMode
          ? await (renterId
            ? renterQuery.or(`stripe_customer_id.eq.${customerId},id.eq.${renterId}`).maybeSingle()
            : renterQuery.eq("stripe_customer_id", customerId).maybeSingle())
          : await (renterId
            ? renterQuery.eq("user_id", endpoint!.user_id).or(`stripe_customer_id.eq.${customerId},id.eq.${renterId}`).maybeSingle()
            : renterQuery.eq("user_id", endpoint!.user_id).eq("stripe_customer_id", customerId).maybeSingle());

        if (renter?.id) {
          let updateQuery = supabase
            .from("renters")
            .update({ has_payment_method: true })
            .eq("id", renter.id);
          if (!compatibilityMode) updateQuery = updateQuery.eq("user_id", endpoint!.user_id);
          await updateQuery;

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            type: "payment_method_saved",
            description: "Card saved via Stripe checkout",
          });
        }
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const amountPaid = (invoice.amount_paid || 0) / 100;

      let renterQuery = supabase
        .from("renters")
        .select("id, user_id, rent_collected, balance")
        .eq("stripe_customer_id", customerId);
      if (!compatibilityMode) renterQuery = renterQuery.eq("user_id", endpoint!.user_id);
      const { data: renter } = await renterQuery.maybeSingle();

      if (renter) {
        const periodEnd = invoice.lines?.data?.[0]?.period?.end;
        const nextDue = periodEnd ? new Date(periodEnd * 1000).toISOString().split("T")[0] : null;
        const paidThrough = invoice.lines?.data?.[0]?.period?.start
          ? new Date(invoice.lines.data[0].period.start * 1000).toISOString().split("T")[0]
          : null;

        let updateQuery = supabase
          .from("renters")
          .update({
            status: "active",
            days_late: 0,
            balance: Math.max(0, Number(renter.balance) - amountPaid),
            rent_collected: Number(renter.rent_collected) + amountPaid,
            paid_through_date: paidThrough,
            next_due_date: nextDue,
          })
          .eq("id", renter.id);
        if (!compatibilityMode) updateQuery = updateQuery.eq("user_id", endpoint!.user_id);
        await updateQuery;

        await supabase.from("payments").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          amount: amountPaid,
          due_date: paidThrough || new Date().toISOString().split("T")[0],
          paid_date: new Date().toISOString().split("T")[0],
          status: "paid",
          type: "rent",
        });

        await supabase.from("timeline_events").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          type: "payment_succeeded",
          description: `Payment of $${amountPaid.toFixed(2)} succeeded`,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const amountDue = (invoice.amount_due || 0) / 100;

      let renterQuery = supabase
        .from("renters")
        .select("id, user_id, balance, days_late")
        .eq("stripe_customer_id", customerId);
      if (!compatibilityMode) renterQuery = renterQuery.eq("user_id", endpoint!.user_id);
      const { data: renter } = await renterQuery.maybeSingle();

      if (renter) {
        let updateQuery = supabase
          .from("renters")
          .update({
            status: "late",
            balance: Number(renter.balance) + amountDue,
            days_late: Number(renter.days_late) + 1,
          })
          .eq("id", renter.id);
        if (!compatibilityMode) updateQuery = updateQuery.eq("user_id", endpoint!.user_id);
        await updateQuery;

        await supabase.from("payments").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          amount: amountDue,
          due_date: new Date().toISOString().split("T")[0],
          status: "failed",
          type: "rent",
        });

        await supabase.from("timeline_events").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          type: "payment_failed",
          description: `Payment of $${amountDue.toFixed(2)} failed`,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      let renterQuery = supabase
        .from("renters")
        .select("id, user_id")
        .eq("stripe_customer_id", customerId);
      if (!compatibilityMode) renterQuery = renterQuery.eq("user_id", endpoint!.user_id);
      const { data: renter } = await renterQuery.maybeSingle();

      if (renter) {
        let updateQuery = supabase
          .from("renters")
          .update({
            stripe_subscription_id: null,
            status: "closed",
          })
          .eq("id", renter.id);
        if (!compatibilityMode) updateQuery = updateQuery.eq("user_id", endpoint!.user_id);
        await updateQuery;

        await supabase.from("timeline_events").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          type: "note",
          description: "Subscription canceled",
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WEBHOOK] Error processing event:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

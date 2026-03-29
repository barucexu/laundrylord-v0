import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// KNOWN LIMITATION: This webhook uses a single STRIPE_WEBHOOK_SECRET env var.
// Each operator has their own Stripe account, but only one webhook secret can
// be verified at a time. Customer ID lookups work because Stripe customer IDs
// are globally unique, but signature verification only validates against one
// Stripe account's signing secret. Multi-operator webhook routing is not
// solved in this pass.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: any;
  try {
    if (webhookSecret && sig) {
      const tempStripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_stub", {
        apiVersion: "2025-08-27.basil",
      });
      event = await tempStripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      console.warn("[WEBHOOK] No STRIPE_WEBHOOK_SECRET set — skipping signature verification");
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[WEBHOOK] Received event: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode !== "setup") {
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const customerId = session.customer;
      const renterId = session.metadata?.renter_id;
      console.log(`[WEBHOOK] Setup completed for customer ${customerId}, renter ${renterId}`);

      const { data: renter } = await supabase
        .from("renters")
        .select("id, user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      const targetRenterId = renter?.id || renterId;
      const targetUserId = renter?.user_id;

      if (targetRenterId) {
        await supabase
          .from("renters")
          .update({ has_payment_method: true })
          .eq("id", targetRenterId);

        if (targetUserId) {
          await supabase.from("timeline_events").insert({
            renter_id: targetRenterId,
            user_id: targetUserId,
            type: "payment_method_saved",
            description: "Card saved via Stripe checkout",
          });
        }
        console.log(`[WEBHOOK] Updated has_payment_method=true for renter ${targetRenterId}`);
      } else {
        console.warn(`[WEBHOOK] Could not find renter for customer ${customerId}`);
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const amountPaid = (invoice.amount_paid || 0) / 100;

      const { data: renter } = await supabase
        .from("renters")
        .select("id, user_id, rent_collected, balance")
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
          .eq("id", renter.id);

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

      const { data: renter } = await supabase
        .from("renters")
        .select("id, user_id, balance, days_late")
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
          .eq("id", renter.id);

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

      const { data: renter } = await supabase
        .from("renters")
        .select("id, user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (renter) {
        await supabase
          .from("renters")
          .update({
            stripe_subscription_id: null,
            status: "closed",
          })
          .eq("id", renter.id);

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

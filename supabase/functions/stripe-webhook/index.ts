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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback for dev: parse raw body
      event = JSON.parse(body) as Stripe.Event;
      console.warn("[WEBHOOK] No signature verification - dev mode");
    }

    console.log(`[WEBHOOK] ${event.type}`);

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        // Find renter by subscription ID
        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (renter) {
          const periodEnd = new Date((invoice.lines?.data?.[0]?.period?.end || 0) * 1000)
            .toISOString().split("T")[0];

          await supabase
            .from("renters")
            .update({
              paid_through_date: periodEnd,
              next_due_date: periodEnd,
              days_late: 0,
              balance: 0,
            })
            .eq("id", renter.id);

          // Record payment
          await supabase.from("payments").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            amount: (invoice.amount_paid || 0) / 100,
            due_date: new Date((invoice.lines?.data?.[0]?.period?.start || 0) * 1000)
              .toISOString().split("T")[0],
            paid_date: new Date().toISOString().split("T")[0],
            status: "paid",
            type: "rent",
          });

          // Timeline event
          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            type: "payment_succeeded",
            description: `Payment of $${((invoice.amount_paid || 0) / 100).toFixed(2)} succeeded`,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id, days_late, monthly_rate")
          .eq("stripe_subscription_id", subId)
          .single();

        if (renter) {
          await supabase
            .from("renters")
            .update({
              balance: Number(renter.monthly_rate),
              days_late: 1,
            })
            .eq("id", renter.id);

          await supabase.from("payments").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            amount: (invoice.amount_due || 0) / 100,
            due_date: new Date().toISOString().split("T")[0],
            status: "failed",
            type: "rent",
          });

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            type: "payment_failed",
            description: `Payment of $${((invoice.amount_due || 0) / 100).toFixed(2)} failed`,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: renter } = await supabase
          .from("renters")
          .select("id, user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (renter) {
          await supabase
            .from("renters")
            .update({
              stripe_subscription_id: null,
              status: "canceled",
            })
            .eq("id", renter.id);

          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            type: "note",
            description: "Subscription canceled",
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

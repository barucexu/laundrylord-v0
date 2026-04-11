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

    const { renter_id } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await adminClient
      .from("renters")
      .select("*")
      .eq("id", renter_id)
      .eq("user_id", user.id)
      .single();
    if (renterError || !renter) throw new Error("Renter not found");

    const { data: keyRow } = await adminClient
      .from("stripe_keys")
      .select("encrypted_key, webhook_signing_secret")
      .eq("user_id", user.id)
      .maybeSingle();
    const stripeKey = keyRow?.encrypted_key;
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");
    if (!isRenterBillingReady(keyRow)) {
      throw new Error("Finish webhook setup in Settings before sending renter billing links.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const isRealEmail = renter.email && !renter.email.toLowerCase().includes("no email");
    const isRealPhone = renter.phone && !renter.phone.toLowerCase().includes("no phone");

    const createNewCustomer = async () => {
      const customer = await stripe.customers.create({
        name: renter.name,
        email: isRealEmail ? renter.email : undefined,
        phone: isRealPhone ? renter.phone : undefined,
        metadata: { renter_id: renter.id, user_id: user.id },
      });
      await adminClient
        .from("renters")
        .update({ stripe_customer_id: customer.id })
        .eq("id", renter_id)
        .eq("user_id", user.id);
      return customer.id;
    };

    let customerId = renter.stripe_customer_id;
    if (!customerId) {
      customerId = await createNewCustomer();
    } else {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (e) {
        console.warn(`Stale stripe_customer_id ${customerId}, creating new customer`);
        customerId = await createNewCustomer();
      }
    }

    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["us_bank_account", "card"],
      success_url: `${origin}/renters/${renter_id}?setup=success`,
      cancel_url: `${origin}/renters/${renter_id}?setup=canceled`,
      metadata: { renter_id: renter.id, user_id: user.id },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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

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

    const { renter_id } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await supabase
      .from("renters")
      .select("*")
      .eq("id", renter_id)
      .eq("user_id", userData.user.id)
      .single();
    if (renterError || !renter) throw new Error("Renter not found");

    // Get operator's Stripe key from server-only table
    const { data: keyRow } = await supabase
      .from("stripe_keys")
      .select("encrypted_key")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const stripeKey = keyRow?.encrypted_key;
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    let customerId = renter.stripe_customer_id;
    if (!customerId) {
      // Filter out placeholder strings that aren't real contact info
      const isRealEmail = renter.email && !renter.email.toLowerCase().includes("no email");
      const isRealPhone = renter.phone && !renter.phone.toLowerCase().includes("no phone");
      const customer = await stripe.customers.create({
        name: renter.name,
        email: isRealEmail ? renter.email : undefined,
        phone: isRealPhone ? renter.phone : undefined,
        metadata: { renter_id: renter.id, user_id: userData.user.id },
      });
      customerId = customer.id;
      await supabase
        .from("renters")
        .update({ stripe_customer_id: customerId })
        .eq("id", renter_id);
    }

    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";
    // ACH is listed first so Stripe Checkout defaults to bank account (0.8% capped $5)
    // instead of card (2.9% + $0.30). Renters can still choose card if they prefer.
    // Groundwork: bank accounts can be collected but microdeposit verification
    // delays may apply for manual entry. Plaid-linked accounts work immediately.
    // Full ACH subscription support is not complete in this pass.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["us_bank_account", "card"],
      success_url: `${origin}/renters/${renter_id}?setup=success`,
      cancel_url: `${origin}/renters/${renter_id}?setup=canceled`,
      metadata: { renter_id: renter.id },
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

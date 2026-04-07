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

    const { renter_id } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await adminClient
      .from("renters")
      .select("*")
      .eq("id", renter_id)
      .eq("user_id", user.id)
      .single();
    if (renterError || !renter) throw new Error("Renter not found");

    const stripeKey = await getOperatorStripeSecret(user.id);
    if (!stripeKey) throw new Error("Stripe not connected. Add your Stripe key in Settings.");

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
        .eq("id", renter_id);
      return customer.id;
    };

    let customerId = renter.stripe_customer_id;
    if (!customerId) {
      customerId = await createNewCustomer();
    } else {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
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

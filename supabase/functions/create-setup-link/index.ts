import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRenterSetupSession, ensureStripeCustomer, getOwnedRenter, getRequestOrigin, requireOperatorStripe } from "../_shared/renter-billing-stripe.ts";

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

    const renter = await getOwnedRenter(adminClient, user.id, renter_id);
    const stripe = await requireOperatorStripe(
      adminClient,
      user.id,
      "Finish webhook setup in Settings before sending renter billing links.",
    );
    const customerId = await ensureStripeCustomer({ adminClient, stripe, renter });
    const origin = getRequestOrigin(req).replace(/\/$/, "");
    const url = await createRenterSetupSession({
      stripe,
      customerId,
      renter,
      successUrl: `${origin}/renters/${renter_id}?setup=success`,
      cancelUrl: `${origin}/renters/${renter_id}?setup=canceled`,
    });

    return new Response(JSON.stringify({ url }), {
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

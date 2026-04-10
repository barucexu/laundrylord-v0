import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveSaasCustomer } from "../_shared/saas-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { data: settingsRow, error: settingsError } = await supabase
      .from("operator_settings")
      .select("saas_stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settingsError) throw new Error(`Failed to load operator settings: ${settingsError.message}`);

    const resolvedCustomer = await resolveSaasCustomer({
      stripe,
      email: user.email,
      persistedCustomerId: settingsRow?.saas_stripe_customer_id ?? null,
      createIfMissing: false,
      customerName: user.user_metadata?.full_name ?? user.email,
    });
    if (!resolvedCustomer.customerId) throw new Error("No SaaS Stripe customer found");

    const { error: persistError } = await supabase
      .from("operator_settings")
      .upsert(
        {
          user_id: user.id,
          saas_stripe_customer_id: resolvedCustomer.customerId,
        },
        { onConflict: "user_id" },
      );
    if (persistError) throw new Error(`Failed to persist SaaS customer ID: ${persistError.message}`);

    const customerId = resolvedCustomer.customerId;
    const origin = req.headers.get("origin") || "https://laundrylord-v0.lovable.app";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });

    logStep("Portal session created", { url: portalSession.url });
    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

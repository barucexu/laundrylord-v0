import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildRenterBillingConnectionStatus } from "../_shared/renter-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Admin client: bypasses RLS for stripe_keys table
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: keyRow } = await adminClient
      .from("stripe_keys")
      .select("encrypted_key, webhook_endpoint_token, webhook_signing_secret, stripe_account_id, stripe_account_name, stripe_livemode")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeKey = keyRow?.encrypted_key?.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!stripeKey) {
      const status = buildRenterBillingConnectionStatus({
        config: keyRow,
        accountReachable: false,
        supabaseUrl,
      });
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    let nextConfig = keyRow;
    if (res.ok) {
      const account = await res.json();
      nextConfig = {
        ...keyRow,
        stripe_account_id: account.id ?? keyRow?.stripe_account_id ?? null,
        stripe_account_name:
          account.settings?.dashboard?.display_name ||
          account.business_profile?.name ||
          account.email ||
          keyRow?.stripe_account_name ||
          "Stripe Account",
        stripe_livemode: typeof account.livemode === "boolean"
          ? account.livemode
          : keyRow?.stripe_livemode ?? stripeKey.startsWith("sk_live_"),
      };

      await adminClient
        .from("stripe_keys")
        .update({
          stripe_account_id: nextConfig.stripe_account_id,
          stripe_account_name: nextConfig.stripe_account_name,
          stripe_livemode: nextConfig.stripe_livemode,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    const status = buildRenterBillingConnectionStatus({
      config: nextConfig,
      accountReachable: res.ok,
      supabaseUrl,
    });

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ connected: false, reason: "error", message: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

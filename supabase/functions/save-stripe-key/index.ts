import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const { key, webhookSigningSecret } = await req.json();
    if (!key || typeof key !== "string") throw new Error("key is required");

    const trimmed = key.trim();
    if (!trimmed.startsWith("sk_test_") && !trimmed.startsWith("sk_live_")) {
      throw new Error("Key must start with sk_test_ or sk_live_");
    }
    const trimmedWebhookSecret = typeof webhookSigningSecret === "string"
      ? webhookSigningSecret.trim()
      : "";
    if (trimmedWebhookSecret && !trimmedWebhookSecret.startsWith("whsec_")) {
      throw new Error("Webhook signing secret must start with whsec_");
    }

    // Admin client: bypasses RLS for stripe_keys table
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existingRow } = await adminClient
      .from("stripe_keys")
      .select("webhook_endpoint_token, webhook_signing_secret, webhook_configured_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const accountRes = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${trimmed}` },
    });
    if (!accountRes.ok) {
      throw new Error("Invalid Stripe key");
    }
    const account = await accountRes.json();

    const nextWebhookSecret = trimmedWebhookSecret || existingRow?.webhook_signing_secret || null;
    const webhookConfiguredAt = trimmedWebhookSecret
      ? new Date().toISOString()
      : existingRow?.webhook_configured_at || null;
    const webhookEndpointToken = existingRow?.webhook_endpoint_token || crypto.randomUUID();

    const { error } = await adminClient
      .from("stripe_keys")
      .upsert(
        {
          user_id: user.id,
          encrypted_key: trimmed,
          webhook_endpoint_token: webhookEndpointToken,
          webhook_signing_secret: nextWebhookSecret,
          webhook_configured_at: webhookConfiguredAt,
          stripe_account_id: account.id ?? null,
          stripe_account_name:
            account.settings?.dashboard?.display_name ||
            account.business_profile?.name ||
            account.email ||
            "Stripe Account",
          stripe_livemode: typeof account.livemode === "boolean" ? account.livemode : trimmed.startsWith("sk_live_"),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

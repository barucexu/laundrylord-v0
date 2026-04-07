import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { saveOperatorStripeSecret } from "../_shared/operatorStripeSecrets.ts";
import { ensureOperatorWebhookEndpoint, saveOperatorWebhookSecret } from "../_shared/operatorWebhooks.ts";
import { createUserClient } from "../_shared/supabase.ts";

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

    const { key, webhook_secret, stripe_account_label } = await req.json();
    if (!key || typeof key !== "string") throw new Error("key is required");

    const trimmed = key.trim();
    if (!trimmed.startsWith("sk_test_") && !trimmed.startsWith("sk_live_")) {
      throw new Error("Key must start with sk_test_ or sk_live_");
    }

    await saveOperatorStripeSecret(user.id, trimmed);
    const endpoint = webhook_secret && typeof webhook_secret === "string"
      ? await saveOperatorWebhookSecret({
        userId: user.id,
        webhookSecret: webhook_secret.trim(),
        stripeAccountLabel: stripe_account_label ?? null,
      })
      : await ensureOperatorWebhookEndpoint(user.id);

    return new Response(JSON.stringify({
      success: true,
      webhook_path_token: endpoint.webhook_path_token,
      webhook_configured: Boolean(webhook_secret || endpoint.webhook_secret_ciphertext),
    }), {
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

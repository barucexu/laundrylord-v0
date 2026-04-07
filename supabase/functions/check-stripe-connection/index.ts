import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ensureOperatorWebhookEndpoint } from "../_shared/operatorWebhooks.ts";
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

    const stripeKey = await getOperatorStripeSecret(user.id);
    const endpoint = await ensureOperatorWebhookEndpoint(user.id);

    if (!stripeKey || stripeKey.trim() === "") {
      return new Response(JSON.stringify({
        connected: false,
        reason: "no_key",
        webhook_path_token: endpoint.webhook_path_token,
        webhook_configured: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        connected: false,
        reason: "invalid_key",
        webhook_path_token: endpoint.webhook_path_token,
        webhook_configured: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const account = await res.json();
    const serviceClient = createServiceClient();
    const { data: fullEndpoint } = await serviceClient
      .from("operator_webhook_endpoints")
      .select("webhook_path_token, webhook_secret_ciphertext")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        connected: true,
        account_name: account.settings?.dashboard?.display_name || account.business_profile?.name || account.email || "Stripe Account",
        account_id: account.id,
        webhook_path_token: fullEndpoint?.webhook_path_token ?? endpoint.webhook_path_token,
        webhook_configured: Boolean(fullEndpoint?.webhook_secret_ciphertext),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ connected: false, reason: "error", message: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

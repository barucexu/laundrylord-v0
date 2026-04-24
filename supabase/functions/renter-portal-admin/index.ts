import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildPortalExpiration, createPortalToken, hashPortalToken } from "../_shared/renter-portal-tokens.ts";
import { getOwnedRenter, getRequestOrigin } from "../_shared/renter-billing-stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function revokeActiveTokens(adminClient: ReturnType<typeof createClient>, userId: string, renterId: string) {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("renter_portal_tokens")
    .update({ revoked_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("renter_id", renterId)
    .is("revoked_at", null);

  if (error) throw new Error(`Failed to revoke existing portal links: ${error.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, renter_id } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");
    if (!["create", "revoke", "regenerate"].includes(action)) {
      throw new Error("Unsupported action");
    }

    await getOwnedRenter(adminClient, user.id, renter_id);

    if (action === "revoke") {
      await revokeActiveTokens(adminClient, user.id, renter_id);
      return jsonResponse({ revoked: true });
    }

    await revokeActiveTokens(adminClient, user.id, renter_id);

    const rawToken = createPortalToken();
    const tokenHash = await hashPortalToken(rawToken);
    const expiresAt = buildPortalExpiration();

    const { error: insertError } = await adminClient
      .from("renter_portal_tokens")
      .insert({
        user_id: user.id,
        renter_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) throw new Error(`Failed to create renter portal link: ${insertError.message}`);

    const origin = getRequestOrigin(req);
    return jsonResponse({
      url: `${origin.replace(/\/$/, "")}/portal/${rawToken}`,
      expires_at: expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

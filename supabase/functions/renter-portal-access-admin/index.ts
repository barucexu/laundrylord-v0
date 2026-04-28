import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generatePortalPin, generatePortalPinSalt, hashPortalPin } from "../_shared/portal-pin.ts";

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

    const { renter_id } = await req.json();
    if (!renter_id) throw new Error("renter_id is required");

    const { data: renter, error: renterError } = await adminClient
      .from("renters")
      .select("id, user_id, status")
      .eq("id", renter_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (renterError) throw new Error(`Failed to load renter: ${renterError.message}`);
    if (!renter) throw new Error("Renter not found");

    const rawPin = generatePortalPin();
    const salt = generatePortalPinSalt();
    const pinHash = await hashPortalPin(rawPin, salt);
    const now = new Date().toISOString();

    const { error: upsertError } = await adminClient
      .from("renter_portal_access_credentials")
      .upsert({
        user_id: user.id,
        renter_id: renter.id,
        pin_hash: pinHash,
        pin_salt: salt,
        failed_attempts: 0,
        locked_until: null,
        revoked_at: null,
        updated_at: now,
      }, { onConflict: "renter_id" });

    if (upsertError) throw new Error(`Failed to save renter portal PIN: ${upsertError.message}`);

    const { error: revokeSessionError } = await adminClient
      .from("renter_portal_sessions")
      .update({ revoked_at: now })
      .eq("user_id", user.id)
      .eq("renter_id", renter.id)
      .is("revoked_at", null);

    if (revokeSessionError) {
      throw new Error(`Failed to revoke prior renter portal sessions: ${revokeSessionError.message}`);
    }

    return jsonResponse({ pin: rawPin });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : 400;
    return jsonResponse({ error: message }, status);
  }
});

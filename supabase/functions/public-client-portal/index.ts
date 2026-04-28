import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getOperatorPublicProfile, normalizePhone } from "../_shared/operator-public.ts";
import { hashPortalPin } from "../_shared/portal-pin.ts";
import { createPortalToken, hashPortalToken } from "../_shared/renter-portal-tokens.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOGIN_LOCK_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;
const SESSION_TTL_DAYS = 30;
const PORTAL_ALLOWED_STATUSES = new Set([
  "active",
  "late",
  "maintenance",
  "autopay_pending",
  "termination_requested",
  "pickup_scheduled",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireText(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

async function resolvePortalSession(
  adminClient: ReturnType<typeof createClient>,
  rawToken: string,
) {
  const tokenHash = await hashPortalToken(rawToken);
  const { data, error } = await adminClient
    .from("renter_portal_sessions")
    .select("id, user_id, renter_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(`Failed to validate session: ${error.message}`);
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) {
    throw new Error("Portal session expired. Please sign in again.");
  }

  await adminClient
    .from("renter_portal_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { action, operatorSlug, phone, pin, sessionToken, category, description } = await req.json();

    if (action === "profile") {
      const operator = await getOperatorPublicProfile(adminClient, requireText(operatorSlug, "operatorSlug"));
      return jsonResponse({
        business_name: operator.business_name ?? "Laundry rental portal",
        public_slug: operator.public_slug,
      });
    }

    if (action === "login") {
      const operator = await getOperatorPublicProfile(adminClient, requireText(operatorSlug, "operatorSlug"));
      const normalizedInputPhone = normalizePhone(requireText(phone, "Phone"));
      const rawPin = requireText(pin, "PIN");

      const { data: renters, error: rentersError } = await adminClient
        .from("renters")
        .select("id, name, phone, status")
        .eq("user_id", operator.user_id)
        .neq("status", "archived");

      if (rentersError) {
        throw new Error(`Failed to load renter access: ${rentersError.message}`);
      }

      const renter = (renters ?? []).find((entry) => normalizePhone(entry.phone ?? "") === normalizedInputPhone);
      if (!renter || !PORTAL_ALLOWED_STATUSES.has(renter.status)) {
        return jsonResponse({ error: "Phone or PIN not recognized." }, 401);
      }

      const { data: credential, error: credentialError } = await adminClient
        .from("renter_portal_access_credentials")
        .select("id, pin_hash, pin_salt, failed_attempts, locked_until, revoked_at")
        .eq("user_id", operator.user_id)
        .eq("renter_id", renter.id)
        .maybeSingle();

      if (credentialError) {
        throw new Error(`Failed to load portal credential: ${credentialError.message}`);
      }
      if (!credential || credential.revoked_at) {
        return jsonResponse({ error: "Portal access is not ready for this renter yet. Please contact your operator." }, 403);
      }

      if (credential.locked_until && new Date(credential.locked_until).getTime() > Date.now()) {
        return jsonResponse({ error: "Too many login attempts. Please try again later." }, 429);
      }

      const hashedPin = await hashPortalPin(rawPin, credential.pin_salt);
      if (hashedPin !== credential.pin_hash) {
        const nextAttempts = credential.failed_attempts + 1;
        const lockPayload = nextAttempts >= LOGIN_LOCK_ATTEMPTS
          ? {
            failed_attempts: nextAttempts,
            locked_until: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000).toISOString(),
          }
          : { failed_attempts: nextAttempts, locked_until: null };

        await adminClient
          .from("renter_portal_access_credentials")
          .update(lockPayload)
          .eq("id", credential.id);

        const status = nextAttempts >= LOGIN_LOCK_ATTEMPTS ? 429 : 401;
        return jsonResponse({
          error: nextAttempts >= LOGIN_LOCK_ATTEMPTS
            ? "Too many login attempts. Please try again later."
            : "Phone or PIN not recognized.",
        }, status);
      }

      const rawSessionToken = createPortalToken();
      const sessionHash = await hashPortalToken(rawSessionToken);
      const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      await adminClient
        .from("renter_portal_access_credentials")
        .update({
          failed_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", credential.id);

      await adminClient
        .from("renter_portal_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", operator.user_id)
        .eq("renter_id", renter.id)
        .is("revoked_at", null);

      const { error: sessionInsertError } = await adminClient
        .from("renter_portal_sessions")
        .insert({
          user_id: operator.user_id,
          renter_id: renter.id,
          token_hash: sessionHash,
          expires_at: expiresAt,
          last_seen_at: new Date().toISOString(),
        });

      if (sessionInsertError) {
        throw new Error(`Failed to create portal session: ${sessionInsertError.message}`);
      }

      return jsonResponse({
        session_token: rawSessionToken,
        expires_at: expiresAt,
        renter_name: renter.name,
        business_name: operator.business_name,
      });
    }

    if (!sessionToken) {
      throw new Error("sessionToken is required");
    }

    const session = await resolvePortalSession(adminClient, sessionToken);

    if (action === "logout") {
      await adminClient
        .from("renter_portal_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", session.id);
      return jsonResponse({ success: true });
    }

    const { data: renter, error: renterError } = await adminClient
      .from("renters")
      .select("id, name, phone, address, status")
      .eq("id", session.renter_id)
      .eq("user_id", session.user_id)
      .maybeSingle();

    if (renterError) {
      throw new Error(`Failed to load renter portal account: ${renterError.message}`);
    }
    if (!renter) {
      throw new Error("Portal session expired. Please sign in again.");
    }

    if (action === "summary") {
      const [{ data: logs, error: logsError }, { data: operator, error: operatorError }] = await Promise.all([
        adminClient
          .from("maintenance_logs")
          .select("id, issue_category, description, status, reported_date, resolved_date, resolution_notes, created_at")
          .eq("user_id", session.user_id)
          .eq("renter_id", session.renter_id)
          .is("archived_at", null)
          .order("reported_date", { ascending: false }),
        adminClient
          .from("operator_settings")
          .select("business_name")
          .eq("user_id", session.user_id)
          .maybeSingle(),
      ]);

      if (logsError) throw new Error(`Failed to load maintenance requests: ${logsError.message}`);
      if (operatorError) throw new Error(`Failed to load operator name: ${operatorError.message}`);

      return jsonResponse({
        renter: {
          name: renter.name,
          phone: renter.phone,
          address: renter.address,
          status: renter.status,
        },
        operator: {
          business_name: operator?.business_name ?? "Laundry rental portal",
        },
        maintenance_requests: logs ?? [],
      });
    }

    if (action === "create-maintenance") {
      const issueCategory = requireText(category, "Category");
      const body = requireText(description, "Description");

      const { data: createdLog, error: insertError } = await adminClient
        .from("maintenance_logs")
        .insert({
          user_id: session.user_id,
          renter_id: session.renter_id,
          machine_id: null,
          issue_category: issueCategory,
          description: body,
          status: "reported",
          source: "renter_portal",
        })
        .select("id, issue_category, description, status, reported_date, resolved_date, resolution_notes, created_at")
        .single();

      if (insertError) {
        throw new Error(`Failed to create maintenance request: ${insertError.message}`);
      }

      return jsonResponse({ success: true, request: createdLog }, 201);
    }

    throw new Error("Unsupported action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Operator page not found."
      ? 404
      : message === "Portal session expired. Please sign in again."
        ? 401
        : 400;
    return jsonResponse({ error: message }, status);
  }
});

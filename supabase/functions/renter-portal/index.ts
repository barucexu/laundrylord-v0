import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isRenterBillingReady } from "../_shared/renter-billing.ts";
import { buildPortalReturnUrl, getPortalOutstandingBalanceAmountCents, getPortalOutstandingBalanceMetadata } from "../_shared/portal-outstanding-balance.ts";
import { createOutstandingBalanceCheckoutSession, createRenterSetupSession, ensureStripeCustomer, getOwnedRenter, getRequestOrigin, requireOperatorStripe } from "../_shared/renter-billing-stripe.ts";
import { hashPortalToken } from "../_shared/renter-portal-tokens.ts";

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

type PortalTokenRow = {
  renter_id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

async function requireValidPortalToken(
  adminClient: ReturnType<typeof createClient>,
  rawToken: string,
): Promise<PortalTokenRow> {
  const tokenHash = await hashPortalToken(rawToken);
  const { data, error } = await adminClient
    .from("renter_portal_tokens")
    .select("renter_id, user_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(`Failed to validate portal token: ${error.message}`);
  if (!data) throw new Error("Portal link is invalid or expired.");
  if (data.revoked_at) throw new Error("Portal link is invalid or expired.");
  if (new Date(data.expires_at).getTime() <= Date.now()) throw new Error("Portal link is invalid or expired.");

  return data;
}

function getAutopayStatus(renter: {
  status: string | null;
  stripe_subscription_id: string | null;
}) {
  if (renter.status === "autopay_pending") return "pending";
  if (renter.stripe_subscription_id && !["archived", "closed"].includes(renter.status ?? "")) {
    return "active";
  }
  return "inactive";
}

async function buildPortalSummary(adminClient: ReturnType<typeof createClient>, tokenRow: PortalTokenRow) {
  const { data: renter, error: renterError } = await adminClient
    .from("renters")
    .select("id, name, balance, next_due_date, has_payment_method, status, stripe_subscription_id")
    .eq("id", tokenRow.renter_id)
    .eq("user_id", tokenRow.user_id)
    .maybeSingle();

  if (renterError) throw new Error(`Failed to load renter portal summary: ${renterError.message}`);
  if (!renter) throw new Error("Portal link is invalid or expired.");

  const { data: stripeKeyRow, error: stripeError } = await adminClient
    .from("stripe_keys")
    .select("encrypted_key, webhook_endpoint_token, webhook_signing_secret")
    .eq("user_id", tokenRow.user_id)
    .maybeSingle();

  if (stripeError) throw new Error(`Failed to load Stripe readiness: ${stripeError.message}`);

  return {
    renter_name: renter.name,
    balance: Number(renter.balance ?? 0),
    next_due_date: renter.next_due_date,
    autopay_status: getAutopayStatus(renter),
    has_payment_method: !!renter.has_payment_method,
    payment_updates_available: isRenterBillingReady(stripeKeyRow),
    portal_payments_available: isRenterBillingReady(stripeKeyRow) && Number(renter.balance ?? 0) > 0,
    expires_at: tokenRow.expires_at,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, token } = await req.json();
    if (!token) throw new Error("token is required");
    if (!["validate", "summary", "update-payment-method", "pay-outstanding-balance"].includes(action)) {
      throw new Error("Unsupported action");
    }

    const tokenRow = await requireValidPortalToken(adminClient, token);

    if (action === "pay-outstanding-balance") {
      const { data: renter, error: renterError } = await adminClient
        .from("renters")
        .select("id, user_id, name, email, phone, balance, stripe_customer_id, stripe_subscription_id")
        .eq("id", tokenRow.renter_id)
        .eq("user_id", tokenRow.user_id)
        .maybeSingle();

      if (renterError) throw new Error(`Failed to load renter for payment: ${renterError.message}`);
      if (!renter) throw new Error("Portal link is invalid or expired.");

      const amountCents = getPortalOutstandingBalanceAmountCents(renter.balance);
      const stripe = await requireOperatorStripe(
        adminClient,
        tokenRow.user_id,
        "Portal payments are not available right now. Please contact your operator.",
      );
      const customerId = await ensureStripeCustomer({ adminClient, stripe, renter });
      const origin = getRequestOrigin(req).replace(/\/$/, "");
      const metadata = getPortalOutstandingBalanceMetadata({
        renterId: renter.id,
        userId: tokenRow.user_id,
      });
      const url = await createOutstandingBalanceCheckoutSession({
        stripe,
        customerId,
        renter,
        amountCents,
        successUrl: buildPortalReturnUrl(origin, token, "success"),
        cancelUrl: buildPortalReturnUrl(origin, token, "canceled"),
        metadata,
      });

      return jsonResponse({ url });
    }

    if (action === "update-payment-method") {
      const renter = await getOwnedRenter(adminClient, tokenRow.user_id, tokenRow.renter_id);
      const stripe = await requireOperatorStripe(
        adminClient,
        tokenRow.user_id,
        "Payment updates are not available right now. Please contact your operator.",
      );
      const customerId = await ensureStripeCustomer({ adminClient, stripe, renter });
      const origin = getRequestOrigin(req).replace(/\/$/, "");
      const url = await createRenterSetupSession({
        stripe,
        customerId,
        renter,
        successUrl: `${buildPortalReturnUrl(origin, token, "success").replace("?payment=success", "?setup=success")}`,
        cancelUrl: `${buildPortalReturnUrl(origin, token, "canceled").replace("?payment=canceled", "?setup=canceled")}`,
      });

      return jsonResponse({ url });
    }

    const summary = await buildPortalSummary(adminClient, tokenRow);
    return jsonResponse({
      valid: true,
      ...summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Portal link is invalid or expired." ? 404 : 400;
    return jsonResponse({ error: message }, status);
  }
});

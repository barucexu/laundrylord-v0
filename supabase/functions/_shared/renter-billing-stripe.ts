import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isRenterBillingReady } from "./renter-billing.ts";

const FALLBACK_APP_ORIGIN = "https://laundrylord-v0.lovable.app";

export type RenterStripeSummary = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export async function getOwnedRenter(
  adminClient: SupabaseClient,
  userId: string,
  renterId: string,
): Promise<RenterStripeSummary> {
  const { data: renter, error } = await adminClient
    .from("renters")
    .select("id, user_id, name, email, phone, stripe_customer_id, stripe_subscription_id")
    .eq("id", renterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load renter: ${error.message}`);
  if (!renter) throw new Error("Renter not found");
  return renter;
}

export async function requireOperatorStripe(
  adminClient: SupabaseClient,
  userId: string,
  missingWebhookMessage: string,
): Promise<Stripe> {
  const { data: keyRow, error } = await adminClient
    .from("stripe_keys")
    .select("encrypted_key, webhook_endpoint_token, webhook_signing_secret")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load Stripe settings: ${error.message}`);
  if (!keyRow?.encrypted_key) {
    throw new Error("Stripe not connected. Add your Stripe key in Settings.");
  }
  if (!isRenterBillingReady(keyRow)) {
    throw new Error(missingWebhookMessage);
  }

  return new Stripe(keyRow.encrypted_key, { apiVersion: "2025-08-27.basil" });
}

function isRealEmail(value: string | null): boolean {
  return !!value && !value.toLowerCase().includes("no email");
}

function isRealPhone(value: string | null): boolean {
  return !!value && !value.toLowerCase().includes("no phone");
}

export async function ensureStripeCustomer(args: {
  adminClient: SupabaseClient;
  stripe: Stripe;
  renter: RenterStripeSummary;
}): Promise<string> {
  const { adminClient, stripe, renter } = args;

  const createNewCustomer = async () => {
    const customer = await stripe.customers.create({
      name: renter.name ?? undefined,
      email: isRealEmail(renter.email) ? renter.email ?? undefined : undefined,
      phone: isRealPhone(renter.phone) ? renter.phone ?? undefined : undefined,
      metadata: { renter_id: renter.id, user_id: renter.user_id },
    });

    const { error } = await adminClient
      .from("renters")
      .update({ stripe_customer_id: customer.id })
      .eq("id", renter.id)
      .eq("user_id", renter.user_id);

    if (error) throw new Error(`Failed to persist Stripe customer: ${error.message}`);
    return customer.id;
  };

  if (!renter.stripe_customer_id) {
    return createNewCustomer();
  }

  try {
    await stripe.customers.retrieve(renter.stripe_customer_id);
    return renter.stripe_customer_id;
  } catch (_error) {
    console.warn(`[renter-billing] stale stripe_customer_id ${renter.stripe_customer_id}; creating replacement`);
    return createNewCustomer();
  }
}

export function getRequestOrigin(req: Request): string {
  return req.headers.get("origin")?.trim() || FALLBACK_APP_ORIGIN;
}

export async function createRenterSetupSession(args: {
  stripe: Stripe;
  customerId: string;
  renter: Pick<RenterStripeSummary, "id" | "user_id" | "stripe_subscription_id">;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const { stripe, customerId, renter, successUrl, cancelUrl } = args;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "setup",
    payment_method_types: ["us_bank_account", "card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      renter_id: renter.id,
      user_id: renter.user_id,
      setup_purpose: renter.stripe_subscription_id ? "update_payment_method" : "initial_setup",
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a setup session URL");
  }

  return session.url;
}

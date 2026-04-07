import { createServiceClient } from "./supabase.ts";
import { decryptString, encryptString } from "./crypto.ts";

type WebhookEndpointRow = {
  id: string;
  user_id: string;
  stripe_account_label: string | null;
  webhook_secret_ciphertext: string | null;
  webhook_secret_iv_or_nonce: string | null;
  webhook_secret_key_version: number | null;
  webhook_path_token: string;
  active: boolean;
};

function createWebhookPathToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureOperatorWebhookEndpoint(userId: string) {
  const serviceClient = createServiceClient();
  const { data: existing, error: readError } = await serviceClient
    .from("operator_webhook_endpoints")
    .select("id, user_id, stripe_account_label, webhook_secret_ciphertext, webhook_secret_iv_or_nonce, webhook_secret_key_version, webhook_path_token, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing as WebhookEndpointRow;

  const { data, error } = await serviceClient
    .from("operator_webhook_endpoints")
    .insert({
      user_id: userId,
      webhook_path_token: createWebhookPathToken(),
      active: true,
    })
    .select("id, user_id, stripe_account_label, webhook_secret_ciphertext, webhook_secret_iv_or_nonce, webhook_secret_key_version, webhook_path_token, active")
    .single();

  if (error) throw error;
  return data as WebhookEndpointRow;
}

export async function saveOperatorWebhookSecret(args: {
  userId: string;
  webhookSecret: string;
  stripeAccountLabel?: string | null;
}) {
  const endpoint = await ensureOperatorWebhookEndpoint(args.userId);
  const encrypted = await encryptString(args.webhookSecret);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("operator_webhook_endpoints")
    .update({
      stripe_account_label: args.stripeAccountLabel ?? endpoint.stripe_account_label,
      webhook_secret_ciphertext: encrypted.ciphertext,
      webhook_secret_iv_or_nonce: encrypted.ivOrNonce,
      webhook_secret_key_version: encrypted.keyVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", endpoint.id);

  if (error) throw error;
  return {
    ...endpoint,
    stripe_account_label: args.stripeAccountLabel ?? endpoint.stripe_account_label,
  };
}

export async function getOperatorWebhookEndpointByToken(webhookPathToken: string) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("operator_webhook_endpoints")
    .select("id, user_id, stripe_account_label, webhook_secret_ciphertext, webhook_secret_iv_or_nonce, webhook_secret_key_version, webhook_path_token, active")
    .eq("webhook_path_token", webhookPathToken)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let webhookSecret: string | null = null;
  if (data.webhook_secret_ciphertext && data.webhook_secret_iv_or_nonce && data.webhook_secret_key_version !== null) {
    webhookSecret = await decryptString({
      ciphertext: data.webhook_secret_ciphertext,
      ivOrNonce: data.webhook_secret_iv_or_nonce,
      keyVersion: data.webhook_secret_key_version,
    });
  }

  return { ...data, webhookSecret };
}

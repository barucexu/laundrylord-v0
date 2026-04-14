export type StripeKeyConfigLike = {
  encrypted_key?: string | null;
  webhook_endpoint_token?: string | null;
  webhook_signing_secret?: string | null;
  webhook_configured_at?: string | null;
  stripe_account_id?: string | null;
  stripe_account_name?: string | null;
  stripe_livemode?: boolean | null;
};

export type RenterBillingReason = "no_key" | "invalid_key" | "webhook_missing" | "ready";

export type RenterBillingConnection = {
  connected: boolean;
  webhook_configured: boolean;
  renter_billing_ready: boolean;
  reason: RenterBillingReason;
  account_name: string | null;
  account_id: string | null;
  stripe_livemode: boolean | null;
  webhook_url: string | null;
};

function clean(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildWebhookUrl(supabaseUrl?: string | null, token?: string | null): string | null {
  const baseUrl = clean(supabaseUrl);
  const endpointToken = clean(token);
  if (!baseUrl || !endpointToken) return null;
  return `${baseUrl.replace(/\/$/, "")}/functions/v1/stripe-webhook?token=${endpointToken}`;
}

export function hasStripeKey(config?: StripeKeyConfigLike | null): boolean {
  return clean(config?.encrypted_key) !== null;
}

export function hasWebhookSecret(config?: StripeKeyConfigLike | null): boolean {
  return clean(config?.webhook_signing_secret) !== null;
}

export function hasWebhookEndpointToken(config?: StripeKeyConfigLike | null): boolean {
  return clean(config?.webhook_endpoint_token) !== null;
}

export function isRenterBillingReady(config?: StripeKeyConfigLike | null): boolean {
  return hasStripeKey(config) && hasWebhookSecret(config) && hasWebhookEndpointToken(config);
}

export function buildRenterBillingConnectionStatus(args: {
  config?: StripeKeyConfigLike | null;
  accountReachable: boolean;
  supabaseUrl?: string | null;
}): RenterBillingConnection {
  const { config, accountReachable, supabaseUrl } = args;
  const keyPresent = hasStripeKey(config);
  const webhookConfigured = hasWebhookSecret(config) && hasWebhookEndpointToken(config);
  const webhookUrl = buildWebhookUrl(supabaseUrl, config?.webhook_endpoint_token);

  if (!keyPresent) {
    return {
      connected: false,
      webhook_configured: webhookConfigured,
      renter_billing_ready: false,
      reason: "no_key",
      account_name: null,
      account_id: null,
      stripe_livemode: config?.stripe_livemode ?? null,
      webhook_url: webhookUrl,
    };
  }

  if (!accountReachable) {
    return {
      connected: false,
      webhook_configured: webhookConfigured,
      renter_billing_ready: false,
      reason: "invalid_key",
      account_name: config?.stripe_account_name ?? null,
      account_id: config?.stripe_account_id ?? null,
      stripe_livemode: config?.stripe_livemode ?? null,
      webhook_url: webhookUrl,
    };
  }

  if (!webhookConfigured) {
    return {
      connected: true,
      webhook_configured: false,
      renter_billing_ready: false,
      reason: "webhook_missing",
      account_name: config?.stripe_account_name ?? null,
      account_id: config?.stripe_account_id ?? null,
      stripe_livemode: config?.stripe_livemode ?? null,
      webhook_url: webhookUrl,
    };
  }

  return {
    connected: true,
    webhook_configured: true,
    renter_billing_ready: true,
    reason: "ready",
    account_name: config?.stripe_account_name ?? null,
    account_id: config?.stripe_account_id ?? null,
    stripe_livemode: config?.stripe_livemode ?? null,
    webhook_url: webhookUrl,
  };
}

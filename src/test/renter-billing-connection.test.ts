import { describe, expect, it } from "vitest";
import {
  buildRenterBillingConnectionStatus,
  buildWebhookUrl,
  hasWebhookEndpointToken,
  isRenterBillingReady,
} from "../../supabase/functions/_shared/renter-billing";

describe("renter billing connection helpers", () => {
  it("builds the operator-specific webhook URL", () => {
    expect(buildWebhookUrl("https://olbedjfebvbojlahhvpq.supabase.co", "token-123")).toBe(
      "https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/stripe-webhook?token=token-123",
    );
  });

  it("marks renter billing ready only when key and webhook secret are both present", () => {
    expect(hasWebhookEndpointToken({ webhook_endpoint_token: "token-123" })).toBe(true);
    expect(isRenterBillingReady({
      encrypted_key: "sk_test_123",
      webhook_endpoint_token: "token-123",
      webhook_signing_secret: "whsec_123",
    })).toBe(true);
    expect(isRenterBillingReady({ encrypted_key: "sk_test_123", webhook_signing_secret: null })).toBe(false);
    expect(isRenterBillingReady({ encrypted_key: null, webhook_signing_secret: "whsec_123" })).toBe(false);
    expect(isRenterBillingReady({
      encrypted_key: "sk_test_123",
      webhook_endpoint_token: null,
      webhook_signing_secret: "whsec_123",
    })).toBe(false);
  });

  it("returns webhook_missing when Stripe account is valid but webhook is not configured", () => {
    const status = buildRenterBillingConnectionStatus({
      config: {
        encrypted_key: "sk_live_123",
        webhook_endpoint_token: null,
        webhook_signing_secret: null,
        stripe_account_name: "LaundryLord Operator",
      },
      accountReachable: true,
      supabaseUrl: "https://olbedjfebvbojlahhvpq.supabase.co",
    });

    expect(status).toMatchObject({
      connected: true,
      webhook_configured: false,
      renter_billing_ready: false,
      reason: "webhook_missing",
      account_name: "LaundryLord Operator",
    });
    expect(status.webhook_url).toBeNull();
  });

  it("returns ready when key, webhook secret, and Stripe account are all valid", () => {
    const status = buildRenterBillingConnectionStatus({
      config: {
        encrypted_key: "sk_live_123",
        webhook_endpoint_token: "token-123",
        webhook_signing_secret: "whsec_123",
        stripe_account_id: "acct_123",
        stripe_account_name: "LaundryLord Operator",
        stripe_livemode: true,
      },
      accountReachable: true,
      supabaseUrl: "https://olbedjfebvbojlahhvpq.supabase.co",
    });

    expect(status).toMatchObject({
      connected: true,
      webhook_configured: true,
      renter_billing_ready: true,
      reason: "ready",
      account_id: "acct_123",
      stripe_livemode: true,
    });
  });
});

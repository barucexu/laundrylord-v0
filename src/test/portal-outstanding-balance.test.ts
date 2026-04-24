import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PORTAL_OUTSTANDING_BALANCE_PURPOSE,
  buildPortalReturnUrl,
  getPortalOutstandingBalanceAmountCents,
  getPortalOutstandingBalanceMetadata,
  getStripeObjectId,
  hasPortalOutstandingBalancePurpose,
} from "../../supabase/functions/_shared/portal-outstanding-balance";

describe("portal outstanding balance helpers", () => {
  it("rejects zero and negative balances", () => {
    expect(() => getPortalOutstandingBalanceAmountCents(0)).toThrow("Outstanding balance must be greater than zero.");
    expect(() => getPortalOutstandingBalanceAmountCents(-12)).toThrow("Outstanding balance must be greater than zero.");
  });

  it("converts a positive balance to cents", () => {
    expect(getPortalOutstandingBalanceAmountCents(182.5)).toBe(18250);
  });

  it("marks portal outstanding-balance metadata consistently", () => {
    const metadata = getPortalOutstandingBalanceMetadata({
      renterId: "renter-1",
      userId: "user-1",
    });

    expect(metadata).toEqual({
      renter_id: "renter-1",
      user_id: "user-1",
      portal_action: PORTAL_OUTSTANDING_BALANCE_PURPOSE,
    });
    expect(hasPortalOutstandingBalancePurpose(metadata)).toBe(true);
    expect(hasPortalOutstandingBalancePurpose({ portal_action: "setup" })).toBe(false);
  });

  it("extracts Stripe ids from strings and object forms", () => {
    expect(getStripeObjectId("pi_123")).toBe("pi_123");
    expect(getStripeObjectId({ id: "pi_456" })).toBe("pi_456");
    expect(getStripeObjectId(null)).toBeNull();
  });

  it("builds portal return urls for Stripe redirects", () => {
    expect(buildPortalReturnUrl("https://laundrylord.app/", "token-123", "success"))
      .toBe("https://laundrylord.app/portal/token-123?payment=success");
  });
});

describe("portal outstanding balance integration contracts", () => {
  it("keeps portal payment handling inside renter-billing paths and out of SaaS checkout", () => {
    const webhookSource = readFileSync(
      `${process.cwd()}/supabase/functions/stripe-webhook/index.ts`,
      "utf8",
    );
    const portalSource = readFileSync(
      `${process.cwd()}/supabase/functions/renter-portal/index.ts`,
      "utf8",
    );
    const saasCheckoutSource = readFileSync(
      `${process.cwd()}/supabase/functions/create-checkout/index.ts`,
      "utf8",
    );

    expect(portalSource).toContain(`"pay-outstanding-balance"`);
    expect(webhookSource).toContain(`event.type === "checkout.session.completed"`);
    expect(webhookSource).toContain(`event.type === "payment_intent.payment_failed"`);
    expect(webhookSource).toContain("stripe_checkout_session_id");
    expect(webhookSource).toContain("stripe_payment_intent_id");
    expect(saasCheckoutSource).not.toContain(PORTAL_OUTSTANDING_BALANCE_PURPOSE);
  });
});

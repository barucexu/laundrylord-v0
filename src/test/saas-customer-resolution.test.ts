import { describe, expect, it, vi } from "vitest";
import {
  SAAS_PRODUCT_IDS,
  findSubscribedCustomer,
  getSaasProductId,
  resolveSaasCustomer,
  type StripeSubscriptionLike,
} from "../../supabase/functions/_shared/saas-billing";

function makeSubscription(id: string, productId: string): StripeSubscriptionLike {
  return {
    id,
    current_period_end: 1_800_000_000,
    items: {
      data: [
        {
          price: {
            product: productId,
          },
        },
      ],
    },
  };
}

function makeStripeClient(options?: {
  retrievedCustomers?: Record<string, { id: string; deleted?: boolean }>;
  customersByEmail?: Record<string, Array<{ id: string; deleted?: boolean }>>;
  subscriptionsByCustomer?: Record<string, StripeSubscriptionLike[]>;
}) {
  const retrievedCustomers = options?.retrievedCustomers ?? {};
  const customersByEmail = options?.customersByEmail ?? {};
  const subscriptionsByCustomer = options?.subscriptionsByCustomer ?? {};

  return {
    customers: {
      retrieve: vi.fn(async (customerId: string) => {
        const customer = retrievedCustomers[customerId];
        if (!customer) {
          throw new Error(`No such customer: ${customerId}`);
        }
        return customer;
      }),
      list: vi.fn(async ({ email }: { email: string; limit: number }) => ({
        data: customersByEmail[email] ?? [],
      })),
      create: vi.fn(async ({ email, name }: { email: string; name?: string }) => ({
        id: `cus_created_${email}`,
        name,
      })),
    },
    subscriptions: {
      list: vi.fn(async ({ customer }: { customer: string; status: "active"; limit: number }) => ({
        data: subscriptionsByCustomer[customer] ?? [],
      })),
    },
  };
}

describe("saas billing customer resolution", () => {
  const saasProductId = [...SAAS_PRODUCT_IDS][1];
  const nonSaasProductId = "prod_other_123";

  it("detects LaundryLord subscriptions by product id", () => {
    expect(getSaasProductId(makeSubscription("sub_live", saasProductId))).toBe(saasProductId);
    expect(getSaasProductId(makeSubscription("sub_other", nonSaasProductId))).toBeNull();
  });

  it("finds the subscribed customer when multiple Stripe customers share one email", async () => {
    const stripe = makeStripeClient({
      customersByEmail: {
        "founder@example.com": [
          { id: "cus_old" },
          { id: "cus_live" },
        ],
      },
      subscriptionsByCustomer: {
        cus_old: [makeSubscription("sub_old", nonSaasProductId)],
        cus_live: [makeSubscription("sub_live", saasProductId)],
      },
    });

    const result = await findSubscribedCustomer(stripe, "founder@example.com");

    expect(result).toMatchObject({
      customerId: "cus_live",
      productId: saasProductId,
    });
  });

  it("uses a persisted Stripe customer id when it is still valid", async () => {
    const stripe = makeStripeClient({
      retrievedCustomers: {
        cus_persisted: { id: "cus_persisted" },
      },
      subscriptionsByCustomer: {
        cus_persisted: [makeSubscription("sub_live", saasProductId)],
      },
    });

    const result = await resolveSaasCustomer({
      stripe,
      email: "founder@example.com",
      persistedCustomerId: "cus_persisted",
      createIfMissing: false,
    });

    expect(result).toMatchObject({
      customerId: "cus_persisted",
      activeProductId: saasProductId,
      created: false,
    });
    expect(stripe.customers.list).not.toHaveBeenCalled();
  });

  it("recovers from a stale persisted customer id by finding the subscribed customer on the same email", async () => {
    const stripe = makeStripeClient({
      customersByEmail: {
        "founder@example.com": [
          { id: "cus_old" },
          { id: "cus_live" },
        ],
      },
      subscriptionsByCustomer: {
        cus_old: [],
        cus_live: [makeSubscription("sub_live", saasProductId)],
      },
    });

    const result = await resolveSaasCustomer({
      stripe,
      email: "founder@example.com",
      persistedCustomerId: "cus_missing",
      createIfMissing: false,
    });

    expect(result).toMatchObject({
      customerId: "cus_live",
      activeProductId: saasProductId,
      created: false,
    });
  });

  it("creates a fresh SaaS customer only when checkout needs one", async () => {
    const stripe = makeStripeClient({
      customersByEmail: {
        "founder@example.com": [{ id: "cus_old" }],
      },
      subscriptionsByCustomer: {
        cus_old: [makeSubscription("sub_other", nonSaasProductId)],
      },
    });

    const result = await resolveSaasCustomer({
      stripe,
      email: "founder@example.com",
      createIfMissing: true,
      customerName: "Founder",
      metadata: {
        laundrylord_user_id: "user-1",
      },
    });

    expect(result).toMatchObject({
      customerId: "cus_created_founder@example.com",
      activeSubscription: null,
      activeProductId: null,
      created: true,
    });
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
  });
});

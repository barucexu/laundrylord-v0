export const SAAS_PRODUCT_IDS = new Set([
  "prod_UJ58t9MVJy9kM1", // Starter
  "prod_UJ58vllhfPnDMA", // Growth
  "prod_UJ58WKvIfBSgVF", // Pro
  "prod_UJ58Un0dqdr1bw", // Scale
  "prod_UJ570aXFf4kHyD", // Business
  "prod_UJ57FSgV0zgrlb", // Enterprise
  "prod_UJ57tGh0ISMKcj", // Portfolio
  "prod_UJ57Jy6PV80WrY", // Empire
  "prod_UJ57nRhlCMzAzY", // Ultimate
]);

type StripeProductLike = string | { id?: string } | null | undefined;

export type StripeSubscriptionLike = {
  id: string;
  current_period_end?: number | string | null;
  items: {
    data: Array<{
      price: {
        product: StripeProductLike;
      };
    }>;
  };
};

type StripeCustomerLike = {
  id: string;
  deleted?: boolean;
};

type StripeClientLike = {
  customers: {
    retrieve: (customerId: string) => Promise<StripeCustomerLike>;
    list: (params: { email: string; limit: number }) => Promise<{ data: StripeCustomerLike[] }>;
    create: (params: {
      email: string;
      name?: string;
      metadata?: Record<string, string>;
    }) => Promise<StripeCustomerLike>;
  };
  subscriptions: {
    list: (params: {
      customer: string;
      status: "active";
      limit: number;
    }) => Promise<{ data: StripeSubscriptionLike[] }>;
  };
};

export function getProductId(product: StripeProductLike): string | null {
  if (!product) return null;
  return typeof product === "string" ? product : product.id ?? null;
}

export function getSaasProductId(
  subscription: StripeSubscriptionLike,
  allowedProductIds: Set<string> = SAAS_PRODUCT_IDS,
): string | null {
  for (const item of subscription.items.data) {
    const productId = getProductId(item.price.product);
    if (productId !== null && allowedProductIds.has(productId)) return productId;
  }
  return null;
}

export async function findSubscribedCustomer(
  stripe: StripeClientLike,
  email: string,
  allowedProductIds: Set<string> = SAAS_PRODUCT_IDS,
): Promise<{ customerId: string; subscription: StripeSubscriptionLike; productId: string } | null> {
  const customers = await stripe.customers.list({ email, limit: 100 });

  for (const customer of customers.data) {
    if (customer.deleted) continue;
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 50,
    });
    const subscription = subscriptions.data.find((sub) => getSaasProductId(sub, allowedProductIds) !== null);
    if (subscription) {
      return {
        customerId: customer.id,
        subscription,
        productId: getSaasProductId(subscription, allowedProductIds)!,
      };
    }
  }

  return null;
}

export async function resolveSaasCustomer(params: {
  stripe: StripeClientLike;
  email: string;
  persistedCustomerId?: string | null;
  createIfMissing?: boolean;
  customerName?: string | null;
  metadata?: Record<string, string>;
}): Promise<{
  customerId: string | null;
  activeSubscription: StripeSubscriptionLike | null;
  activeProductId: string | null;
  created: boolean;
}> {
  const {
    stripe,
    email,
    persistedCustomerId,
    createIfMissing = false,
    customerName,
    metadata,
  } = params;

  if (persistedCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(persistedCustomerId);
      if (!customer.deleted) {
        const subscriptions = await stripe.subscriptions.list({
          customer: persistedCustomerId,
          status: "active",
          limit: 50,
        });
        const activeSubscription = subscriptions.data.find((sub) => getSaasProductId(sub) !== null) ?? null;
        return {
          customerId: persistedCustomerId,
          activeSubscription,
          activeProductId: activeSubscription ? getSaasProductId(activeSubscription) : null,
          created: false,
        };
      }
    } catch {
      // Stale or deleted persisted customer ID — recover through email search.
    }
  }

  const subscribedCustomer = await findSubscribedCustomer(stripe, email);
  if (subscribedCustomer) {
    return {
      customerId: subscribedCustomer.customerId,
      activeSubscription: subscribedCustomer.subscription,
      activeProductId: subscribedCustomer.productId,
      created: false,
    };
  }

  if (!createIfMissing) {
    return {
      customerId: null,
      activeSubscription: null,
      activeProductId: null,
      created: false,
    };
  }

  const customer = await stripe.customers.create({
    email,
    name: customerName ?? undefined,
    metadata,
  });

  return {
    customerId: customer.id,
    activeSubscription: null,
    activeProductId: null,
    created: true,
  };
}

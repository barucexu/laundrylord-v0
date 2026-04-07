import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/cors.ts";
import { findPlanByProductId, findPlanForCount, getActiveSaaSPlans } from "../_shared/saasPlans.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

function toClientPlan(plan: ReturnType<typeof findPlanForCount>) {
  if (!plan) return null;
  return {
    name: plan.name,
    label: plan.display_label,
    min: plan.min_count,
    max: plan.max_count ?? Infinity,
    product_id: plan.product_id,
    price_id: plan.price_id,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Auth header missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createUserClient(authHeader);

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: `Auth error: ${claimsError?.message ?? "Invalid token"}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email in token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId, email });

    const serviceClient = createServiceClient();
    const activePlans = await getActiveSaaSPlans();

    const { count: activeOperationalCount } = await serviceClient
      .from("renters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "archived");

    const nowIso = new Date().toISOString();
    const { count: billableArchivedCount } = await serviceClient
      .from("renters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "archived")
      .gt("billable_until", nowIso);

    const billableCount = (activeOperationalCount ?? 0) + (billableArchivedCount ?? 0);

    const syncOperatorPlanState = async ({
      subscribed,
      productId,
      subscriptionEnd,
    }: {
      subscribed: boolean;
      productId: string | null;
      subscriptionEnd: string | null;
    }) => {
      const { error: syncError } = await serviceClient
        .from("operator_settings")
        .upsert(
          {
            user_id: userId,
            saas_subscribed: subscribed,
            saas_product_id: productId,
            saas_subscription_end: subscriptionEnd,
          },
          { onConflict: "user_id" },
        );

      if (syncError) {
        throw new Error(`Failed to sync operator plan state: ${syncError.message}`);
      }
    };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });

    let subscribed = false;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        subscribed = true;
        productId = typeof sub.items.data[0]?.price?.product === "string"
          ? sub.items.data[0].price.product
          : sub.items.data[0]?.price?.product?.id ?? null;

        try {
          const endVal = sub.current_period_end;
          if (typeof endVal === "number" && endVal > 0) {
            subscriptionEnd = new Date(endVal * 1000).toISOString();
          } else if (typeof endVal === "string") {
            subscriptionEnd = endVal;
          }
        } catch {
          logStep("Could not parse current_period_end", { raw: sub.current_period_end });
        }

        logStep("Active subscription found", { subscriptionId: sub.id, productId, subscriptionEnd });
      }
    }

    await syncOperatorPlanState({ subscribed, productId, subscriptionEnd });

    const requiredTier = findPlanForCount(activePlans, billableCount);
    const currentBilledTier = findPlanByProductId(activePlans, productId);
    const allowedCapacity = subscribed
      ? currentBilledTier?.max_count ?? null
      : activePlans.find((plan) => plan.name === "Free")?.max_count ?? 10;

    return new Response(
      JSON.stringify({
        subscribed,
        product_id: productId,
        subscription_end: subscriptionEnd,
        current_billed_tier: toClientPlan(currentBilledTier),
        required_tier: toClientPlan(requiredTier),
        allowed_capacity: allowedCapacity,
        billable_count: billableCount,
        active_operational_count: activeOperationalCount ?? 0,
        billable_archived_count: billableArchivedCount ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import { createServiceClient } from "./supabase.ts";

export type SaaSPlanRow = {
  name: string;
  display_label: string;
  product_id: string | null;
  price_id: string | null;
  min_count: number;
  max_count: number | null;
  sort_order: number;
  active: boolean;
};

export async function getActiveSaaSPlans() {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("saas_plans")
    .select("name, display_label, product_id, price_id, min_count, max_count, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SaaSPlanRow[];
}

export function findPlanForCount(plans: SaaSPlanRow[], totalRenters: number) {
  const normalizedCount = Math.max(totalRenters, 1);
  return plans.find((plan) => normalizedCount >= plan.min_count && (plan.max_count === null || normalizedCount <= plan.max_count)) ?? plans[0] ?? null;
}

export function findPlanByProductId(plans: SaaSPlanRow[], productId: string | null | undefined) {
  if (!productId) return null;
  return plans.find((plan) => plan.product_id === productId) ?? null;
}

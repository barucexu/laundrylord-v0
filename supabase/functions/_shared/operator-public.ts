import { createClient } from "npm:@supabase/supabase-js@2";

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function getRequestIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? null;
}

export function getRequestUserAgent(req: Request) {
  return req.headers.get("user-agent");
}

export async function getOperatorPublicProfile(
  adminClient: ReturnType<typeof createClient>,
  slug: string,
) {
  const { data, error } = await adminClient
    .from("operator_settings")
    .select("user_id, business_name, public_slug, public_responsibility_template, public_responsibility_version")
    .eq("public_slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load operator profile: ${error.message}`);
  if (!data?.user_id || !data.public_slug) throw new Error("Operator page not found.");
  return data;
}

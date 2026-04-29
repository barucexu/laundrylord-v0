import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireText(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

function buildPortalSmsMessage(args: {
  renterName: string | null;
  operatorName: string | null;
  portalUrl: string;
  pin: string;
}) {
  const greetingName = args.renterName?.trim() || "there";
  const operatorName = args.operatorName?.trim() || "your LaundryLord operator";

  return `Hi ${greetingName}, here is your LaundryLord client portal for billing and maintenance with ${operatorName}: ${args.portalUrl} Your PIN is ${args.pin}.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { renter_id, portal_url, pin } = await req.json();
    const renterId = requireText(renter_id, "renter_id");
    const portalUrl = requireText(portal_url, "portal_url");
    const rawPin = requireText(pin, "pin");

    const [{ data: renter, error: renterError }, { data: operator, error: operatorError }] = await Promise.all([
      adminClient
        .from("renters")
        .select("id, user_id, name, phone")
        .eq("id", renterId)
        .eq("user_id", user.id)
        .maybeSingle(),
      adminClient
        .from("operator_settings")
        .select("business_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (renterError) throw new Error(`Failed to load renter: ${renterError.message}`);
    if (operatorError) throw new Error(`Failed to load operator settings: ${operatorError.message}`);
    if (!renter) throw new Error("Renter not found");
    if (!renter.phone?.trim()) throw new Error("Renter does not have a phone number on file");

    const message = buildPortalSmsMessage({
      renterName: renter.name,
      operatorName: operator?.business_name ?? null,
      portalUrl,
      pin: rawPin,
    });

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      return jsonResponse({
        success: false,
        sms_configured: false,
        preview_message: message,
        phone: renter.phone,
      });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const body = new URLSearchParams({
      To: renter.phone,
      From: fromNumber,
      Body: message,
    });

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!twilioResponse.ok) {
      const twilioErrorText = await twilioResponse.text();
      throw new Error(`Twilio send failed: ${twilioErrorText}`);
    }

    const twilioPayload = await twilioResponse.json();

    return jsonResponse({
      success: true,
      sms_configured: true,
      sid: twilioPayload.sid ?? null,
      preview_message: message,
      phone: renter.phone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" ? 401 : 400;
    return jsonResponse({ error: message }, status);
  }
});

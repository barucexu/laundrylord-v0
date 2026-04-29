import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getOperatorPublicProfile, getRequestIp, getRequestUserAgent } from "../_shared/operator-public.ts";

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

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalInteger(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 99) {
    throw new Error(`${fieldName} must be a whole number between 1 and 99`);
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { action, operatorSlug, payload } = await req.json();
    const slug = requireText(operatorSlug, "operatorSlug");
    const operatorProfile = await getOperatorPublicProfile(adminClient, slug);

    if (action === "profile") {
      return jsonResponse({
        business_name: operatorProfile.business_name ?? "Laundry rental application",
        public_slug: operatorProfile.public_slug,
        responsibility_template: operatorProfile.public_responsibility_template,
        responsibility_version: operatorProfile.public_responsibility_version,
      });
    }

    if (action !== "submit-application") {
      throw new Error("Unsupported action");
    }

    const honeypot = optionalText(payload?.company);
    if (honeypot) {
      return jsonResponse({ success: true });
    }

    const submittedIp = getRequestIp(req);
    const submittedUserAgent = getRequestUserAgent(req);
    const rateLimitSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    if (submittedIp) {
      const { count, error: countError } = await adminClient
        .from("renter_applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", operatorProfile.user_id)
        .eq("submitted_ip", submittedIp)
        .gte("created_at", rateLimitSince);

      if (countError) {
        throw new Error(`Failed to enforce rate limit: ${countError.message}`);
      }
      if ((count ?? 0) >= 5) {
        return jsonResponse({ error: "Too many submissions from this connection. Please try again later." }, 429);
      }
    }

    const applicantName = requireText(payload?.full_name, "Full name");
    const phone = requireText(payload?.phone, "Phone");
    const addressLine1 = requireText(payload?.address_line1, "Street address");
    const city = requireText(payload?.city, "City");
    const state = requireText(payload?.state, "State");
    const postalCode = requireText(payload?.postal_code, "ZIP");
    const equipmentNeeded = requireText(payload?.equipment_needed, "Equipment needed");
    const layoutPreference = requireText(payload?.layout_preference, "Layout preference");
    const dryerConnection = requireText(payload?.dryer_connection, "Dryer connection");
    const preferredTiming = requireText(payload?.preferred_timing, "Preferred timing");
    const responsibilitiesAccepted = payload?.responsibilities_accepted === true;
    const floorNumber = optionalInteger(payload?.floor_number, "Floor");

    if (!responsibilitiesAccepted) {
      throw new Error("Responsibilities acknowledgement is required");
    }
    if (!["washer_and_dryer", "washer_only", "dryer_only"].includes(equipmentNeeded)) {
      throw new Error("Invalid equipment selection");
    }
    if (!["side_by_side", "stackable"].includes(layoutPreference)) {
      throw new Error("Invalid layout selection");
    }
    if (!["electric", "gas"].includes(dryerConnection)) {
      throw new Error("Invalid dryer connection");
    }
    if (!["asap", "specific"].includes(preferredTiming)) {
      throw new Error("Invalid preferred timing");
    }

    const electricProng = dryerConnection === "electric"
      ? requireText(payload?.electric_prong, "Prong type")
      : null;

    if (electricProng && !["3-prong", "4-prong", "unknown"].includes(electricProng)) {
      throw new Error("Invalid prong type");
    }

    const hasElevator = payload?.has_elevator ?? null;
    if (hasElevator !== null && hasElevator !== "yes" && hasElevator !== "no" && hasElevator !== "unknown") {
      throw new Error("Invalid elevator selection");
    }
    if (!floorNumber && hasElevator !== null) {
      throw new Error("Floor is required before elevator details can be submitted");
    }

    const preferredDeliveryNotes = optionalText(payload?.preferred_delivery_notes);
    if (preferredTiming === "specific" && !preferredDeliveryNotes) {
      throw new Error("Preferred date/time or notes are required");
    }

    const { data, error } = await adminClient
      .from("renter_applications")
      .insert({
        user_id: operatorProfile.user_id,
        applicant_name: applicantName,
        phone,
        email: optionalText(payload?.email),
        address_line1: addressLine1,
        address_line2: optionalText(payload?.address_line2),
        city,
        state,
        postal_code: postalCode,
        equipment_needed: equipmentNeeded,
        layout_preference: layoutPreference,
        dryer_connection: dryerConnection,
        electric_prong: electricProng,
        upstairs: floorNumber ? floorNumber > 1 : payload?.upstairs === true,
        floor_number: floorNumber,
        has_elevator: floorNumber ? hasElevator : null,
        preferred_timing: preferredTiming,
        preferred_delivery_notes: preferredDeliveryNotes,
        notes: optionalText(payload?.notes),
        responsibilities_acknowledged_at: new Date().toISOString(),
        responsibility_version: operatorProfile.public_responsibility_version,
        responsibility_text: operatorProfile.public_responsibility_template,
        submitted_ip: submittedIp,
        submitted_user_agent: submittedUserAgent,
        source_slug: operatorProfile.public_slug,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to submit application: ${error.message}`);
    }

    return jsonResponse({ success: true, application_id: data.id }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Operator page not found." ? 404 : 400;
    return jsonResponse({ error: message }, status);
  }
});

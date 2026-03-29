import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: only allow service-role callers
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    const { data: renters, error: rErr } = await supabase
      .from("renters")
      .select("id, user_id, name, email, monthly_rate, next_due_date, days_late, balance, late_fee, status, stripe_subscription_id")
      .eq("status", "active")
      .not("stripe_subscription_id", "is", null);

    if (rErr) throw rErr;
    if (!renters || renters.length === 0) {
      return new Response(JSON.stringify({ message: "No active renters", results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(renters.map((r: any) => r.user_id))];

    const { data: allSettings } = await supabase
      .from("operator_settings")
      .select("*")
      .in("user_id", userIds);

    const settingsMap: Record<string, any> = {};
    for (const s of allSettings || []) {
      settingsMap[s.user_id] = s;
    }

    for (const renter of renters) {
      const settings = settingsMap[renter.user_id] || {};
      const reminderDaysBefore = settings.reminder_days_before ?? 3;
      const lateFeeAfterDays = settings.late_fee_after_days ?? 7;
      const lateFeeDefault = settings.late_fee_amount ?? 25;
      const businessName = settings.business_name || "LaundryLord";

      // Check master email toggle
      if (settings.email_reminders_enabled === false) continue;

      if (!renter.next_due_date) continue;

      const dueDate = new Date(renter.next_due_date + "T00:00:00");
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const billingCycle = renter.next_due_date;

      const vars: Record<string, string> = {
        name: renter.name,
        amount: Number(renter.monthly_rate).toFixed(2),
        due_date: renter.next_due_date,
        balance: Number(renter.balance).toFixed(2),
        late_fee: Number(renter.late_fee || lateFeeDefault).toFixed(2),
        days_late: String(renter.days_late),
        business_name: businessName,
      };

      // 1. Payment reminder
      if (daysUntilDue > 0 && daysUntilDue <= reminderDaysBefore) {
        if (settings.reminder_upcoming_enabled !== false) {
          const { error: dupErr } = await supabase.from("billing_reminders").insert({
            renter_id: renter.id, user_id: renter.user_id, billing_cycle: billingCycle, reminder_type: "payment_reminder",
          });
          if (!dupErr && renter.email) {
            const subject = replaceVars(settings.template_upcoming_subject || "Payment Reminder", vars);
            const body = replaceVars(settings.template_upcoming_body || `Hi ${renter.name}, your payment is due.`, vars);
            await sendEmail(renter.email, subject, body);
            results.push(`payment_reminder sent to ${renter.name}`);
          }
        }
      }

      // 2. Payment failed
      if (renter.days_late >= 1) {
        if (settings.reminder_failed_enabled !== false) {
          const { error: dupErr } = await supabase.from("billing_reminders").insert({
            renter_id: renter.id, user_id: renter.user_id, billing_cycle: billingCycle, reminder_type: "payment_failed",
          });
          if (!dupErr && renter.email) {
            const subject = replaceVars(settings.template_failed_subject || "Payment Failed", vars);
            const body = replaceVars(settings.template_failed_body || `Hi ${renter.name}, your payment was declined.`, vars);
            await sendEmail(renter.email, subject, body);
            results.push(`payment_failed sent to ${renter.name}`);
          }
        }
      }

      // 3. Late fee application
      if (renter.days_late >= lateFeeAfterDays) {
        const lateFeeAmount = Number(renter.late_fee || lateFeeDefault);
        const { error: dupErr } = await supabase.from("billing_reminders").insert({
          renter_id: renter.id, user_id: renter.user_id, billing_cycle: billingCycle, reminder_type: "late_fee_applied",
        });

        if (!dupErr) {
          const newBalance = Number(renter.balance) + lateFeeAmount;
          await supabase.from("renters").update({ balance: newBalance }).eq("id", renter.id);
          await supabase.from("timeline_events").insert({
            renter_id: renter.id, user_id: renter.user_id, type: "late_fee",
            description: `Late fee of $${lateFeeAmount.toFixed(2)} applied (${renter.days_late} days overdue)`,
          });
          await supabase.from("payments").insert({
            renter_id: renter.id, user_id: renter.user_id, amount: lateFeeAmount,
            due_date: todayStr, status: "overdue", type: "late_fee",
          });

          if (settings.reminder_latefee_enabled !== false && renter.email) {
            vars.balance = newBalance.toFixed(2);
            const subject = replaceVars(settings.template_latefee_subject || "Late Fee Applied", vars);
            const body = replaceVars(settings.template_latefee_body || `Late fee applied.`, vars);
            await sendEmail(renter.email, subject, body);
          }
          results.push(`late_fee_applied for ${renter.name}: $${lateFeeAmount.toFixed(2)}`);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Done", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[BILLING REMINDERS] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendEmail(to: string, subject: string, text: string) {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("[EMAIL] No LOVABLE_API_KEY configured, skipping email");
      return;
    }
    const res = await fetch("https://api.lovable.dev/v1/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ to, subject, text, from: "LaundryLord <notifications@notify.laundrylord.club>" }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[EMAIL] Failed to send to ${to}: ${res.status} ${errBody}`);
    } else {
      console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    }
  } catch (err) {
    console.error(`[EMAIL] Error sending to ${to}:`, err);
  }
}

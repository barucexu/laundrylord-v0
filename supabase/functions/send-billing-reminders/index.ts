import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    // Get all active renters with subscriptions
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

    // Group renters by user_id to fetch operator settings
    const userIds = [...new Set(renters.map(r => r.user_id))];

    const { data: allSettings } = await supabase
      .from("operator_settings")
      .select("*")
      .in("user_id", userIds);

    const settingsMap: Record<string, any> = {};
    for (const s of allSettings || []) {
      settingsMap[s.user_id] = s;
    }

    for (const renter of renters) {
      const settings = settingsMap[renter.user_id] || {
        reminder_days_before: 3,
        late_fee_after_days: 7,
        late_fee_amount: 25,
      };

      if (!renter.next_due_date) continue;

      const dueDate = new Date(renter.next_due_date + "T00:00:00");
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const billingCycle = renter.next_due_date;

      // 1. Payment reminder (N days before due)
      if (daysUntilDue > 0 && daysUntilDue <= settings.reminder_days_before) {
        const { error: dupErr } = await supabase.from("billing_reminders").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          billing_cycle: billingCycle,
          reminder_type: "payment_reminder",
        });

        if (!dupErr) {
          // Send email
          if (renter.email) {
            await sendEmail(
              renter.email,
              "Payment Reminder - LaundryLord",
              `Hi ${renter.name},\n\nYour payment of $${Number(renter.monthly_rate).toFixed(2)} is due on ${renter.next_due_date}.\n\nPlease ensure your card on file is up to date.\n\n— LaundryLord`
            );
          }
          results.push(`payment_reminder sent to ${renter.name}`);
        }
      }

      // 2. Payment failed reminder (days_late >= 1)
      if (renter.days_late >= 1) {
        const { error: dupErr } = await supabase.from("billing_reminders").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          billing_cycle: billingCycle,
          reminder_type: "payment_failed",
        });

        if (!dupErr) {
          if (renter.email) {
            await sendEmail(
              renter.email,
              "Payment Failed - LaundryLord",
              `Hi ${renter.name},\n\nYour payment of $${Number(renter.monthly_rate).toFixed(2)} was declined. Please update your payment method to avoid late fees.\n\nOutstanding balance: $${Number(renter.balance).toFixed(2)}\n\n— LaundryLord`
            );
          }
          results.push(`payment_failed sent to ${renter.name}`);
        }
      }

      // 3. Late fee application (days_late >= late_fee_after_days)
      if (renter.days_late >= settings.late_fee_after_days) {
        const lateFeeAmount = Number(renter.late_fee || settings.late_fee_amount || 25);

        const { error: dupErr } = await supabase.from("billing_reminders").insert({
          renter_id: renter.id,
          user_id: renter.user_id,
          billing_cycle: billingCycle,
          reminder_type: "late_fee_applied",
        });

        if (!dupErr) {
          // Apply late fee to balance
          const newBalance = Number(renter.balance) + lateFeeAmount;
          await supabase
            .from("renters")
            .update({ balance: newBalance })
            .eq("id", renter.id);

          // Log timeline event
          await supabase.from("timeline_events").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            type: "late_fee",
            description: `Late fee of $${lateFeeAmount.toFixed(2)} applied (${renter.days_late} days overdue)`,
          });

          // Record as payment entry
          await supabase.from("payments").insert({
            renter_id: renter.id,
            user_id: renter.user_id,
            amount: lateFeeAmount,
            due_date: todayStr,
            status: "pending",
            type: "late_fee",
          });

          // Send email
          if (renter.email) {
            await sendEmail(
              renter.email,
              "Late Fee Applied - LaundryLord",
              `Hi ${renter.name},\n\nA late fee of $${lateFeeAmount.toFixed(2)} has been applied to your account. Your payment is ${renter.days_late} days overdue.\n\nUpdated balance: $${newBalance.toFixed(2)}\n\nPlease update your payment method as soon as possible.\n\n— LaundryLord`
            );
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        from: "LaundryLord <notifications@notify.laundrylord.com>",
      }),
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

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStripeConnection, useOperatorSettings, useSaveOperatorSettings } from "@/hooks/useSupabaseData";
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { data: stripe, isLoading: stripeLoading } = useStripeConnection();
  const { data: settings, isLoading: settingsLoading } = useOperatorSettings();
  const saveSettings = useSaveOperatorSettings();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    default_monthly_rate: "150",
    default_install_fee: "75",
    default_deposit: "0",
    late_fee_amount: "25",
    late_fee_after_days: "7",
    reminder_days_before: "3",
  });

  const [stripeKey, setStripeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        default_monthly_rate: String(settings.default_monthly_rate),
        default_install_fee: String(settings.default_install_fee),
        default_deposit: String(settings.default_deposit),
        late_fee_amount: String(settings.late_fee_amount),
        late_fee_after_days: String(settings.late_fee_after_days),
        reminder_days_before: String(settings.reminder_days_before),
      });
      // Show masked key if exists
      if ((settings as any).stripe_secret_key) {
        setStripeKey((settings as any).stripe_secret_key);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        default_monthly_rate: parseFloat(form.default_monthly_rate) || 150,
        default_install_fee: parseFloat(form.default_install_fee) || 75,
        default_deposit: parseFloat(form.default_deposit) || 0,
        late_fee_amount: parseFloat(form.late_fee_amount) || 25,
        late_fee_after_days: parseInt(form.late_fee_after_days) || 7,
        reminder_days_before: parseInt(form.reminder_days_before) || 3,
      });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  const handleSaveStripeKey = async () => {
    if (!stripeKey.trim()) {
      toast.error("Please enter your Stripe secret key");
      return;
    }
    if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
      toast.error("Key must start with sk_test_ or sk_live_");
      return;
    }
    setSavingKey(true);
    try {
      const { error } = await supabase
        .from("operator_settings")
        .upsert(
          { user_id: user!.id, stripe_secret_key: stripeKey.trim() } as any,
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast.success("Stripe key saved! Verifying connection…");
      queryClient.invalidateQueries({ queryKey: ["stripe-connection"] });
      queryClient.invalidateQueries({ queryKey: ["operator_settings"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save Stripe key");
    } finally {
      setSavingKey(false);
    }
  };

  const maskedKey = stripeKey
    ? showKey
      ? stripeKey
      : stripeKey.substring(0, 8) + "••••••••" + stripeKey.substring(stripeKey.length - 4)
    : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Defaults</CardTitle>
          <CardDescription>Default values for new renters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRate">Default Monthly Rate ($)</Label>
              <Input id="monthlyRate" type="number" value={form.default_monthly_rate} onChange={e => setForm(f => ({ ...f, default_monthly_rate: e.target.value }))} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installFee">Default Install Fee ($)</Label>
              <Input id="installFee" type="number" value={form.default_install_fee} onChange={e => setForm(f => ({ ...f, default_install_fee: e.target.value }))} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Default Deposit ($)</Label>
              <Input id="depositAmount" type="number" value={form.default_deposit} onChange={e => setForm(f => ({ ...f, default_deposit: e.target.value }))} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateFee">Late Fee Amount ($)</Label>
              <Input id="lateFee" type="number" value={form.late_fee_amount} onChange={e => setForm(f => ({ ...f, late_fee_amount: e.target.value }))} className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Timing</CardTitle>
          <CardDescription>When reminders and late fees are applied</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminderBefore">Days Before Due Date</Label>
              <Input id="reminderBefore" type="number" value={form.reminder_days_before} onChange={e => setForm(f => ({ ...f, reminder_days_before: e.target.value }))} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateFeeAfter">Apply Late Fee After (days)</Label>
              <Input id="lateFeeAfter" type="number" value={form.late_fee_after_days} onChange={e => setForm(f => ({ ...f, late_fee_after_days: e.target.value }))} className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Connection</CardTitle>
          <CardDescription>Connect your own Stripe account to charge your renters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : stripe?.connected ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-700">Connected</div>
                <div className="text-xs text-muted-foreground">{stripe.account_name}</div>
              </div>
            </div>
          ) : stripe?.reason === "invalid_key" ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <div className="text-sm font-medium text-destructive">Invalid Key</div>
                <div className="text-xs text-muted-foreground">Your Stripe key is invalid. Update it below.</div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Stripe Secret Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk_test_••••••••••••"
                  value={stripeKey}
                  onChange={e => setStripeKey(e.target.value)}
                  className="font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveStripeKey} disabled={savingKey} size="sm">
                {savingKey ? "Saving…" : "Connect"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find your key at{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Stripe Dashboard <ExternalLink className="h-3 w-3" />
              </a>
              . Each operator uses their own Stripe account.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

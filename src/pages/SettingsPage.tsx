import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradeConfirmDialog } from "@/components/UpgradeConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStripeConnection, useOperatorSettings, useSaveOperatorSettings } from "@/hooks/useSupabaseData";
import { CheckCircle, AlertTriangle, Loader2, ExternalLink, Eye, EyeOff, ChevronDown, Mail, RotateCcw, Sparkles, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { BILLABLE_RENTER_COUNT_QUERY_KEY } from "@/lib/billing-counts";
import { getErrorMessage } from "@/lib/errors";
import { TIERS, canFitTier, tierUpgradeLabel } from "@/lib/pricing-tiers";
import { BANK_ACCOUNT_RECOMMENDATION } from "@/lib/billing-copy";
import { useSearchParams } from "react-router-dom";

const DEFAULT_TEMPLATES = {
  template_upcoming_subject: "Payment Reminder",
  template_upcoming_body: "Hi {name},\n\nYour payment of ${amount} is due on {due_date}.\n\nPlease ensure your card on file is up to date.\n\n— {business_name}",
  template_failed_subject: "Payment Failed",
  template_failed_body: "Hi {name},\n\nYour payment of ${amount} was declined. Please update your payment method to avoid late fees.\n\nOutstanding balance: ${balance}\n\n— {business_name}",
  template_latefee_subject: "Late Fee Applied",
  template_latefee_body: "Hi {name},\n\nA late fee of ${late_fee} has been applied to your account. Your payment is {days_late} days overdue.\n\nUpdated balance: ${balance}\n\nPlease update your payment method as soon as possible.\n\n— {business_name}",
};

export default function SettingsPage() {
  const { data: stripe, isLoading: stripeLoading } = useStripeConnection();
  const { data: settings, isLoading: settingsLoading } = useOperatorSettings();
  const saveSettings = useSaveOperatorSettings();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState({
    default_monthly_rate: "150",
    default_install_fee: "75",
    default_deposit: "0",
    late_fee_amount: "25",
    late_fee_after_days: "7",
    reminder_days_before: "3",
  });

  const [emailForm, setEmailForm] = useState({
    email_reminders_enabled: true,
    reminder_upcoming_enabled: true,
    reminder_failed_enabled: true,
    reminder_latefee_enabled: true,
    business_name: "LaundryLord",
    ...DEFAULT_TEMPLATES,
  });

  const [stripeKey, setStripeKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
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
      setEmailForm({
        email_reminders_enabled: settings.email_reminders_enabled ?? true,
        reminder_upcoming_enabled: settings.reminder_upcoming_enabled ?? true,
        reminder_failed_enabled: settings.reminder_failed_enabled ?? true,
        reminder_latefee_enabled: settings.reminder_latefee_enabled ?? true,
        business_name: settings.business_name || "LaundryLord",
        template_upcoming_subject: settings.template_upcoming_subject || DEFAULT_TEMPLATES.template_upcoming_subject,
        template_upcoming_body: settings.template_upcoming_body || DEFAULT_TEMPLATES.template_upcoming_body,
        template_failed_subject: settings.template_failed_subject || DEFAULT_TEMPLATES.template_failed_subject,
        template_failed_body: settings.template_failed_body || DEFAULT_TEMPLATES.template_failed_body,
        template_latefee_subject: settings.template_latefee_subject || DEFAULT_TEMPLATES.template_latefee_subject,
        template_latefee_body: settings.template_latefee_body || DEFAULT_TEMPLATES.template_latefee_body,
      });
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
        ...emailForm,
      });
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save settings"));
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
      const { data, error } = await supabase.functions.invoke("save-stripe-key", {
        body: {
          key: stripeKey.trim(),
          webhookSigningSecret: webhookSecret.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeKey("");
      setWebhookSecret("");
      toast.success("Stripe settings saved! Verifying connection…");
      queryClient.invalidateQueries({ queryKey: ["stripe-connection"] });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save Stripe key"));
    } finally {
      setSavingKey(false);
    }
  };

  const resetTemplate = (type: "upcoming" | "failed" | "latefee") => {
    const subjectKey = `template_${type}_subject` as keyof typeof DEFAULT_TEMPLATES;
    const bodyKey = `template_${type}_body` as keyof typeof DEFAULT_TEMPLATES;
    setEmailForm(f => ({
      ...f,
      [subjectKey]: DEFAULT_TEMPLATES[subjectKey],
      [bodyKey]: DEFAULT_TEMPLATES[bodyKey],
    }));
    toast.info("Template reset to default");
  };

  const subscription = useSubscription();
  const selectedUpgradeTier = subscription.upgradeIntent
    ? TIERS.find((tier) => tier.price_id === subscription.upgradeIntent?.priceId) ?? null
    : null;

  useEffect(() => {
    if (searchParams.get("subscription") !== "success") return;

    let cancelled = false;

    const syncSubscription = async () => {
      try {
        await subscription.refresh();
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
        if (!cancelled) {
          toast.success("Plan updated");
        }
      } catch (err) {
        console.error("subscription refresh failed after checkout:", err);
      } finally {
        if (!cancelled) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete("subscription");
          setSearchParams(nextParams, { replace: true });
        }
      }
    };

    void syncSubscription();

    return () => {
      cancelled = true;
    };
  }, [queryClient, searchParams, setSearchParams, subscription]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your billing defaults and integrations</p>
        </div>
        <Button onClick={handleSave} disabled={saveSettings.isPending} size="sm">
          {saveSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Your Plan */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Your Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          {subscription.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking plan…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    Current billed plan: {subscription.currentBilledTier ? `${subscription.currentBilledTier.name} — ${subscription.currentBilledTier.label}` : "Free"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Required by usage: {subscription.requiredTier.name} {subscription.requiredTier.price > 0 ? `(${subscription.requiredTier.label})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Billable renters: {subscription.billableCount} · Active renters: {subscription.activeOperationalCount}
                    {subscription.subscriptionEnd && ` · Renews ${new Date(subscription.subscriptionEnd).toLocaleDateString()}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Archived renters count toward billing for 30 days.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={subscription.manageSubscription} className="gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    {subscription.subscribed ? "Manage billing" : "Change plan"}
                  </Button>
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-0 text-xs">
                    View all plans <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    {TIERS.map((t) => {
                      const fits = canFitTier(subscription.billableCount, t);
                      const isCurrent = subscription.currentBilledTier?.name === t.name || (!subscription.currentBilledTier && t.name === "Free");
                      return (
                        <div key={t.name} className={`rounded-md border p-2 space-y-1 ${isCurrent ? "border-primary/40 bg-primary/5" : ""}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.label}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t.min}–{t.max === Infinity ? "∞" : t.max} renters</p>
                          {isCurrent ? (
                            <p className="text-[11px] text-primary font-medium">Current billed plan</p>
                          ) : !fits ? (
                            <p className="text-[11px] text-muted-foreground">
                              {subscription.billableCount} billable renters exceeds max {t.max}
                            </p>
                          ) : t.price_id ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => t.price_id && subscription.initiateUpgrade(t.price_id)}
                              >
                                {tierUpgradeLabel(t)}
                              </Button>
                              <p className="text-[11px] text-muted-foreground">{BANK_ACCOUNT_RECOMMENDATION}</p>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Free tier available when no paid subscription is active.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUpgradeTier && (
        <UpgradeConfirmDialog
          open={!!selectedUpgradeTier}
          onOpenChange={(open) => {
            if (!open) subscription.cancelUpgrade();
          }}
          tierName={selectedUpgradeTier.name}
          tierLabel={selectedUpgradeTier.label}
          isUpgrade={true}
          loading={false}
          preview={subscription.upgradePreview}
          previewLoading={subscription.upgradePreviewLoading}
          onConfirm={() => {
            void subscription.confirmUpgrade();
          }}
        />
      )}

      {/* Row 1: Billing Defaults + Reminder Timing */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle>Billing Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="monthlyRate" className="text-xs">Monthly Rate ($)</Label>
                <Input id="monthlyRate" type="number" value={form.default_monthly_rate} onChange={e => setForm(f => ({ ...f, default_monthly_rate: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="installFee" className="text-xs">Install Fee ($)</Label>
                <Input id="installFee" type="number" value={form.default_install_fee} onChange={e => setForm(f => ({ ...f, default_install_fee: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="depositAmount" className="text-xs">Deposit ($)</Label>
                <Input id="depositAmount" type="number" value={form.default_deposit} onChange={e => setForm(f => ({ ...f, default_deposit: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lateFee" className="text-xs">Late Fee ($)</Label>
                <Input id="lateFee" type="number" value={form.late_fee_amount} onChange={e => setForm(f => ({ ...f, late_fee_amount: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle>Reminder Timing</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="reminderBefore" className="text-xs">Days Before Due</Label>
                <Input id="reminderBefore" type="number" value={form.reminder_days_before} onChange={e => setForm(f => ({ ...f, reminder_days_before: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lateFeeAfter" className="text-xs">Late Fee After (days)</Label>
                <Input id="lateFeeAfter" type="number" value={form.late_fee_after_days} onChange={e => setForm(f => ({ ...f, late_fee_after_days: e.target.value }))} className="font-mono h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Stripe Connection + Setup Checklist */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle>Stripe Connection</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {stripeLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking…
              </div>
            ) : stripe?.connected ? (
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                stripe.renter_billing_ready
                  ? "bg-success/10 border-success/20"
                  : "bg-warning/10 border-warning/20"
              }`}>
                {stripe.renter_billing_ready ? (
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                )}
                <div>
                  <div className={`text-xs font-medium ${stripe.renter_billing_ready ? "text-success" : "text-warning"}`}>
                    {stripe.renter_billing_ready ? "Renter billing ready" : "Webhook setup incomplete"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {stripe.account_name}
                    {typeof stripe.stripe_livemode === "boolean" ? ` · ${stripe.stripe_livemode ? "Live" : "Test"}` : ""}
                  </div>
                </div>
              </div>
            ) : (stripe && "reason" in stripe && stripe.reason === "invalid_key") ? (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <div>
                  <div className="text-xs font-medium text-destructive">Invalid Key</div>
                  <div className="text-[10px] text-muted-foreground">Update it below.</div>
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label className="text-xs">Secret Key</Label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder={stripe?.connected ? "sk_****••••••••••••" : "sk_test_••••••••••••"}
                    value={stripeKey}
                    onChange={e => setStripeKey(e.target.value)}
                    className="font-mono pr-8 h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button onClick={handleSaveStripeKey} disabled={savingKey} size="sm" className="h-8">
                  {savingKey ? "…" : "Connect"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Find at{" "}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Stripe Dashboard <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Webhook Signing Secret</Label>
              <div className="relative">
                <Input
                  type={showWebhookSecret ? "text" : "password"}
                  placeholder={stripe?.webhook_configured ? "whsec_****••••••••••••" : "whsec_••••••••••••"}
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                  className="font-mono pr-8 h-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Paste the `whsec_...` secret from the webhook endpoint you create in Stripe.
              </p>
            </div>

            {stripe?.webhook_url && (
              <div className="space-y-1">
                <Label className="text-xs">Webhook Endpoint URL</Label>
                <Input readOnly value={stripe.webhook_url} className="font-mono h-8 text-[11px]" />
                <p className="text-[10px] text-muted-foreground">
                  Add this exact URL in Stripe, then paste the matching signing secret above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex items-center gap-2">
              {stripe?.connected ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span className="text-xs">Stripe key connected</span>
            </div>
            <div className="flex items-center gap-2">
              {stripe?.webhook_configured ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span className="text-xs">Webhook configured</span>
            </div>
            <div className="flex items-center gap-2">
              {stripe?.renter_billing_ready ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span className="text-xs">Renter billing ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs">Email sending active</span>
            </div>
            {stripe?.reason === "webhook_missing" && (
              <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-2 text-[10px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 text-warning shrink-0" />
                <p>Stripe is connected, but renter autopay stays blocked until this operator&apos;s webhook signing secret is saved.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Reminders — full width, collapsible */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Enable Email Reminders</Label>
              <p className="text-[10px] text-muted-foreground">Master switch for all automated emails</p>
            </div>
            <Switch
              checked={emailForm.email_reminders_enabled}
              onCheckedChange={v => setEmailForm(f => ({ ...f, email_reminders_enabled: v }))}
            />
          </div>

          {emailForm.email_reminders_enabled && (
            <>
              <div className="space-y-1">
                <Label htmlFor="businessName" className="text-xs">Business Name</Label>
                <Input
                  id="businessName"
                  value={emailForm.business_name}
                  onChange={e => setEmailForm(f => ({ ...f, business_name: e.target.value }))}
                  placeholder="Your Business Name"
                  className="h-8 text-sm"
                />
              </div>

              <Separator />

              <Collapsible>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={emailForm.reminder_upcoming_enabled}
                      onCheckedChange={v => setEmailForm(f => ({ ...f, reminder_upcoming_enabled: v }))}
                    />
                    <Label className="text-xs font-medium">Upcoming Payment</Label>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><ChevronDown className="h-3.5 w-3.5" /></Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2 pt-2 pl-8">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input value={emailForm.template_upcoming_subject} onChange={e => setEmailForm(f => ({ ...f, template_upcoming_subject: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body</Label>
                    <Textarea rows={4} value={emailForm.template_upcoming_body} onChange={e => setEmailForm(f => ({ ...f, template_upcoming_body: e.target.value }))} className="text-sm" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => resetTemplate("upcoming")}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <Collapsible>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={emailForm.reminder_failed_enabled}
                      onCheckedChange={v => setEmailForm(f => ({ ...f, reminder_failed_enabled: v }))}
                    />
                    <Label className="text-xs font-medium">Payment Failed</Label>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><ChevronDown className="h-3.5 w-3.5" /></Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2 pt-2 pl-8">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input value={emailForm.template_failed_subject} onChange={e => setEmailForm(f => ({ ...f, template_failed_subject: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body</Label>
                    <Textarea rows={4} value={emailForm.template_failed_body} onChange={e => setEmailForm(f => ({ ...f, template_failed_body: e.target.value }))} className="text-sm" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => resetTemplate("failed")}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <Collapsible>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={emailForm.reminder_latefee_enabled}
                      onCheckedChange={v => setEmailForm(f => ({ ...f, reminder_latefee_enabled: v }))}
                    />
                    <Label className="text-xs font-medium">Late Fee Notice</Label>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><ChevronDown className="h-3.5 w-3.5" /></Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2 pt-2 pl-8">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input value={emailForm.template_latefee_subject} onChange={e => setEmailForm(f => ({ ...f, template_latefee_subject: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body</Label>
                    <Textarea rows={4} value={emailForm.template_latefee_body} onChange={e => setEmailForm(f => ({ ...f, template_latefee_body: e.target.value }))} className="text-sm" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => resetTemplate("latefee")}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <div className="rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground">
                <strong>Variables:</strong> {"{name}"} {"{amount}"} {"{due_date}"} {"{balance}"} {"{late_fee}"} {"{days_late}"} {"{business_name}"}
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

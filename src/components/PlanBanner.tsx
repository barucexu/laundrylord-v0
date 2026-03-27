import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { needsSubscription } from "@/lib/pricing-tiers";
import { X, Sparkles, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function PlanBanner() {
  const { tier, activeRenters, subscribed, loading } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (loading) return null;

  const isPaid = needsSubscription(activeRenters);
  const isCustom = activeRenters >= 100;

  // Nothing to show for free tier
  if (!isPaid && !isCustom) return null;

  // Already subscribed — show a small status line
  if (subscribed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 mb-4 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          {tier.name} plan · {activeRenters} active renter{activeRenters !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  // Custom tier — contact us
  if (isCustom) {
    if (dismissed === "custom") return null;
    return (
      <div className="relative flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-4">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Wow — {activeRenters} renters! You've outgrown our standard plans.
          </p>
          <p className="text-muted-foreground">
            We'd love to set up a custom plan for your operation. Reach out and we'll take care of you.
          </p>
          <a
            href="mailto:support@laundrylord.com?subject=Custom%20plan%20inquiry"
            className="inline-block mt-1 text-primary font-medium hover:underline"
          >
            Get in touch →
          </a>
        </div>
        <button
          onClick={() => setDismissed("custom")}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Paid tier, not subscribed — gentle nudge
  if (dismissed === tier.name) return null;

  const handleCheckout = async () => {
    try {
      const { useSubscription } = await import("@/hooks/useSubscription");
      // We already have the hook data — call checkout directly via supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: tier.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      toast({
        title: "Couldn't start checkout",
        description: String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-4">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="space-y-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Nice — you've grown to {activeRenters} renter{activeRenters !== 1 ? "s" : ""}!
          </p>
          <p className="text-muted-foreground">
            Your plan is now <span className="font-medium text-foreground">{tier.name}</span> ({tier.label}).
            Add a payment method to keep things running smoothly. Bank account is the easiest option.
          </p>
        </div>
        <Button size="sm" onClick={handleCheckout} className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          Add payment method
        </Button>
      </div>
      <button
        onClick={() => setDismissed(tier.name)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

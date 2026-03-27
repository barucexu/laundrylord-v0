import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { needsSubscription } from "@/lib/pricing-tiers";
import { X, Sparkles, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function PlanBanner() {
  const { tier, renterCount, subscribed, loading, checkout } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (loading) return null;

  const isPaid = needsSubscription(renterCount);

  // Nothing to show for free tier under limit
  if (!isPaid) return null;

  // Already subscribed — show a small status line
  if (subscribed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 mb-4 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
         <span>
          {tier.name} plan · {renterCount} renter{renterCount !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  // Paid tier, not subscribed — upgrade nudge
  if (dismissed === tier.name) return null;

  const handleCheckout = async () => {
    try {
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

  // Determine if this is the first paid tier (Free → Starter)
  const isFirstUpgrade = tier.name === "Starter";

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-4">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="space-y-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Nice — you've grown to {renterCount} renter{renterCount !== 1 ? "s" : ""}!
          </p>
          <p className="text-muted-foreground">
            {isFirstUpgrade
              ? <>Upgrade to <span className="font-medium text-foreground">{tier.name}</span> ({tier.label}) to keep growing. Adding a bank account is the easiest option.</>
              : <>Time to upgrade to <span className="font-medium text-foreground">{tier.name}</span> ({tier.label}) to keep things running smoothly.</>
            }
          </p>
        </div>
        <Button size="sm" onClick={handleCheckout} className="gap-1.5">
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Upgrade to {tier.name}
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

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { getNextUpgradeTierForCount, needsSubscription, tierUpgradeLabel } from "@/lib/pricing-tiers";
import { X, Sparkles, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanBanner() {
  const { billableCount, subscribed, loading, effectiveTier, currentBilledTier, checkout } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const upgradeTarget = getNextUpgradeTierForCount(billableCount);

  if (loading) return null;

  const isPaid = needsSubscription(billableCount);

  // Nothing to show for free tier under limit
  if (!isPaid) return null;

  // Already subscribed — show a small status line
  if (subscribed && currentBilledTier) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 mb-4 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>
          {currentBilledTier.name} plan · {billableCount} billable renter{billableCount !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  // Paid tier, not subscribed — upgrade nudge
  if (!upgradeTarget || dismissed === upgradeTarget.name) return null;

  const isFirstUpgrade = upgradeTarget.name === "Starter";

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 mb-4">
      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="space-y-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Nice — you've grown to {billableCount} billable renter{billableCount !== 1 ? "s" : ""}!
          </p>
          <p className="text-muted-foreground">
            {isFirstUpgrade
              ? <>{tierUpgradeLabel(upgradeTarget)} to keep growing. Adding a bank account is the easiest option.</>
              : <>{tierUpgradeLabel(upgradeTarget)} to keep things running smoothly.</>
            }
          </p>
        </div>
        <Button size="sm" onClick={() => checkout(upgradeTarget.price_id)} className="gap-1.5" disabled={!upgradeTarget.price_id}>
          <ArrowUpCircle className="h-3.5 w-3.5" />
          {tierUpgradeLabel(upgradeTarget)}
        </Button>
      </div>
      <button
        onClick={() => setDismissed(upgradeTarget.name)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

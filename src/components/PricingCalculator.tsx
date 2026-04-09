/**
 * PricingCalculator — slider-driven pricing display for LaundryLord.
 *
 * UPDATING TIERS: Edit the TIERS array in src/lib/pricing-tiers.ts.
 */

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIERS } from "@/lib/pricing-tiers";

const TICK_VALUES = [40, 50, 60, 70, 80, 100, 120];

function fmt(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
}

function pct(price: number, rev: number): string {
  if (rev <= 0) return "—";
  return ((price / rev) * 100).toFixed(1) + "%";
}

function perRenterAtCap(price: number, max: number): string {
  if (max <= 0) return "—";
  return `$${(price / max).toFixed(2)}/renter`;
}

export function PricingCalculator() {
  const [rentPerMachine, setRentPerMachine] = useState(60);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Simple, Transparent Pricing</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Flat monthly plans. No extra platform percentage fee on top.
        </p>
      </div>

      {/* Slider */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Average monthly rent per machine</label>
          <span className="text-sm font-semibold text-foreground">${rentPerMachine}/mo</span>
        </div>
        <Slider
          value={[rentPerMachine]}
          onValueChange={([v]) => setRentPerMachine(v)}
          min={40}
          max={120}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between px-0.5">
          {TICK_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => setRentPerMachine(v)}
              className={`text-[10px] transition-colors ${rentPerMachine === v ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Tier grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const isCustom = tier.price === -1;
          const isFree = tier.price === 0;
          const isOpenEnded = tier.max === Infinity;
          const revMin = tier.min * rentPerMachine;
          const revMax = isOpenEnded ? null : tier.max * rentPerMachine;
          const pctHigh = !isFree && !isCustom ? pct(tier.price, revMin) : null;
          const pctLow = !isFree && !isCustom && revMax !== null && revMax > 0 ? pct(tier.price, revMax) : null;

          return (
            <Card
              key={tier.min}
              className={`relative overflow-hidden ${isFree ? "border-success/30 bg-success/5" : ""}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {tier.max === Infinity ? `${tier.min.toLocaleString()}+` : `${tier.min}–${tier.max}`} renters
                  </span>
                  {isFree && (
                    <Badge variant="secondary" className="text-[10px]">
                      Free
                    </Badge>
                  )}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {isCustom ? "Let's talk" : isFree ? "$0" : tier.label}
                </div>
                {!isFree && !isCustom && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Est. gross revenue: {isOpenEnded ? `${fmt(revMin)}+/mo` : `${fmt(revMin)}–${fmt(revMax ?? 0)}/mo`}
                    </div>
                    <div className="text-xs font-medium text-primary">
                      {isOpenEnded
                        ? `At most ${perRenterAtCap(tier.price, tier.min)} at ${tier.min.toLocaleString()} renters`
                        : `About ${perRenterAtCap(tier.price, tier.max)} at full tier usage`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isOpenEnded
                        ? `Typically ${pctHigh} or less of gross revenue`
                        : `Typically ${pctLow}–${pctHigh} of gross revenue`}
                    </div>
                  </div>
                )}
                {isCustom && <div className="text-xs text-muted-foreground">Reach out — we'll build a plan together</div>}
                {isFree && <div className="text-xs text-muted-foreground">Get started at no cost</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PricingCalculator — slider-driven pricing display for LaundryLord.
 * 
 * UPDATING TIERS: Edit the TIERS array below. Revenue and percentages auto-calculate.
 */

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Pricing tiers (easy to edit) ───
const TIERS = [
  { min: 1, max: 10, price: 0, label: "Free" },
  { min: 11, max: 24, price: 29, label: "$29/mo" },
  { min: 25, max: 49, price: 49, label: "$49/mo" },
  { min: 50, max: 74, price: 99, label: "$99/mo" },
  { min: 75, max: 99, price: 129, label: "$129/mo" },
  { min: 100, max: 199, price: 199, label: "$199/mo" },
  { min: 200, max: 399, price: 299, label: "$299/mo" },
  { min: 400, max: 699, price: 499, label: "$499/mo" },
  { min: 700, max: 1000, price: 799, label: "$799/mo" },
  { min: 1001, max: Infinity, price: -1, label: "Custom" },
];

const TICK_VALUES = [40, 50, 60, 70, 80, 100, 120];

function fmt(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
}

function pct(price: number, rev: number): string {
  if (rev <= 0) return "—";
  return (price / rev * 100).toFixed(1) + "%";
}

export function PricingCalculator() {
  const [rentPerMachine, setRentPerMachine] = useState(60);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">Simple, Transparent Pricing</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Usually around 1–4% of gross revenue for most operators.
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
          {TICK_VALUES.map(v => (
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
          const revMin = tier.min * rentPerMachine;
          const revMax = tier.max === Infinity ? 0 : tier.max * rentPerMachine;
          const pctHigh = !isFree && !isCustom ? pct(tier.price, revMin) : null;
          const pctLow = !isFree && !isCustom && revMax > 0 ? pct(tier.price, revMax) : null;

          return (
            <Card key={tier.min} className={`relative overflow-hidden ${isFree ? "border-success/30 bg-success/5" : ""}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {tier.max === Infinity ? `${tier.min.toLocaleString()}+` : `${tier.min}–${tier.max}`} renters
                  </span>
                  {isFree && <Badge variant="secondary" className="text-[10px]">Free</Badge>}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {isCustom ? "Let's talk" : isFree ? "$0" : tier.label}
                </div>
                {!isFree && !isCustom && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Est. gross revenue: {fmt(revMin)}–{fmt(revMax)}/mo
                    </div>
                    <div className="text-xs font-medium text-primary">
                      LaundryLord: {pctLow}–{pctHigh} of gross
                    </div>
                  </div>
                )}
                {isCustom && (
                  <div className="text-xs text-muted-foreground">
                    Concierge onboarding &amp; custom pricing
                  </div>
                )}
                {isFree && (
                  <div className="text-xs text-muted-foreground">
                    Get started at no cost
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  stripe: { bg: "border border-primary/15 bg-primary/10", text: "text-primary", label: "Stripe" },
  square: { bg: "border border-sky-500/15 bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", label: "Square" },
  zelle: { bg: "border border-violet-500/15 bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", label: "Zelle" },
  venmo: { bg: "border border-cyan-500/15 bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", label: "Venmo" },
  cashapp: { bg: "border border-success/15 bg-success/10", text: "text-success", label: "CashApp" },
  apple_pay: { bg: "border border-border/70 bg-muted/80", text: "text-foreground/80", label: "Apple Pay" },
  cash: { bg: "border border-warning/15 bg-warning/12", text: "text-warning", label: "Cash" },
  other: { bg: "border border-border/70 bg-muted/80", text: "text-muted-foreground", label: "Other" },
};

export function PaymentSourceBadge({ source }: { source: string | null }) {
  const s = SOURCE_STYLES[source || "stripe"] || SOURCE_STYLES.other;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

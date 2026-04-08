const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  stripe: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Stripe" },
  square: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Square" },
  zelle: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", label: "Zelle" },
  venmo: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", label: "Venmo" },
  cashapp: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "CashApp" },
  apple_pay: { bg: "bg-gray-100 dark:bg-gray-800/50", text: "text-gray-700 dark:text-gray-300", label: "Apple Pay" },
  cash: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Cash" },
  other: { bg: "bg-muted", text: "text-muted-foreground", label: "Other" },
};

export function PaymentSourceBadge({ source }: { source: string | null }) {
  const s = SOURCE_STYLES[source || "stripe"] || SOURCE_STYLES.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

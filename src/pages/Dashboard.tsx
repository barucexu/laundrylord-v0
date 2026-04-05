import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenters, usePayments, useMaintenanceLogs, useMachines } from "@/hooks/useSupabaseData";
import { Users, DollarSign, TrendingUp, AlertTriangle, Wrench, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentSourceBadge } from "@/components/PaymentSourceBadge";
import { SupportFooter } from "@/components/SupportFooter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";

export default function Dashboard() {
  const { data: renters = [], isLoading: loadingRenters } = useRenters();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const { data: maintenanceLogs = [], isLoading: loadingMaint } = useMaintenanceLogs();
  const { data: machines = [], isLoading: loadingMachines } = useMachines();

  const isLoading = loadingRenters || loadingPayments || loadingMaint || loadingMachines;

  const kpis = useMemo(() => {
    const activeRenters = renters.filter((r) => r.status === "active");
    const mrr = activeRenters.reduce((sum, r) => sum + Number(r.monthly_rate), 0);
    const paidPayments = payments.filter((p) => p.status === "paid");
    const monthStart = startOfMonth(new Date());
    const collectedThisMonth = paidPayments
      .filter((p) => p.paid_date && new Date(p.paid_date) >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const overdueBalance = renters.reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);

    return { activeRenters: activeRenters.length, mrr, collectedThisMonth, overdueBalance };
  }, [renters, payments]);

  const revenueChart = useMemo(() => {
    const paidPayments = payments.filter((p) => p.status === "paid" && p.paid_date);
    const byMonth: Record<string, number> = {};

    paidPayments.forEach((p) => {
      const month = format(parseISO(p.paid_date!), "yyyy-MM");
      byMonth[month] = (byMonth[month] || 0) + Number(p.amount);
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({
        month: format(parseISO(`${month}-01`), "MMM yy"),
        revenue,
      }));
  }, [payments]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const dueToday = renters.filter((r) => r.next_due_date === todayStr);
  const overdueRenters = renters.filter((r) => r.status === "late").sort((a, b) => b.days_late - a.days_late);
  const recentPayments = payments.filter((p) => p.status === "paid").slice(0, 6);
  const openMaintenance = maintenanceLogs.filter((m) => m.status !== "resolved");

  const inventory = useMemo(() => {
    const available = machines.filter((m) => m.status === "available").length;
    const assigned = machines.filter((m) => m.status === "assigned" || m.status === "rented").length;
    const inMaint = machines.filter((m) => m.status === "maintenance").length;
    const retired = machines.filter((m) => m.status === "retired").length;
    const threeProng = machines.filter((m) => m.prong === "3-prong").length;
    const fourProng = machines.filter((m) => m.prong === "4-prong").length;

    return { total: machines.length, available, assigned, inMaint, retired, threeProng, fourProng };
  }, [machines]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground">Dashboard</h1>
        </div>
        <div className="flex items-center justify-center rounded-[1.75rem] border border-border/70 bg-card/80 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 xl:space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Today&apos;s operating picture for payments, renters, and machines.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        <KpiCard icon={<Users className="h-3.5 w-3.5 text-primary" />} value={kpis.activeRenters} label="Active renters" />
        <KpiCard icon={<TrendingUp className="h-3.5 w-3.5 text-success" />} value={`$${kpis.mrr.toLocaleString()}`} label="MRR" />
        <KpiCard
          icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          value={`$${kpis.overdueBalance.toLocaleString()}`}
          label="Overdue balance"
          className={kpis.overdueBalance > 0 ? "text-destructive" : ""}
        />
        <KpiCard icon={<DollarSign className="h-3.5 w-3.5 text-success" />} value={dueToday.length} label="Due today" />
        <KpiCard icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} value={overdueRenters.length} label="Late renters" className={overdueRenters.length > 0 ? "text-destructive" : ""} />
        <KpiCard icon={<Box className="h-3.5 w-3.5 text-primary" />} value={inventory.available} label="Available machines" />
        <KpiCard icon={<DollarSign className="h-3.5 w-3.5 text-success" />} value={`$${kpis.collectedThisMonth.toLocaleString()}`} label="Collected this month" />
        <KpiCard icon={<Wrench className="h-3.5 w-3.5 text-foreground" />} value={openMaintenance.length} label="Open maintenance" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1.2fr_1fr]">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <IconBadge>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </IconBadge>
              Due today and overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dueToday.length === 0 && overdueRenters.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No payments due today and no overdue renters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {dueToday.map((r) => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30">
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Due today</div>
                    </div>
                    <div className="text-sm font-mono font-semibold">${Number(r.monthly_rate).toFixed(2)}</div>
                  </Link>
                ))}
                {overdueRenters.map((r) => (
                  <Link
                    key={r.id}
                    to={`/renters/${r.id}`}
                    className="flex items-center justify-between bg-destructive/[0.04] px-5 py-3 transition-colors hover:bg-destructive/[0.07]"
                  >
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-destructive">{r.days_late}d overdue</div>
                    </div>
                    <div className="text-sm font-mono font-semibold text-destructive">${Number(r.balance).toFixed(2)}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <IconBadge>
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </IconBadge>
              Recent payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-mono text-muted-foreground">{p.paid_date || p.due_date}</div>
                      <PaymentSourceBadge source={(p as any).payment_source || "stripe"} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">${Number(p.amount).toFixed(2)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge>
                <Wrench className="h-3.5 w-3.5 text-foreground" />
              </IconBadge>
              Open maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openMaintenance.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">No open maintenance issues.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {openMaintenance.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-6 py-4">
                    <div className="text-sm font-medium">{m.issue_category}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{m.reported_date}</span>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <IconBadge>
                <Box className="h-3.5 w-3.5 text-foreground" />
              </IconBadge>
              Inventory snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              <div className="rounded-[1rem] border border-border/70 bg-background/60 p-3">
                <div className="text-xl font-mono font-semibold">{inventory.total}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
              </div>
              <div className="rounded-[1rem] border border-success/15 bg-success/5 p-3">
                <div className="text-xl font-mono font-semibold text-success">{inventory.available}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Available</div>
              </div>
              <div className="rounded-[1rem] border border-primary/15 bg-primary/[0.05] p-3">
                <div className="text-xl font-mono font-semibold text-primary">{inventory.assigned}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Assigned</div>
              </div>
              <div className="rounded-[1rem] border border-border/70 bg-background/60 p-3">
                <div className="text-xl font-mono font-semibold">{inventory.inMaint}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">In maint.</div>
              </div>
            </div>
            {(inventory.threeProng > 0 || inventory.fourProng > 0) && (
              <div className="mt-3 flex gap-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span>
                  3-prong: <strong className="text-foreground">{inventory.threeProng}</strong>
                </span>
                <span>
                  4-prong: <strong className="text-foreground">{inventory.fourProng}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center justify-between gap-4 text-[15px]">
              <span className="flex items-center gap-2">
                <IconBadge>
                  <Wrench className="h-3.5 w-3.5 text-foreground" />
                </IconBadge>
                Open maintenance
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{openMaintenance.length} open</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openMaintenance.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No open maintenance issues.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {openMaintenance.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.issue_category}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{m.reported_date}</div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {revenueChart.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-1.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Growth trend</p>
                <CardTitle className="mt-1.5 text-[15px]">Monthly revenue</CardTitle>
              </div>
              <div className="rounded-full border border-border/70 bg-background/75 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Last 12 months
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[180px] w-full">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" className="stroke-border/70" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <SupportFooter />
    </div>
  );
}

function KpiCard({
  icon,
  value,
  label,
  className = "",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <Card className="bg-card/86">
      <CardContent className="flex min-h-[128px] flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="max-w-[7.5rem] text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
          <IconBadge compact>{icon}</IconBadge>
        </div>
        <div className={`mt-auto pt-5 text-[1.9rem] font-mono font-semibold leading-none tracking-tight ${className}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function IconBadge({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center border border-border/70 bg-background/70 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] ${
        compact ? "h-7 w-7 rounded-full" : "h-8 w-8 rounded-lg"
      }`}
    >
      {children}
    </span>
  );
}

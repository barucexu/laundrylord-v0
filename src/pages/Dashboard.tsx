import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenters, usePayments, useMaintenanceLogs, useMachines } from "@/hooks/useSupabaseData";
import { Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Percent, Wrench, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentSourceBadge } from "@/components/PaymentSourceBadge";
import { SupportFooter } from "@/components/SupportFooter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, subDays } from "date-fns";

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
    const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const overdueBalance = renters.reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);
    const resolvedPayments = payments.filter((p) => ["paid", "failed", "overdue"].includes(p.status));
    const onTimeRate = resolvedPayments.length > 0
      ? Math.round((paidPayments.length / resolvedPayments.length) * 100)
      : 100;
    const thirtyDaysAgo = subDays(new Date(), 30);
    const churned = renters.filter(
      (r) => (r.status === "closed" || r.status === "defaulted") && new Date(r.updated_at) >= thirtyDaysAgo,
    ).length;
    const activeAtStart = activeRenters.length + churned;
    const churnRate = activeAtStart > 0 ? Math.round((churned / activeAtStart) * 100) : 0;

    return { activeRenters: activeRenters.length, mrr, totalRevenue, overdueBalance, onTimeRate, churnRate };
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
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Mission control</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Operator dashboard</h1>
        </div>
        <div className="flex items-center justify-center rounded-[1.75rem] border border-border/70 bg-card/80 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--accent)/0.32))] p-6 shadow-[0_28px_70px_-42px_rgba(27,36,30,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_85%_20%,hsl(var(--warning)/0.12),transparent_18%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Mission control</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.06em] text-foreground sm:text-4xl">
              Keep collections sharp and operations calm.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track revenue, late accounts, machine activity, and maintenance from one polished command surface built
              for day-to-day operator decisions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat label="Monthly recurring revenue" value={`$${kpis.mrr.toLocaleString()}`} />
            <HeroStat label="Collected revenue" value={`$${kpis.totalRevenue.toLocaleString()}`} />
            <HeroStat label="Late balance" value={`$${kpis.overdueBalance.toLocaleString()}`} />
            <HeroStat label="On-time rate" value={`${kpis.onTimeRate}%`} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={<Users className="h-4 w-4 text-primary" />} value={kpis.activeRenters} label="Active renters" />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-success" />} value={`$${kpis.mrr.toLocaleString()}`} label="MRR" />
        <KpiCard icon={<DollarSign className="h-4 w-4 text-success" />} value={`$${kpis.totalRevenue.toLocaleString()}`} label="Total revenue" />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          value={`$${kpis.overdueBalance.toLocaleString()}`}
          label="Overdue balance"
          className={kpis.overdueBalance > 0 ? "text-destructive" : ""}
        />
        <KpiCard icon={<CheckCircle className="h-4 w-4 text-success" />} value={`${kpis.onTimeRate}%`} label="On-time rate" />
        <KpiCard icon={<Percent className="h-4 w-4 text-muted-foreground" />} value={`${kpis.churnRate}%`} label="Churn (30d)" />
      </div>

      {revenueChart.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Revenue trend</p>
                <CardTitle className="mt-2 text-base">Monthly revenue</CardTitle>
              </div>
              <div className="rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                Last 12 months
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[240px] w-full">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </IconBadge>
              Due today and overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dueToday.length === 0 && overdueRenters.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">No payments due today and no overdue renters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {dueToday.map((r) => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30">
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
                    className="flex items-center justify-between bg-destructive/[0.04] px-6 py-4 transition-colors hover:bg-destructive/[0.07]"
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge>
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </IconBadge>
              Recent payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-4">
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge>
                <Box className="h-3.5 w-3.5 text-foreground" />
              </IconBadge>
              Inventory snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/60 p-4">
                <div className="text-2xl font-mono font-semibold">{inventory.total}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
              </div>
              <div className="rounded-[1.25rem] border border-success/15 bg-success/5 p-4">
                <div className="text-2xl font-mono font-semibold text-success">{inventory.available}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Available</div>
              </div>
              <div className="rounded-[1.25rem] border border-primary/15 bg-primary/[0.05] p-4">
                <div className="text-2xl font-mono font-semibold text-primary">{inventory.assigned}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Assigned</div>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/60 p-4">
                <div className="text-2xl font-mono font-semibold">{inventory.inMaint}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">In maint.</div>
              </div>
            </div>
            {(inventory.threeProng > 0 || inventory.fourProng > 0) && (
              <div className="mt-4 flex gap-4 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
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
      </div>

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
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
          <IconBadge>{icon}</IconBadge>
        </div>
        <div className={`mt-3 text-2xl font-mono font-semibold tracking-tight ${className}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border/70 bg-background/70 px-4 py-3 backdrop-blur-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-mono font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)]">
      {children}
    </span>
  );
}

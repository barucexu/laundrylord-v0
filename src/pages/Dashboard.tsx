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
    const activeRenters = renters.filter(r => r.status === "active");
    const mrr = activeRenters.reduce((sum, r) => sum + Number(r.monthly_rate), 0);
    const paidPayments = payments.filter(p => p.status === "paid");
    const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const overdueBalance = renters.reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);
    const resolvedPayments = payments.filter(p => ["paid", "failed", "overdue"].includes(p.status));
    const onTimeRate = resolvedPayments.length > 0
      ? Math.round((paidPayments.length / resolvedPayments.length) * 100)
      : 100;
    const thirtyDaysAgo = subDays(new Date(), 30);
    const churned = renters.filter(r =>
      (r.status === "closed" || r.status === "defaulted") &&
      new Date(r.updated_at) >= thirtyDaysAgo
    ).length;
    const activeAtStart = activeRenters.length + churned;
    const churnRate = activeAtStart > 0 ? Math.round((churned / activeAtStart) * 100) : 0;
    return { activeRenters: activeRenters.length, mrr, totalRevenue, overdueBalance, onTimeRate, churnRate };
  }, [renters, payments]);

  const revenueChart = useMemo(() => {
    const paidPayments = payments.filter(p => p.status === "paid" && p.paid_date);
    const byMonth: Record<string, number> = {};
    paidPayments.forEach(p => {
      const month = format(parseISO(p.paid_date!), "yyyy-MM");
      byMonth[month] = (byMonth[month] || 0) + Number(p.amount);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({
        month: format(parseISO(month + "-01"), "MMM yy"),
        revenue,
      }));
  }, [payments]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const dueToday = renters.filter(r => r.next_due_date === todayStr);
  const overdueRenters = renters.filter(r => r.status === "late").sort((a, b) => b.days_late - a.days_late);
  const recentPayments = payments.filter(p => p.status === "paid").slice(0, 6);
  const openMaintenance = maintenanceLogs.filter(m => m.status !== "resolved");

  const inventory = useMemo(() => {
    const available = machines.filter(m => m.status === "available").length;
    const assigned = machines.filter(m => m.status === "assigned" || m.status === "rented").length;
    const inMaint = machines.filter(m => m.status === "maintenance").length;
    const retired = machines.filter(m => m.status === "retired").length;
    const threeProng = machines.filter(m => m.prong === "3-prong").length;
    const fourProng = machines.filter(m => m.prong === "4-prong").length;
    return { total: machines.length, available, assigned, inMaint, retired, threeProng, fourProng };
  }, [machines]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold tracking-tight">Mission Control</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiCard icon={<Users className="h-3.5 w-3.5 text-primary" />} value={kpis.activeRenters} label="Active Renters" />
        <KpiCard icon={<TrendingUp className="h-3.5 w-3.5 text-success" />} value={`$${kpis.mrr.toLocaleString()}`} label="MRR" />
        <KpiCard icon={<DollarSign className="h-3.5 w-3.5 text-success" />} value={`$${kpis.totalRevenue.toLocaleString()}`} label="Total Revenue" />
        <KpiCard icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} value={`$${kpis.overdueBalance.toLocaleString()}`} label="Overdue" className={kpis.overdueBalance > 0 ? 'text-destructive' : ''} />
        <KpiCard icon={<CheckCircle className="h-3.5 w-3.5 text-success" />} value={`${kpis.onTimeRate}%`} label="On-Time Rate" />
        <KpiCard icon={<Percent className="h-3.5 w-3.5 text-muted-foreground" />} value={`${kpis.churnRate}%`} label="Churn (30d)" />
      </div>

      {/* Revenue Chart */}
      {revenueChart.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[160px] w-full">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGradient)" dot={{ r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-2">
        {/* Due Today / Overdue */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              Due Today & Overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dueToday.length === 0 && overdueRenters.length === 0 ? (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">No payments due today and no overdue renters.</p>
              </div>
            ) : (
              <div className="divide-y">
                {dueToday.map(r => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="text-xs font-medium">{r.name}</div>
                      <div className="text-[10px] text-primary font-medium">Due today</div>
                    </div>
                    <div className="text-xs font-mono font-semibold">${Number(r.monthly_rate).toFixed(2)}</div>
                  </Link>
                ))}
                {overdueRenters.map(r => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors bg-destructive/[0.03]">
                    <div>
                      <div className="text-xs font-medium">{r.name}</div>
                      <div className="text-[10px] text-destructive font-medium">{r.days_late}d overdue</div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-destructive">${Number(r.balance).toFixed(2)}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] text-muted-foreground font-mono">{p.paid_date || p.due_date}</div>
                      <PaymentSourceBadge source={p.payment_source || "stripe"} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium">${Number(p.amount).toFixed(2)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Maintenance */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Open Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openMaintenance.length === 0 ? (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">No open maintenance issues.</p>
              </div>
            ) : (
              <div className="divide-y">
                {openMaintenance.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-2">
                    <div className="text-xs">{m.issue_category}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">{m.reported_date}</span>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Snapshot */}
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5"><Box className="h-3.5 w-3.5" /> Inventory</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-lg font-semibold font-mono">{inventory.total}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
              </div>
              <div>
                <div className="text-lg font-semibold font-mono text-success">{inventory.available}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</div>
              </div>
              <div>
                <div className="text-lg font-semibold font-mono text-primary">{inventory.assigned}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned</div>
              </div>
              <div>
                <div className="text-lg font-semibold font-mono">{inventory.inMaint}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">In Maint.</div>
              </div>
            </div>
            {(inventory.threeProng > 0 || inventory.fourProng > 0) && (
              <div className="mt-2 pt-2 border-t flex gap-3 text-[10px] text-muted-foreground">
                <span>3-prong: <strong className="text-foreground">{inventory.threeProng}</strong></span>
                <span>4-prong: <strong className="text-foreground">{inventory.fourProng}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SupportFooter />
    </div>
  );
}

function KpiCard({ icon, value, label, className = '' }: { icon: React.ReactNode; value: string | number; label: string; className?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-1">{icon}</div>
        <div className={`text-xl font-semibold font-mono tabular-nums ${className}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}

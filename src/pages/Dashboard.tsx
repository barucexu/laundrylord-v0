import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenters, usePayments, useMaintenanceLogs, useMachines } from "@/hooks/useSupabaseData";
import { Users, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Percent, Wrench, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentSourceBadge } from "@/components/PaymentSourceBadge";
import { SupportFooter } from "@/components/SupportFooter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays, startOfMonth } from "date-fns";

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

    // On-time rate: paid / (paid + failed + overdue)
    const resolvedPayments = payments.filter(p => ["paid", "failed", "overdue"].includes(p.status));
    const onTimeRate = resolvedPayments.length > 0
      ? Math.round((paidPayments.length / resolvedPayments.length) * 100)
      : 100;

    // Monthly churn: renters moved to closed/defaulted in last 30d
    const thirtyDaysAgo = subDays(new Date(), 30);
    const churned = renters.filter(r =>
      (r.status === "closed" || r.status === "defaulted") &&
      new Date(r.updated_at) >= thirtyDaysAgo
    ).length;
    const activeAtStart = activeRenters.length + churned;
    const churnRate = activeAtStart > 0 ? Math.round((churned / activeAtStart) * 100) : 0;

    return { activeRenters: activeRenters.length, mrr, totalRevenue, overdueBalance, onTimeRate, churnRate };
  }, [renters, payments]);

  // Revenue chart data - group paid payments by month
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
  const recentPayments = payments.filter(p => p.status === "paid").slice(0, 8);
  const openMaintenance = maintenanceLogs.filter(m => m.status !== "resolved");

  // Inventory snapshot
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
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Mission Control</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums">{kpis.activeRenters}</div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">Active Renters</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums">${kpis.mrr.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">MRR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums">${kpis.totalRevenue.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className={`text-2xl font-semibold font-mono tabular-nums ${kpis.overdueBalance > 0 ? 'text-destructive' : ''}`}>
              ${kpis.overdueBalance.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">Overdue Balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums">{kpis.onTimeRate}%</div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">On-Time Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums">{kpis.churnRate}%</div>
            <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">Monthly Churn</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {revenueChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(205 78% 48%)" } }} className="h-[250px] w-full">
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={v => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(205 78% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Due Today / Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Due Today & Overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dueToday.length === 0 && overdueRenters.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No payments due today and no overdue renters — you're clear.</p>
              </div>
            ) : (
              <div className="divide-y">
                {dueToday.map(r => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-[11px] text-primary font-medium">Due today</div>
                    </div>
                    <div className="text-sm font-mono font-semibold">${Number(r.monthly_rate).toFixed(2)}</div>
                  </Link>
                ))}
                {overdueRenters.map(r => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors bg-destructive/[0.03]">
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-[11px] text-destructive font-medium">{r.days_late}d overdue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-destructive">${Number(r.balance).toFixed(2)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground font-mono">{p.paid_date || p.due_date}</div>
                      </div>
                      <PaymentSourceBadge source={(p as any).payment_source || "stripe"} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium">${Number(p.amount).toFixed(2)}</span>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Open Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openMaintenance.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No open maintenance issues.</p>
              </div>
            ) : (
              <div className="divide-y">
                {openMaintenance.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm">{m.issue_category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono">{m.reported_date}</span>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Box className="h-4 w-4" /> Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl font-semibold font-mono">{inventory.total}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Machines</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono text-success">{inventory.available}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Available</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono text-primary">{inventory.assigned}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Assigned</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono">{inventory.inMaint}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">In Maint.</div>
              </div>
            </div>
            {(inventory.threeProng > 0 || inventory.fourProng > 0) && (
              <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
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

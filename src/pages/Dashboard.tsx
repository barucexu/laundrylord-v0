import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenters, usePayments, useMaintenanceLogs } from "@/hooks/useSupabaseData";
import { AlertTriangle, Users, CreditCard, DollarSign, Wrench, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const { data: renters = [], isLoading: loadingRenters } = useRenters();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const { data: maintenanceLogs = [], isLoading: loadingMaint } = useMaintenanceLogs();

  const isLoading = loadingRenters || loadingPayments || loadingMaint;

  const stats = [
    { label: "Active Renters", value: renters.filter(r => r.status === 'active').length, icon: Users, color: "text-success" },
    { label: "Overdue Renters", value: renters.filter(r => r.status === 'late').length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Failed Payments", value: payments.filter(p => p.status === 'failed').length, icon: CreditCard, color: "text-destructive" },
    { label: "Upcoming (7 days)", value: payments.filter(p => p.status === 'upcoming' || p.status === 'due_soon').length, icon: DollarSign, color: "text-primary" },
    { label: "Open Maintenance", value: maintenanceLogs.filter(m => m.status !== 'resolved').length, icon: Wrench, color: "text-warning" },
    { label: "Pending Pickups", value: renters.filter(r => r.status === 'pickup_scheduled').length, icon: Truck, color: "text-muted-foreground" },
  ];

  const overdueRenters = renters.filter(r => r.status === 'late').sort((a, b) => b.days_late - a.days_late);
  const upcomingPayments = payments.filter(p => p.status === 'upcoming' || p.status === 'due_soon').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const openMaintenance = maintenanceLogs.filter(m => m.status !== 'resolved');

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
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-semibold font-mono tabular-nums">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Renters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {overdueRenters.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No overdue renters — you're all clear.</p>
              </div>
            ) : (
              <div className="divide-y">
                {overdueRenters.map(r => (
                  <Link key={r.id} to={`/renters/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-destructive">${Number(r.balance).toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground">{r.days_late}d late</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingPayments.length === 0 ? (
              <div className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">No upcoming payments scheduled.</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs text-muted-foreground font-mono">{p.due_date}</div>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open Maintenance</CardTitle>
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
      </div>
    </div>
  );
}

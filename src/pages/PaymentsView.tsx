import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentSourceBadge } from "@/components/PaymentSourceBadge";
import { usePayments } from "@/hooks/useSupabaseData";
import { getPaymentTypeLabel } from "@/lib/payment-display";

export default function PaymentsView() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const { data: payments = [], isLoading } = usePayments();

  const filtered = payments.filter(p => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesSource = sourceFilter === "all" || p.payment_source === sourceFilter;
    return matchesStatus && matchesSource;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} records</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="square">Square</SelectItem>
            <SelectItem value="zelle">Zelle</SelectItem>
            <SelectItem value="venmo">Venmo</SelectItem>
            <SelectItem value="cashapp">CashApp</SelectItem>
            <SelectItem value="apple_pay">Apple Pay</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium">{getPaymentTypeLabel(p.type)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.due_date}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.paid_date || '—'}</TableCell>
                  <TableCell><PaymentSourceBadge source={p.payment_source} /></TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

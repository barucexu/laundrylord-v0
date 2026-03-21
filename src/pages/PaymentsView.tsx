import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { usePayments } from "@/hooks/useSupabaseData";
import { Link } from "react-router-dom";

export default function PaymentsView() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: payments = [], isLoading } = usePayments();

  const filtered = payments.filter(p => statusFilter === "all" || p.status === statusFilter);

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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm capitalize font-medium">{p.type.replace('_', ' ')}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.due_date}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.paid_date || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

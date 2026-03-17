import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { renters, getMachineForRenter } from "@/data/mock-data";
import { Search } from "lucide-react";
import type { RenterStatus } from "@/data/mock-data";

export default function RentersList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = renters.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Renters</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} renters</span>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="termination_requested">Term. Requested</SelectItem>
            <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Paid Through</TableHead>
              <TableHead className="text-right">Days Late</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const machine = getMachineForRenter(r.id);
              return (
                <TableRow key={r.id} className="h-12">
                  <TableCell>
                    <Link to={`/renters/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{r.phone}</TableCell>
                  <TableCell className="text-xs">{machine ? machine.model : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.balance > 0 ? <span className="text-destructive">${r.balance.toFixed(2)}</span> : <span className="text-muted-foreground">$0.00</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.paidThroughDate || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.daysLate > 0 ? <span className="text-destructive">{r.daysLate}</span> : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No renters found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

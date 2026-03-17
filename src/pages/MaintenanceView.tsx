import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useMaintenanceLogs } from "@/hooks/useSupabaseData";
import { Link } from "react-router-dom";

export default function MaintenanceView() {
  const { data: logs = [], isLoading } = useMaintenanceLogs();

  const sorted = [...logs].sort((a, b) => {
    const order: Record<string, number> = { reported: 0, scheduled: 1, in_progress: 2, resolved: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <span className="text-sm text-muted-foreground">{logs.length} issues</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(m => (
                <TableRow key={m.id} className="h-12">
                  <TableCell className="text-sm">{m.issue_category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.description}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.reported_date}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{m.cost !== null ? `$${Number(m.cost).toFixed(2)}` : '—'}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No maintenance issues</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

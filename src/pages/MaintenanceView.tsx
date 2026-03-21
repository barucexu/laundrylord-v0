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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{logs.length} issues</p>
        </div>
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
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm font-medium">{m.issue_category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.description}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.reported_date}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{m.cost !== null ? `$${Number(m.cost).toFixed(2)}` : '—'}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No maintenance issues reported.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

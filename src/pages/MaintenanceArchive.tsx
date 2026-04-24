import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useArchivedMaintenanceLogs, useMachines, useRenters } from "@/hooks/useSupabaseData";
import { MAINTENANCE_CATEGORY_OPTIONS } from "@/lib/maintenance";

export default function MaintenanceArchive() {
  const { data: logs = [], isLoading } = useArchivedMaintenanceLogs();
  const { data: renters = [] } = useRenters();
  const { data: machines = [] } = useMachines();
  const rentersById = new Map(renters.map((renter) => [renter.id, renter]));
  const machinesById = new Map(machines.map((machine) => [machine.id, machine]));

  return (
    <div className="space-y-5">
      <div>
        <Link to="/maintenance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Maintenance
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Maintenance Archive</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{logs.length} archived issue{logs.length !== 1 ? "s" : ""}</p>
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
                <TableHead>Renter</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const renter = log.renter_id ? rentersById.get(log.renter_id) : null;
                const machine = log.machine_id ? machinesById.get(log.machine_id) : null;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">
                      {renter ? (
                        <Link to={`/renters/${renter.id}`} className="text-primary hover:underline">
                          {renter.name || "Unnamed renter"}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{machine?.serial ?? "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{formatCategory(log.issue_category)}</div>
                      <div className="text-xs text-muted-foreground max-w-[260px] truncate">{log.description || "-"}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.archived_at ? new Date(log.archived_at).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No archived maintenance issues.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatCategory(value: string): string {
  return MAINTENANCE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

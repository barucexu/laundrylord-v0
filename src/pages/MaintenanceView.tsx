import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { maintenanceLogs } from "@/data/mock-data";
import { Link } from "react-router-dom";

export default function MaintenanceView() {
  const sorted = [...maintenanceLogs].sort((a, b) => {
    const order = { reported: 0, scheduled: 1, in_progress: 2, resolved: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <span className="text-sm text-muted-foreground">{maintenanceLogs.length} issues</span>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Renter</TableHead>
              <TableHead>Machine</TableHead>
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
                <TableCell>
                  {m.renterId ? (
                    <Link to={`/renters/${m.renterId}`} className="text-sm text-primary hover:underline">{m.renterName}</Link>
                  ) : (
                    <span className="text-sm">{m.renterName}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{m.machineModel}</TableCell>
                <TableCell className="text-sm">{m.issueCategory}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.description}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.reportedDate}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell className="text-right font-mono text-sm">{m.cost !== null ? `$${m.cost.toFixed(2)}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

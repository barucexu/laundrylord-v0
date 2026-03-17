import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { machines, getRenterForMachine } from "@/data/mock-data";
import { Link } from "react-router-dom";

export default function MachinesList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Machines</h1>
        <span className="text-sm text-muted-foreground">{machines.length} machines</span>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Prong</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Condition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map(m => {
              const renter = getRenterForMachine(m.id);
              return (
                <TableRow key={m.id} className="h-12">
                  <TableCell className="capitalize text-sm">{m.type}</TableCell>
                  <TableCell className="text-sm">{m.model}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.serial}</TableCell>
                  <TableCell className="text-sm">{m.prong}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell>
                    {renter ? (
                      <Link to={`/renters/${renter.id}`} className="text-sm text-primary hover:underline">{renter.name}</Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.condition}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

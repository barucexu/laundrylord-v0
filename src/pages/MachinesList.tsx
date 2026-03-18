import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useMachines, useRenters } from "@/hooks/useSupabaseData";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { CreateMachineDialog } from "@/components/CreateMachineDialog";

export default function MachinesList() {
  const { data: machines = [], isLoading } = useMachines();
  const { data: renters = [] } = useRenters();
  const [dialogOpen, setDialogOpen] = useState(false);

  const getRenterForMachine = (machineId: string) => renters.find(r => r.machine_id === machineId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Machines</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{machines.length} machines</span>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Machine
          </Button>
        </div>
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
                    <TableCell className="text-sm">{m.prong || '—'}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell>
                      {renter ? (
                        <Link to={`/renters/${renter.id}`} className="text-sm text-primary hover:underline">{renter.name}</Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{m.condition || '—'}</TableCell>
                  </TableRow>
                );
              })}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No machines yet. Click "Add Machine" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateMachineDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

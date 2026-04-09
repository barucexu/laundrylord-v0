import { Box, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useAssignMachineToRenter,
  useMachines,
  useMachinesForRenter,
  useUnassignMachineFromRenter,
} from "@/hooks/useSupabaseData";
import { isMachineAssignable } from "@/lib/machine-assignment";

interface RenterMachineAssignmentsProps {
  renterId: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function RenterMachineAssignments({ renterId }: RenterMachineAssignmentsProps) {
  const { data: assignedMachines = [] } = useMachinesForRenter(renterId);
  const { data: allMachines = [] } = useMachines();
  const assignMachine = useAssignMachineToRenter();
  const unassignMachine = useUnassignMachineFromRenter();

  const assignableMachines = allMachines.filter(isMachineAssignable);
  const isMutating = assignMachine.isPending || unassignMachine.isPending;

  const handleAssignMachine = async (machineId: string) => {
    try {
      await assignMachine.mutateAsync({ machineId, renterId });
      toast.success("Machine assigned");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to assign machine"));
    }
  };

  const handleUnassignMachine = async (machineId: string) => {
    try {
      await unassignMachine.mutateAsync({ machineId, renterId });
      toast.success("Machine unassigned");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to unassign machine"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Box className="h-4 w-4" /> Machines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignedMachines.length === 0 && (
          <p className="text-sm text-muted-foreground">No machines assigned.</p>
        )}
        {assignedMachines.map((machine) => (
          <div key={machine.id} className="space-y-1.5 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{machine.type} — {machine.model}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={isMutating}
                onClick={() => handleUnassignMachine(machine.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Serial: <span className="font-mono text-foreground">{machine.serial}</span></span>
              <span>Status: <StatusBadge status={machine.status} /></span>
              <span>Condition: <span className="text-foreground capitalize">{machine.condition || "—"}</span></span>
            </div>
          </div>
        ))}
        {assignableMachines.length > 0 && (
          <Select onValueChange={handleAssignMachine} disabled={isMutating}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Assign a machine..." />
            </SelectTrigger>
            <SelectContent>
              {assignableMachines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.type} — {machine.model} ({machine.serial})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Archive, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useArchiveMaintenanceLog,
  useCreateMaintenanceLog,
  useMaintenanceLogs,
  useMachines,
  useRenters,
  useUpdateMaintenanceLog,
  type MaintenanceRow,
} from "@/hooks/useSupabaseData";
import {
  getSingleAssignedMachineId,
  MAINTENANCE_CATEGORY_OPTIONS,
  MAINTENANCE_STATUS_OPTIONS,
  sortMaintenanceLogs,
} from "@/lib/maintenance";
import { getErrorMessage } from "@/lib/errors";

type MaintenanceFormState = {
  renter_id: string;
  machine_id: string;
  issue_category: string;
  description: string;
  status: string;
  reported_date: string;
  resolved_date: string;
  resolution_notes: string;
  cost: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): MaintenanceFormState {
  return {
    renter_id: "",
    machine_id: "",
    issue_category: "leak",
    description: "",
    status: "reported",
    reported_date: today(),
    resolved_date: "",
    resolution_notes: "",
    cost: "",
  };
}

export default function MaintenanceView() {
  const { data: logs = [], isLoading } = useMaintenanceLogs();
  const { data: renters = [] } = useRenters();
  const { data: machines = [] } = useMachines();
  const createMaintenanceLog = useCreateMaintenanceLog();
  const updateMaintenanceLog = useUpdateMaintenanceLog();
  const archiveMaintenanceLog = useArchiveMaintenanceLog();
  const [editingLog, setEditingLog] = useState<MaintenanceRow | null>(null);
  const [form, setForm] = useState<MaintenanceFormState>(() => emptyForm());
  const autoFilledRenterIdRef = useRef<string | null>(null);

  const sorted = useMemo(() => sortMaintenanceLogs(logs), [logs]);
  const rentersById = useMemo(() => new Map(renters.map((renter) => [renter.id, renter])), [renters]);
  const machinesById = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines]);

  const assignedMachinesForSelectedRenter = useMemo(
    () => machines.filter((machine) => machine.assigned_renter_id === form.renter_id),
    [form.renter_id, machines],
  );

  const resetForm = () => {
    setEditingLog(null);
    setForm(emptyForm());
    autoFilledRenterIdRef.current = null;
  };

  const handleRenterChange = (renterId: string) => {
    const machineId = getSingleAssignedMachineId(renterId, machines) ?? "";
    autoFilledRenterIdRef.current = renterId || null;
    setForm((current) => ({
      ...current,
      renter_id: renterId,
      machine_id: machineId,
    }));
  };

  useEffect(() => {
    if (!form.renter_id || form.machine_id || autoFilledRenterIdRef.current === form.renter_id) return;
    const machineId = getSingleAssignedMachineId(form.renter_id, machines);
    if (!machineId) return;

    autoFilledRenterIdRef.current = form.renter_id;
    setForm((current) => ({ ...current, machine_id: machineId }));
  }, [form.machine_id, form.renter_id, machines]);

  const handleEdit = (log: MaintenanceRow) => {
    setEditingLog(log);
    setForm({
      renter_id: log.renter_id ?? "",
      machine_id: log.machine_id ?? "",
      issue_category: log.issue_category,
      description: log.description ?? "",
      status: log.status,
      reported_date: log.reported_date,
      resolved_date: log.resolved_date ?? "",
      resolution_notes: log.resolution_notes ?? "",
      cost: log.cost == null ? "" : String(log.cost),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.renter_id) {
      toast.error("Choose a renter before saving maintenance.");
      return;
    }

    const payload = {
      renter_id: form.renter_id,
      machine_id: form.machine_id || null,
      issue_category: form.issue_category,
      description: form.description.trim(),
      status: form.status,
      reported_date: form.reported_date,
      resolved_date: form.status === "resolved" ? form.resolved_date || today() : null,
      resolution_notes: form.resolution_notes.trim(),
      cost: form.cost.trim() ? Number(form.cost) : null,
      archived_at: null,
    };

    try {
      if (editingLog) {
        await updateMaintenanceLog.mutateAsync({ id: editingLog.id, ...payload });
        toast.success("Maintenance issue updated.");
      } else {
        await createMaintenanceLog.mutateAsync(payload);
        toast.success("Maintenance issue created.");
      }
      resetForm();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save maintenance issue"));
    }
  };

  const handleArchive = async (log: MaintenanceRow) => {
    try {
      await archiveMaintenanceLog.mutateAsync({ id: log.id });
      toast.success("Maintenance issue archived.");
      if (editingLog?.id === log.id) resetForm();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to archive maintenance issue"));
    }
  };

  const saving = createMaintenanceLog.isPending || updateMaintenanceLog.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Maintenance</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-muted-foreground">{logs.length} open issues</p>
            <Link to="/maintenance/archive" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              View Archive
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{editingLog ? "Edit Maintenance" : "Add Maintenance"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Renter</Label>
              <Select value={form.renter_id || "none"} onValueChange={(value) => handleRenterChange(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose renter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose renter</SelectItem>
                  {renters.map((renter) => (
                    <SelectItem key={renter.id} value={renter.id}>
                      {renter.name || "Unnamed renter"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Machine</Label>
              <Select
                key={`${form.renter_id}-${assignedMachinesForSelectedRenter.length}`}
                value={form.machine_id || "none"}
                onValueChange={(value) => setForm((current) => ({ ...current, machine_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No machine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No machine</SelectItem>
                  {assignedMachinesForSelectedRenter.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.serial} · {machine.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.issue_category} onValueChange={(value) => setForm((current) => ({ ...current, issue_category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reported-date">Reported Date</Label>
              <Input
                id="reported-date"
                type="date"
                value={form.reported_date}
                onChange={(event) => setForm((current) => ({ ...current, reported_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))}
              />
            </div>

            {form.status === "resolved" && (
              <div className="space-y-2">
                <Label htmlFor="resolved-date">Resolved Date</Label>
                <Input
                  id="resolved-date"
                  type="date"
                  value={form.resolved_date}
                  onChange={(event) => setForm((current) => ({ ...current, resolved_date: event.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resolution-notes">Resolution Notes</Label>
              <Textarea
                id="resolution-notes"
                value={form.resolution_notes}
                onChange={(event) => setForm((current) => ({ ...current, resolution_notes: event.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {editingLog ? <Pencil className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {saving ? "Saving..." : editingLog ? "Save Changes" : "Add Issue"}
              </Button>
              {editingLog && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

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
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((log) => {
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
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{machine?.serial ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{formatOption(log.issue_category, MAINTENANCE_CATEGORY_OPTIONS)}</div>
                      <div className="text-xs text-muted-foreground max-w-[260px] truncate">{log.description || "—"}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.reported_date}</TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{log.cost !== null ? `$${Number(log.cost).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="sm" variant="outline" aria-label={`Edit ${log.issue_category}`} onClick={() => handleEdit(log)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`Archive ${log.issue_category}`}
                          onClick={() => handleArchive(log)}
                          disabled={archiveMaintenanceLog.isPending}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No maintenance issues reported.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatOption<T extends readonly { value: string; label: string }[]>(value: string, options: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
